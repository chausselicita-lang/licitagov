// Pesquisa de preço por item (PNCP + Painel de Preços via MCP Server) e
// export do mapa comparativo em .docx — combinados num único arquivo por
// causa do teto de 12 Serverless Functions do plano Hobby da Vercel
// (o projeto já estava no limite antes desta feature). Roteado por
// req.body.action: "pesquisar" | "exportar".
import { createClient } from '@supabase/supabase-js';
import { buildMapaComparativoDocx, nomeArquivoMapaComparativo } from '../src/lib/cotacaoMapaDocx.js';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const BUCKET = 'cotacoes-docs';

// TODO(validar contra a doc oficial no primeiro teste real — risco aberto do
// Execution Plan): valor do header beta do MCP connector e se o modelo abaixo
// suporta mcp_servers. https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
const ANTHROPIC_BETA_MCP = 'mcp-client-2025-04-04';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOOL_ITERACOES = 4;

const SYSTEM_PESQUISA_ITEM = `Você é um especialista em pesquisa de preços para licitações públicas brasileiras (Lei 14.133/2021, art. 23).
Você tem acesso a uma ferramenta MCP chamada "consolidar_pesquisa_precos" que consulta DIRETAMENTE as APIs oficiais do PNCP e do Painel de Preços (Compras.gov.br) — dados estruturados e reais, não busca na web.
Para o item informado, chame consolidar_pesquisa_precos passando o termo (e uf, se fornecida). NÃO invente, estime ou complemente valores — use exclusivamente os dados retornados pela ferramenta.
Depois de receber o resultado da ferramenta, responda SOMENTE com um JSON válido, sem markdown, sem bloco de código, sem texto antes ou depois, no formato exato:
{"fontes":[{"fonte":"pncp"|"painel_precos","descricao":"...","fornecedor":"...","valor_unitario":0.00,"unidade_medida":"...","orgao_referencia":"...","data_referencia":"YYYY-MM-DD ou null","url":"... ou null"}],"mediana":0.00}
Se a ferramenta não retornar nenhum resultado, responda {"fontes":[],"mediana":null}. Nunca inclua fontes com valor_unitario ausente ou igual a zero.`;

function anthropicHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': ANTHROPIC_BETA_MCP,
  };
}

async function chamarClaudeComMcp({ termo, unidadeMedida, uf }) {
  const mcpUrl = process.env.MCP_PRECOS_URL;
  const mcpToken = process.env.MCP_PRECOS_TOKEN;
  if (!mcpUrl || !mcpToken) {
    throw new Error('MCP_PRECOS_URL / MCP_PRECOS_TOKEN não configurados nas variáveis de ambiente do Vercel.');
  }

  const userContent = `Pesquise preços oficiais (PNCP + Painel de Preços) para o item: ${termo}` +
    (unidadeMedida ? ` (unidade: ${unidadeMedida})` : '') +
    (uf ? ` — UF de referência: ${uf}` : '');

  let messages = [{ role: 'user', content: userContent }];
  let finalText = '';

  for (let iter = 0; iter < MAX_TOOL_ITERACOES; iter++) {
    const body = {
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PESQUISA_ITEM,
      mcp_servers: [{
        type: 'url',
        url: mcpUrl,
        name: 'pncp-painel-precos',
        authorization_token: mcpToken,
      }],
      messages,
    };

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: anthropicHeaders(),
      body: JSON.stringify(body),
    });
    const json = await upstream.json();
    if (!upstream.ok) {
      throw new Error(json?.error?.message || `Erro HTTP ${upstream.status} na Claude API`);
    }

    const texts = (json.content || []).filter(b => b.type === 'text').map(b => b.text);
    if (texts.length) finalText = texts.join('\n');

    // O MCP connector executa a tool remota do lado da Anthropic e já
    // devolve o resultado dentro do mesmo turno (mcp_tool_result); em geral
    // não é necessário reenviar nada. Mantemos o loop só como salvaguarda
    // caso a resposta venha com stop_reason que exija continuação.
    if (json.stop_reason === 'end_turn' || !json.stop_reason) break;
    if (json.stop_reason === 'tool_use' || json.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: json.content }, { role: 'user', content: 'Continue.' }];
      continue;
    }
    break;
  }

  return finalText;
}

function parseResultadoIA(finalText) {
  const m = finalText.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('IA não retornou JSON válido. Tente novamente ou reformule o item.');
  const parsed = JSON.parse(m[0]);
  const fontes = Array.isArray(parsed.fontes) ? parsed.fontes : [];
  return { fontes, mediana: parsed.mediana ?? null };
}

async function handlePesquisar(req, res, sb) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: { message: 'ANTHROPIC_API_KEY não configurada nas variáveis de ambiente do Vercel.' } });
  }

  const { cotacaoId, itemId, termo, unidadeMedida, uf } = req.body || {};
  if (!cotacaoId || !itemId || !termo || !String(termo).trim()) {
    return res.status(400).json({ error: { message: 'cotacaoId, itemId e termo são obrigatórios' } });
  }

  try {
    // Resolve o tenant_id REAL a partir da cotação no banco — nunca aceita
    // tenant_id vindo do client, mesmo sob service role (que bypassa RLS).
    const { data: cot, error: eCot } = await sb
      .from('cotacoes')
      .select('id, tenant_id')
      .eq('id', cotacaoId)
      .single();
    if (eCot) throw eCot;
    if (!cot) return res.status(404).json({ error: { message: 'Cotação não encontrada' } });

    const finalText = await chamarClaudeComMcp({ termo, unidadeMedida, uf });
    const { fontes, mediana } = parseResultadoIA(finalText);

    const linhas = fontes
      .filter(f => Number(f.valor_unitario) > 0)
      .map(f => ({
        cotacao_id: cotacaoId,
        item_id: itemId,
        tenant_id: cot.tenant_id,
        fonte: f.fonte === 'pncp' || f.fonte === 'painel_precos' ? f.fonte : 'painel_precos',
        descricao: f.descricao || null,
        fornecedor: f.fornecedor || null,
        valor_unitario: Number(f.valor_unitario),
        unidade_medida: f.unidade_medida || null,
        orgao_referencia: f.orgao_referencia || null,
        data_referencia: f.data_referencia || null,
        url: f.url || null,
        selecionado: true,
      }));

    let inseridas = [];
    if (linhas.length) {
      const { data, error: eInsert } = await sb.from('cot_fontes_ia').insert(linhas).select();
      if (eInsert) throw eInsert;
      inseridas = data;
    }

    return res.json({ fontes: inseridas, mediana });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message || String(err) } });
  }
}

async function handleExportar(req, res, sb) {
  const { cotacaoId } = req.body || {};
  if (!cotacaoId) return res.status(400).json({ error: 'cotacaoId é obrigatório' });

  try {
    // service role bypassa RLS — o filtro por cotacaoId já restringe ao
    // registro certo; não há necessidade de tenant_id aqui pois estamos
    // lendo (não gravando) e o id já identifica a cotação de forma única.
    const { data: cot, error: eCot } = await sb
      .from('cotacoes')
      .select('id, numero, objeto, processo, data_criacao, cot_itens(id, descricao, unidade, qtd, cot_fontes_ia(fonte, fornecedor, descricao, valor_unitario, unidade_medida, orgao_referencia, data_referencia, url, selecionado, item_id))')
      .eq('id', cotacaoId)
      .single();
    if (eCot) throw eCot;
    if (!cot) return res.status(404).json({ error: 'Cotação não encontrada' });

    const itens = (cot.cot_itens || [])
      .map(it => ({
        descricao: it.descricao,
        unidade: it.unidade,
        qtd: it.qtd,
        fontes: (it.cot_fontes_ia || []).filter(f => f.item_id === it.id && f.selecionado !== false),
      }))
      .filter(it => it.fontes.length > 0);

    if (!itens.length) {
      return res.status(400).json({ error: 'Nenhum item com fontes de preço selecionadas para gerar o mapa. Pesquise e selecione ao menos um resultado antes de exportar.' });
    }

    const docxBuf = await buildMapaComparativoDocx({
      cotacao: { numero: cot.numero, objeto: cot.objeto, processo: cot.processo, dataCriacao: cot.data_criacao },
      itens,
    });
    const nomeArquivo = nomeArquivoMapaComparativo({ numero: cot.numero });
    const path = `mapas/${cot.id}/${nomeArquivo}`;

    const upload = await sb.storage.from(BUCKET).upload(path, docxBuf, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });
    if (upload.error) throw upload.error;

    const docxUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    const { data: row, error: eUpdate } = await sb
      .from('cotacoes')
      .update({ mapa_docx_url: docxUrl })
      .eq('id', cotacaoId)
      .select()
      .single();
    if (eUpdate) throw eUpdate;

    return res.json({ cotacao: row, docxUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: { message: 'SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel' } });
  }
  const sb = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { action } = req.body || {};
  if (action === 'exportar') return handleExportar(req, res, sb);
  if (action === 'pesquisar') return handlePesquisar(req, res, sb);
  return res.status(400).json({ error: { message: 'action deve ser "pesquisar" ou "exportar"' } });
}
