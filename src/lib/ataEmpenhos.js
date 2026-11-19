// Controle de despesas (notas de empenho) da Ata de Registro de Preços.
//
// Fluxo: o setor de compras anexa o PDF da nota de empenho -> a IA lê o
// documento -> o usuário confere -> o empenho é gravado e o saldo da ata
// (valor + quantidade por item) é abatido automaticamente.
//
// As funções de cálculo são puras (sem React/Supabase) para poderem ser
// testadas isoladamente.

import { getSupabase } from './supabase.js';
import { getTenantScope, withTenantScope } from './tenantScope.js';
import { sanitizeStorageFileName } from './storageSafeName.js';

const BUCKET = 'ata-empenhos';
export const EMPENHO_PDF_MAX_BYTES = 3.5 * 1024 * 1024; // /api/claude passa pelo limite de body da Vercel (~4,5 MB, base64 incluso)

// ── Números ──────────────────────────────────────────────────────
const round2 = n => Math.round((Number(n) || 0) * 100) / 100;
const round3 = n => Math.round((Number(n) || 0) * 1000) / 1000;

// "1.234,56" | "R$ 1234.56" | 1234.56 -> 1234.56
export function parseValorBR(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v).trim().replace(/[R$\s]/g, '');
  if (!s) return 0;
  const hasComma = s.includes(','), hasDot = s.includes('.');
  let norm = s;
  if (hasComma && hasDot) {
    norm = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (hasComma) {
    norm = s.replace(',', '.');
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    norm = s.replace(/\./g, ''); // "1.234" / "12.345.678" = milhar
  }
  const n = parseFloat(norm);
  return Number.isFinite(n) ? n : 0;
}

export const soDigitos = s => String(s || '').replace(/\D/g, '');

// ── Casamento de itens (linha da nota <-> item da ata) ───────────
const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'com', 'para', 'em', 'tipo', 'un', 'und', 'unid']);
const tokens = s => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
  .split(/\s+/).filter(t => t.length > 1 && !STOP.has(t));

// Sugere o item da ata mais parecido com a descrição da linha. Retorna o id ou ''.
export function sugerirItemAta(descricao, itensAta) {
  const a = new Set(tokens(descricao));
  if (!a.size) return '';
  let melhor = '', melhorScore = 0;
  for (const it of itensAta || []) {
    const b = new Set(tokens(it.descricao));
    if (!b.size) continue;
    let inter = 0;
    a.forEach(t => { if (b.has(t)) inter++; });
    const score = inter / Math.min(a.size, b.size);
    if (score > melhorScore) { melhorScore = score; melhor = it.id; }
  }
  // Limite baixo de propósito: é só uma sugestão, o usuário confirma o vínculo na tela.
  return melhorScore >= 0.3 ? melhor : '';
}

// ── Impacto no saldo ─────────────────────────────────────────────
// linhas: [{ataItemId, qtd, ...}] — só as vinculadas a um item da ata consomem
// quantidade. `valor` é o valor total do empenho (sempre abatido do saldo em R$).
export function calcularImpacto({ ata, valor, linhas, empenhoExistenteNumero, empenhos = [], rotulo = 'da ata' }) {
  const avisos = [];
  const v = round2(valor);
  const saldoDepois = round2((ata.saldoDisponivel || 0) - v);
  if (v <= 0) avisos.push({ nivel: 'erro', texto: 'Informe o valor do empenho.' });
  if (saldoDepois < 0) {
    avisos.push({ nivel: 'excede', texto: `O valor do empenho excede o saldo ${rotulo} em ${fmt(-saldoDepois)}.` });
  }

  const consumoPorItem = {};
  for (const l of linhas || []) {
    if (!l.ataItemId) continue;
    consumoPorItem[l.ataItemId] = round3((consumoPorItem[l.ataItemId] || 0) + (Number(l.qtd) || 0));
  }
  for (const it of ata.itens || []) {
    const c = consumoPorItem[it.id];
    if (!c) continue;
    const saldoItem = round3(it.qtdRegistrada - it.qtdUtilizada);
    if (c > saldoItem) {
      avisos.push({ nivel: 'excede', texto: `Item "${it.descricao}": empenho consome ${c.toLocaleString('pt-BR')} mas o saldo é ${saldoItem.toLocaleString('pt-BR')}.` });
    }
  }
  if (empenhoExistenteNumero && empenhos.some(e => (e.numero || '').trim().toLowerCase() === empenhoExistenteNumero.trim().toLowerCase())) {
    avisos.push({ nivel: 'duplicado', texto: `O empenho ${empenhoExistenteNumero} já está lançado aqui.` });
  }
  return { valor: v, saldoDepois, consumoPorItem, avisos };
}

// Aplica (sinal=+1) ou estorna (sinal=-1) um empenho sobre a ata. Devolve
// { itens, saldoDisponivel } novos — não muta a ata recebida.
export function aplicarEmpenhoNaAta(ata, { valor, linhas }, sinal = 1) {
  const consumo = {};
  for (const l of linhas || []) {
    if (!l.ataItemId) continue;
    consumo[l.ataItemId] = round3((consumo[l.ataItemId] || 0) + (Number(l.qtd) || 0));
  }
  const itens = (ata.itens || []).map(it => consumo[it.id]
    ? { ...it, qtdUtilizada: Math.max(0, round3(it.qtdUtilizada + sinal * consumo[it.id])) }
    : it);
  return { itens, saldoDisponivel: round2((ata.saldoDisponivel || 0) - sinal * round2(valor)) };
}

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// ── Extração por IA ──────────────────────────────────────────────
const SYSTEM = `Você extrai dados de NOTAS DE EMPENHO da administração pública brasileira (Lei 4.320/64 e Lei 14.133/2021).
Retorne APENAS um objeto JSON válido, sem texto antes ou depois, neste formato:
{
  "numero": "número do empenho exatamente como no documento (ex.: 2026NE000123 ou 123/2026)",
  "data_emissao": "YYYY-MM-DD ou null",
  "unidade_gestora": "secretaria/órgão/unidade gestora que emitiu o empenho ou null",
  "credor": "razão social do credor/fornecedor ou null",
  "cnpj": "CNPJ do credor (com pontuação, como no documento) ou null",
  "valor_total": número (ex.: 12345.67) — valor total empenhado,
  "itens": [ { "descricao": "...", "unidade": "...", "quantidade": número, "valor_unitario": número } ],
  "observacao": "histórico/objeto resumido em até 200 caracteres ou null"
}
Regras: use números JSON (ponto decimal, sem R$ nem separador de milhar). Se a nota não detalhar itens, retorne "itens": []. Nunca invente valores: use null quando não constar. Se houver mais de um empenho no PDF, extraia apenas o primeiro.`;

function arrayBufferParaBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(bin);
}

export async function extrairEmpenhoDoPdf(file) {
  if (file.size > EMPENHO_PDF_MAX_BYTES) {
    throw new Error('PDF acima de 3,5 MB. Reduza/comprima o arquivo ou lance o empenho manualmente.');
  }
  const base64 = arrayBufferParaBase64(await file.arrayBuffer());
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: 'Extraia os dados desta nota de empenho.' },
        ],
      }],
    }),
  });
  let data;
  try { data = await res.json(); } catch { throw new Error('Resposta inválida do servidor de IA.'); }
  if (!res.ok || data?.error) throw new Error(data?.error?.message || `Erro na IA (${res.status})`);
  const raw = data?.content?.[0]?.text || '';
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('A IA não conseguiu ler a nota. Preencha manualmente.');
  let j;
  try { j = JSON.parse(m[0]); } catch { throw new Error('A IA devolveu um formato inesperado. Preencha manualmente.'); }
  return {
    numero: String(j.numero || '').trim(),
    dataEmissao: /^\d{4}-\d{2}-\d{2}$/.test(j.data_emissao || '') ? j.data_emissao : '',
    unidadeGestora: String(j.unidade_gestora || '').trim(),
    credor: String(j.credor || '').trim(),
    cnpj: String(j.cnpj || '').trim(),
    valor: parseValorBR(j.valor_total),
    observacao: String(j.observacao || '').trim(),
    itens: (Array.isArray(j.itens) ? j.itens : []).map(i => ({
      descricao: String(i.descricao || '').trim(),
      unidade: String(i.unidade || '').trim(),
      qtd: parseValorBR(i.quantidade),
      valorUnit: parseValorBR(i.valor_unitario),
    })).filter(i => i.descricao),
  };
}

// ── Persistência ─────────────────────────────────────────────────
// modo 'ata'      -> tabela ata_empenhos      (fk ata_id)
// modo 'contrato' -> tabela contrato_empenhos (fk contrato_id)
const ALVO = {
  ata:      { tabela: 'ata_empenhos',      fk: 'ata_id' },
  contrato: { tabela: 'contrato_empenhos', fk: 'contrato_id' },
};

function empenhoFromDb(r) {
  return {
    id: r.id,
    parentId: r.ata_id || r.contrato_id,
    numero: r.numero || '',
    dataEmissao: r.data_emissao || '',
    unidadeGestora: r.unidade_gestora || '',
    valor: parseFloat(r.valor) || 0,
    itens: Array.isArray(r.itens) ? r.itens : [],
    observacao: r.observacao || '',
    arquivoPath: r.arquivo_path || '',
    arquivoNome: r.arquivo_nome || '',
    createdAt: r.created_at,
  };
}

export async function sbListEmpenhos(parentId, modo = 'ata') {
  const { tabela, fk } = ALVO[modo];
  const { data, error } = await getSupabase().from(tabela).select('*')
    .eq(fk, parentId).order('data_emissao', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  if (error) return { data: [], error };
  return { data: data.map(empenhoFromDb), error: null };
}

// Todos os empenhos de contratos do tenant (para mostrar o saldo na lista).
export async function sbListTodosEmpenhosContratos() {
  const { data, error } = await withTenantScope(getSupabase().from('contrato_empenhos').select('id, contrato_id, valor'));
  if (error) return { data: [], error };
  return { data, error: null };
}

export async function uploadEmpenhoPdf(file, tenantId, parentId, modo = 'ata') {
  if (!tenantId) return { path: null, error: new Error('Tenant não identificado para salvar o PDF.') };
  const pasta = modo === 'contrato' ? `contrato-${parentId}` : parentId;
  const path = `${tenantId}/${pasta}/${Date.now()}-${sanitizeStorageFileName(file.name)}`;
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: false });
  return { path: error ? null : path, error };
}

export async function urlAssinadaEmpenho(path) {
  const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(path, 300);
  return { url: data?.signedUrl || null, error };
}

export async function sbCreateEmpenho(e, modo = 'ata') {
  const { tabela, fk } = ALVO[modo];
  const sb = getSupabase();
  const { data: u } = await sb.auth.getUser();
  const { data, error } = await sb.from(tabela).insert({
    id: e.id,
    [fk]: e.parentId,
    numero: e.numero,
    data_emissao: e.dataEmissao || null,
    unidade_gestora: e.unidadeGestora || null,
    valor: round2(e.valor),
    itens: e.itens,
    observacao: e.observacao || null,
    arquivo_path: e.arquivoPath || null,
    arquivo_nome: e.arquivoNome || null,
    created_by: u?.user?.id || null,
    ...(getTenantScope() ? { tenant_id: getTenantScope() } : {}),
  }).select().single();
  return { data: data ? empenhoFromDb(data) : null, error };
}

export async function sbDeleteEmpenho(emp, modo = 'ata') {
  const sb = getSupabase();
  const { error } = await sb.from(ALVO[modo].tabela).delete().eq('id', emp.id);
  if (error) return { error };
  if (emp.arquivoPath) await sb.storage.from(BUCKET).remove([emp.arquivoPath]); // best-effort
  return { error: null };
}

export const sbUpdateAtaItemUtilizada = (itemId, qtdUtilizada) =>
  getSupabase().from('ata_itens').update({ qtd_utilizada: qtdUtilizada }).eq('id', itemId);
