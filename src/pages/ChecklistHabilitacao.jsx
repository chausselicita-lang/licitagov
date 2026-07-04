import { useState, useRef, useEffect } from 'react';
import { getSupabase } from '../lib/supabase.js';
import Icon from '../components/Icon.jsx';

/* ── DESIGN TOKENS ────────────────────────────────────────────── */
const C = {
  bg: '#f5f5f5', surface: '#ffffff', border: '#e4e8ef',
  borderStrong: '#cbd5e1', accent: '#FF7A00',
  accentSubtle: '#fff1e6', accentBorder: '#FF7A0055',
  red: '#b91c1c', redSubtle: '#fef2f2',
  green: '#15803d', greenSubtle: '#f0fdf4',
  amber: '#b45309', amberSubtle: '#fffbeb',
  text: '#111827', sub: '#6b7280', tertiary: '#9ca3af',
};

/* ── CHECKLIST DEFINITION ─────────────────────────────────────── */
const CATEGORIAS = [
  {
    label: 'Consultas Prévias Obrigatórias',
    items: [
      { id: 'ceis_cnep',    label: 'CEIS / CNEP' },
      { id: 'improbidade',  label: 'Cert. Atos de Improbidade' },
      { id: 'inidoneos',    label: 'Cert. Inidôneos' },
    ],
  },
  {
    label: 'Habilitação Jurídica',
    items: [
      { id: 'contrato_social', label: 'Contrato Social' },
      { id: 'alteracoes',      label: 'Alterações e Consolidação' },
      { id: 'rg_cpf',          label: 'RG e CPF dos Sócios / Adms' },
      { id: 'junta',           label: 'Certidão Junta Comercial' },
      { id: 'cnpj',            label: 'Cartão de CNPJ' },
      { id: 'cnae',            label: 'CNAE' },
    ],
  },
  {
    label: 'Regularidade Fiscal e Trabalhista',
    items: [
      { id: 'insc_estadual',  label: 'Insc. Estadual ou Municipal' },
      { id: 'cert_federal',   label: 'Certidão Federal' },
      { id: 'fgts',           label: 'Certidão FGTS' },
      { id: 'cert_estadual',  label: 'Certidão Estadual' },
      { id: 'cert_municipal', label: 'Certidão Municipal' },
      { id: 'trabalhista',    label: 'Certidão Trabalhista' },
    ],
  },
  {
    label: 'Qualificação Econômico-Financeira',
    items: [
      { id: 'alvara',       label: 'Alvará de Funcionamento' },
      { id: 'concordata',   label: 'Certidão Concordata' },
      { id: 'balanco_2024', label: 'Balanço / Livro Diário 2024' },
      { id: 'balanco_2025', label: 'Balanço / Livro Diário 2025' },
      { id: 'indice',       label: 'Índice Financeiro' },
    ],
  },
  {
    label: 'Qualificação Técnica',
    items: [
      { id: 'atestado_pj', label: 'Atestado / CAT — PJ' },
      { id: 'atestado_pf', label: 'Atestado / CAT — PF' },
      { id: 'crea_pj',     label: 'Cert. CREA — PJ' },
      { id: 'crea_pf',     label: 'Cert. CREA — PF' },
      { id: 'equipe',      label: 'Relação de Equipe Técnica' },
      { id: 'vinculo',     label: 'Prova de Vínculo' },
      { id: 'indicacao',   label: 'Dec. de Indicação de Pessoal' },
      { id: 'garantia',    label: 'Garantia da Proposta' },
    ],
  },
  {
    label: 'Declarações',
    items: [
      { id: 'dec_menor',          label: 'Dec. Inexistência de Menor Trabalhador' },
      { id: 'dec_supervenientes', label: 'Dec. Fatos Supervenientes Impeditivos' },
      { id: 'dec_conhecimento',   label: 'Dec. Pleno Conhecimento' },
      { id: 'dec_requisitos',     label: 'Dec. Cumprimento dos Requisitos' },
      { id: 'dec_def',            label: 'Dec. Reserva para Def. e Reabilitados' },
      { id: 'dec_me_epp',         label: 'Dec. ME / EPP' },
    ],
  },
  {
    label: 'Proposta',
    items: [
      { id: 'planilha_proposta',    label: 'Planilha / Proposta' },
      { id: 'planilha_composicao',  label: 'Planilha de Composição' },
      { id: 'proposta_realinhada',  label: 'Proposta Realinhada — 120min' },
    ],
  },
];

const ALL_IDS = CATEGORIAS.flatMap(c => c.items.map(i => i.id));

const ELIMINATORIOS = new Set([
  'ceis_cnep', 'improbidade', 'inidoneos',
  'contrato_social', 'rg_cpf', 'junta', 'cnpj', 'cnae',
  'cert_federal', 'fgts', 'cert_estadual', 'cert_municipal', 'trabalhista',
  'dec_menor', 'dec_supervenientes', 'dec_conhecimento', 'dec_requisitos', 'dec_def',
  'planilha_proposta',
]);

/* ── HELPERS ─────────────────────────────────────────────────── */
function calcVeredicto(ck) {
  for (const id of ELIMINATORIOS) {
    if (ck[id] === 'nao') return 'INABILITADA';
  }
  if (ALL_IDS.every(id => ck[id] != null)) return 'HABILITADA';
  return 'PENDENTE';
}

function calcProgress(ck) {
  return ALL_IDS.filter(id => ck[id] != null).length;
}

function emptyEmpresa(n) {
  return {
    id: crypto.randomUUID(),
    nome: '', cnpj: '',
    arquivos: [], checklist: {},
    parecer_ia: '',
    analisando: false, gerandoParecer: false,
    sb_id: null,
    _n: n,
  };
}

/* ── PERSISTÊNCIA localStorage ───────────────────────────────── */
const STORAGE_KEY = 'licitagov_checklist_v1';

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persistState(processo, empresas) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      processo,
      empresas: empresas.map(e => ({
        ...e,
        arquivos: e.arquivos.map(a => ({ name: a.name, size: a.size })), // omite base64
        analisando: false,
        gerandoParecer: false,
      })),
    }));
  } catch {}
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const fmtBytes = b =>
  b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

/* ── SMALL UI ─────────────────────────────────────────────────── */
function Toast({ msg, type }) {
  const bg = type === 'error' ? '#b91c1c' : type === 'warn' ? '#b45309' : '#15803d';
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: bg, color: '#fff', borderRadius: 8,
      padding: '11px 18px', fontSize: 13, fontWeight: 500,
      boxShadow: `0 4px 16px ${bg}44`, maxWidth: 340,
      fontFamily: 'Inter,system-ui,sans-serif',
      animation: 'slideIn 0.22s ease',
    }}>{msg}</div>
  );
}

function Spinner({ size = 16 }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      border: `2px solid rgba(255,255,255,0.3)`,
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

function VeredictoTag({ v, size = 'md' }) {
  const cfg = {
    HABILITADA:  { bg: '#f0fdf4', fg: '#15803d', dot: '#15803d' },
    INABILITADA: { bg: '#fef2f2', fg: '#b91c1c', dot: '#b91c1c' },
    PENDENTE:    { bg: '#fffbeb', fg: '#b45309', dot: '#b45309' },
  };
  const { bg, fg, dot } = cfg[v] || cfg.PENDENTE;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: bg, color: fg, borderRadius: 999,
      padding: size === 'sm' ? '2px 8px' : '4px 10px',
      fontSize: size === 'sm' ? 10 : 12, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      {v}
    </span>
  );
}

function ProgressBar({ filled, total }) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  const color = pct === 100 ? C.green : C.accent;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: '#e4e8ef', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color,
          borderRadius: 3, transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, color: C.sub, fontWeight: 500, whiteSpace: 'nowrap' }}>
        {filled}/{total}
      </span>
    </div>
  );
}

/* ── INPUT FIELD ─────────────────────────────────────────────── */
function Field({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{
        fontSize: 11, color: C.sub, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>{label}</label>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: 6,
          padding: '8px 10px', fontSize: 13, color: C.text,
          outline: 'none', fontFamily: 'inherit',
          transition: 'border-color 0.14s, box-shadow 0.14s',
          width: '100%', boxSizing: 'border-box',
        }}
        onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accentSubtle}`; }}
        onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

/* ── SECTION: DOCUMENTOS ─────────────────────────────────────── */
function SectionDocumentos({ empresa, onUpdate, showToast }) {
  const fileRef = useRef();
  const MAX = 24 * 1024 * 1024;
  const total = empresa.arquivos.reduce((a, f) => a + f.size, 0);
  const overLimit = total > MAX;

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const novos = [];
    for (const f of files) {
      if (f.type !== 'application/pdf') {
        showToast(`"${f.name}" não é PDF — ignorado`, 'warn');
        continue;
      }
      try {
        const base64 = await readFileAsBase64(f);
        novos.push({ name: f.name, size: f.size, base64 });
      } catch {
        showToast(`Erro ao ler "${f.name}"`, 'error');
      }
    }
    if (novos.length) onUpdate({ arquivos: [...empresa.arquivos, ...novos] });
    e.target.value = '';
  };

  const remover = idx => onUpdate({ arquivos: empresa.arquivos.filter((_, i) => i !== idx) });

  const analisar = async () => {
    if (!empresa.arquivos.length) { showToast('Adicione ao menos um PDF', 'warn'); return; }
    if (overLimit) { showToast('Total excede 24 MB — remova alguns arquivos antes de analisar', 'warn'); return; }
    const validFiles = empresa.arquivos.filter(a => a.base64);
    if (!validFiles.length) {
      showToast('Faça o upload dos PDFs novamente — os dados de arquivo não persistem entre sessões', 'warn');
      return;
    }
    onUpdate({ analisando: true });
    try {
      const promptText = [
        'Analise os PDFs e identifique quais itens do checklist de habilitação estão presentes.',
        'Retorne APENAS um objeto JSON válido onde cada chave é o id do item e o valor é "sim", "nao" ou "na".',
        '',
        `Ids disponíveis: ${ALL_IDS.join(', ')}`,
        '',
        'Regras:',
        '- "sim" = documento presente e aparentemente válido.',
        '- "nao" = documento ausente ou claramente inválido.',
        '- "na" = item consultado online (ceis_cnep, improbidade, inidoneos), não exigido pelo edital, ou não aplicável.',
        '',
        'Inclua a chave "_obs" com uma observação geral de 1 a 2 frases sobre os documentos analisados.',
        'Retorne APENAS o JSON, sem texto extra, sem markdown, sem ```.',
      ].join('\n');

      // Payload > 3 MB raw → Vercel rejeita o base64; usa Supabase Storage + URL
      const totalRaw = validFiles.reduce((s, f) => s + f.size, 0);
      const useStorage = totalRaw > 3 * 1024 * 1024;

      let content;
      if (useStorage) {
        // Upload direto browser→Supabase via URL assinada (sem passar pelo proxy Vercel)
        const sb = getSupabase();
        if (!sb) throw new Error('Configure o Supabase para analisar arquivos grandes');
        const urls = [];
        for (const arq of validFiles) {
          // 1. Pede URL assinada ao servidor (service role fica server-side)
          const signRes = await fetch('/api/storage-sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: arq.name }),
          });
          if (!signRes.ok) throw new Error('Erro ao preparar upload do arquivo');
          const { token, path, publicUrl } = await signRes.json();

          // 2. Converte base64 → File e envia direto ao Supabase (sem limite Vercel)
          const binary = atob(arq.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const file = new File([bytes], arq.name, { type: 'application/pdf' });

          const { error: upErr } = await sb.storage
            .from('checklist-pdfs')
            .uploadToSignedUrl(path, token, file);
          if (upErr) throw new Error(`Erro ao enviar "${arq.name}": ${upErr.message}`);

          urls.push(publicUrl);
        }
        content = [
          ...urls.map(url => ({ type: 'document', source: { type: 'url', url } })),
          { type: 'text', text: promptText },
        ];
      } else {
        content = [
          ...validFiles.map(a => ({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: a.base64 },
          })),
          { type: 'text', text: promptText },
        ];
      }

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: 'Você analisa documentos de habilitação em licitações públicas brasileiras (Lei 14.133/2021). Retorne APENAS JSON válido.',
          messages: [{ role: 'user', content }],
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('Arquivo muito grande. Tente PDFs menores que 4MB cada.');
      }
      if (!res.ok) throw new Error(data?.error?.message || `Erro na API: ${res.status}`);
      if (data.error) throw new Error(data.error.message || 'Erro desconhecido');

      const raw = data?.content?.[0]?.text || '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Resposta da IA não contém JSON válido');

      const parsed = JSON.parse(match[0]);
      const { _obs, ...rest } = parsed;

      const novoChecklist = { ...empresa.checklist };
      for (const [k, v] of Object.entries(rest)) {
        if (ALL_IDS.includes(k) && ['sim', 'nao', 'na'].includes(v)) {
          novoChecklist[k] = v;
        }
      }

      onUpdate({ checklist: novoChecklist, analisando: false });
      showToast(_obs ? `Análise concluída: ${_obs}` : 'Checklist preenchido pela IA');
    } catch (err) {
      onUpdate({ analisando: false });
      showToast(`Erro na análise: ${err.message}`, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${C.accentBorder}`, borderRadius: 10,
          padding: '32px 24px', textAlign: 'center',
          background: C.accentSubtle, cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = '#fff1e6'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.accentBorder; e.currentTarget.style.background = C.accentSubtle; }}
      >
        <input
          ref={fileRef} type="file" accept="application/pdf" multiple
          onChange={onPickFiles} style={{ display: 'none' }}
        />
        <Icon name="upload" size={28} color={C.accent} strokeWidth={1.5} />
        <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: C.accent }}>
          Clique para adicionar PDFs
        </div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 5 }}>
          Documentos de habilitação da empresa — máx. 24 MB total
        </div>
      </div>

      {/* File list */}
      {empresa.arquivos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {empresa.arquivos.map((arq, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '9px 12px',
            }}>
              <Icon name="file-pdf" size={15} color={C.red} />
              <span style={{
                flex: 1, fontSize: 13, color: C.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{arq.name}</span>
              <span style={{ fontSize: 11, color: C.sub, flexShrink: 0 }}>{fmtBytes(arq.size)}</span>
              <button
                className="no-print"
                onClick={() => remover(idx)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: C.tertiary, padding: '2px 4px', borderRadius: 4,
                  display: 'flex', alignItems: 'center',
                }}
                onMouseEnter={e => e.currentTarget.style.color = C.red}
                onMouseLeave={e => e.currentTarget.style.color = C.tertiary}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}

          {overLimit && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.red,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="warning" size={13} color={C.red} />
              Total {fmtBytes(total)} excede 20 MB — remova alguns arquivos antes de analisar.
            </div>
          )}

          <div style={{ fontSize: 11, color: C.tertiary, textAlign: 'right' }}>
            Total: {fmtBytes(total)} · {empresa.arquivos.length} arquivo{empresa.arquivos.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Action */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={analisar}
          disabled={empresa.analisando || !empresa.arquivos.length || overLimit}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: empresa.analisando ? '#9ca3af' : C.accent,
            color: '#121212', border: 'none', borderRadius: 8,
            padding: '10px 22px', fontSize: 13, fontWeight: 600,
            cursor: empresa.analisando || !empresa.arquivos.length || overLimit ? 'not-allowed' : 'pointer',
            opacity: !empresa.arquivos.length ? 0.5 : 1,
            fontFamily: 'inherit', transition: 'background 0.15s',
          }}
        >
          {empresa.analisando
            ? <><Spinner /> Analisando...</>
            : <><Icon name="sparkle" size={14} color="#121212" /> Analisar com IA</>
          }
        </button>
      </div>
    </div>
  );
}

/* ── SECTION: CHECKLIST ──────────────────────────────────────── */
function SectionChecklist({ empresa, onUpdate }) {
  const ck = empresa.checklist;

  const toggle = (id, val) => {
    const novo = { ...ck, [id]: ck[id] === val ? null : val };
    onUpdate({ checklist: novo });
  };

  const filled = calcProgress(ck);
  const veredicto = calcVeredicto(ck);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '12px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <VeredictoTag v={veredicto} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.sub }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.red, display: 'inline-block' }} />
            Item eliminatório
          </div>
        </div>
        <div style={{ minWidth: 180, flex: 1, maxWidth: 280 }}>
          <ProgressBar filled={filled} total={ALL_IDS.length} />
        </div>
      </div>

      {/* Categories */}
      {CATEGORIAS.map(cat => (
        <div key={cat.label} style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10, overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 16px', background: '#f8fafc',
            borderBottom: `1px solid ${C.border}`,
            fontSize: 11, fontWeight: 700, color: C.sub,
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            {cat.label}
          </div>

          {cat.items.map((item, idx) => {
            const val = ck[item.id];
            const elim = ELIMINATORIOS.has(item.id);
            const rowBg = val === 'nao' && elim ? '#fef2f2' : 'transparent';

            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 16px',
                borderBottom: idx < cat.items.length - 1 ? `1px solid ${C.border}` : 'none',
                background: rowBg, transition: 'background 0.12s',
              }}>
                {/* Dot eliminatório */}
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: elim ? C.red : 'transparent',
                }} title={elim ? 'Item eliminatório' : undefined} />

                <span style={{
                  flex: 1, fontSize: 13, color: C.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {item.label}
                </span>

                {/* Print status */}
                <span className="print-status" style={{ display: 'none', fontSize: 11, fontWeight: 700, color: val === 'sim' ? C.green : val === 'nao' ? C.red : C.tertiary }}>
                  {val ? val.toUpperCase() : '—'}
                </span>

                {/* Interactive buttons */}
                <div className="no-print" style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {[
                    { v: 'sim', label: 'SIM', color: C.green },
                    { v: 'nao', label: 'NÃO', color: C.red },
                    { v: 'na',  label: 'N/A', color: C.sub },
                  ].map(({ v, label, color }) => (
                    <button key={v} onClick={() => toggle(item.id, v)} style={{
                      padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 5,
                      border: `1px solid ${val === v ? color : C.border}`,
                      background: val === v ? color : 'transparent',
                      color: val === v ? '#fff' : C.sub,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                    }}>{label}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ── SECTION: PARECER ────────────────────────────────────────── */
function SectionParecer({ empresa, processo, onUpdate, showToast }) {
  const gerar = async () => {
    onUpdate({ gerandoParecer: true });
    try {
      const veredicto = calcVeredicto(empresa.checklist);
      const linhas = CATEGORIAS.flatMap(cat =>
        cat.items.map(item => {
          const v = empresa.checklist[item.id];
          const tag = ELIMINATORIOS.has(item.id) ? '[ELIM] ' : '       ';
          const status = v ? v.toUpperCase() : 'PENDENTE';
          return `${tag}${item.label}: ${status}`;
        })
      ).join('\n');

      const prompt = [
        'Você é um pregoeiro jurídico especialista em licitações públicas. Emita um PARECER JURÍDICO completo e fundamentado.',
        '',
        `Empresa: ${empresa.nome || 'Não informada'}${empresa.cnpj ? ` — CNPJ: ${empresa.cnpj}` : ''}`,
        `Processo: ${processo.numero || 'Não informado'}${processo.objeto ? ` — ${processo.objeto}` : ''}`,
        `Veredicto apurado: ${veredicto}`,
        '',
        'CHECKLIST ([ELIM] = item eliminatório):',
        linhas,
        '',
        'Estruture o parecer em 4 seções, sem markdown:',
        '1. VEREDICTO — uma linha objetiva com o resultado e enquadramento legal.',
        '2. FUNDAMENTAÇÃO LEGAL — artigos específicos da Lei 14.133/2021 e normas correlatas.',
        '3. ANÁLISE DOCUMENTAL — para cada item NÃO ou PENDENTE, explique a pendência e o impacto no resultado.',
        '4. RECOMENDAÇÃO AO PREGOEIRO — ação imediata, prazo e providências sugeridas.',
        '',
        'Seja técnico, preciso e objetivo. Não use markdown, asteriscos ou formatação especial.',
      ].join('\n');

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: 'Você é especialista jurídico em licitações públicas brasileiras (Lei 14.133/2021). Emita pareceres técnicos, objetivos e fundamentados.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) throw new Error(`Erro na API: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || 'Erro desconhecido');

      const parecer = data?.content?.[0]?.text || '';
      onUpdate({ parecer_ia: parecer, gerandoParecer: false });
      showToast('Parecer jurídico gerado com sucesso!');
    } catch (err) {
      onUpdate({ gerandoParecer: false });
      showToast(`Erro ao gerar parecer: ${err.message}`, 'error');
    }
  };

  const copiar = () => {
    if (!empresa.parecer_ia) return;
    navigator.clipboard.writeText(empresa.parecer_ia)
      .then(() => showToast('Texto copiado para a área de transferência'))
      .catch(() => showToast('Falha ao copiar', 'error'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Action bar */}
      <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={gerar}
          disabled={empresa.gerandoParecer}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: empresa.gerandoParecer ? '#9ca3af' : C.accent,
            color: '#121212', border: 'none', borderRadius: 8,
            padding: '10px 20px', fontSize: 13, fontWeight: 600,
            cursor: empresa.gerandoParecer ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'background 0.15s',
          }}
        >
          {empresa.gerandoParecer
            ? <><Spinner /> Gerando parecer...</>
            : <><Icon name="sparkle" size={14} color="#121212" /> Gerar Parecer Jurídico</>
          }
        </button>

        {empresa.parecer_ia && !empresa.gerandoParecer && (
          <>
            <button onClick={copiar} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', color: C.text, fontFamily: 'inherit',
              transition: 'border-color 0.14s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
            >
              <Icon name="copy" size={14} /> Copiar
            </button>
            <button onClick={() => window.print()} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', color: C.text, fontFamily: 'inherit',
              transition: 'border-color 0.14s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
            >
              <Icon name="print" size={14} /> Imprimir
            </button>
          </>
        )}
      </div>

      {/* Loading state */}
      {empresa.gerandoParecer && (
        <div style={{
          background: C.accentSubtle, border: `1px solid ${C.accentBorder}`,
          borderRadius: 10, padding: '28px 24px', textAlign: 'center',
        }}>
          <div style={{
            width: 22, height: 22, border: `2px solid ${C.accentBorder}`,
            borderTopColor: C.accent, borderRadius: '50%',
            animation: 'spin 0.7s linear infinite', margin: '0 auto 14px',
          }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: C.accent }}>
            Analisando o checklist e gerando fundamentação jurídica...
          </div>
        </div>
      )}

      {/* Parecer content */}
      {empresa.parecer_ia && !empresa.gerandoParecer && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '20px 24px',
        }}>
          <div style={{ borderLeft: `4px solid ${C.accent}`, paddingLeft: 14, marginBottom: 18 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.sub,
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3,
            }}>
              Parecer Jurídico — IA Claude
            </div>
            <div style={{ fontSize: 11, color: C.tertiary }}>
              {empresa.nome || 'Empresa'}{empresa.cnpj ? ` · CNPJ ${empresa.cnpj}` : ''}
              {processo.numero ? ` · Processo ${processo.numero}` : ''}
            </div>
          </div>
          <pre style={{
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontSize: 13, lineHeight: 1.75, color: C.text,
            fontFamily: 'inherit', margin: 0,
          }}>
            {empresa.parecer_ia}
          </pre>
        </div>
      )}

      {/* Empty state */}
      {!empresa.parecer_ia && !empresa.gerandoParecer && (
        <div style={{
          textAlign: 'center', padding: '44px 24px',
          border: `1px dashed ${C.border}`, borderRadius: 10,
        }}>
          <Icon name="file-text" size={36} strokeWidth={1.1} color={C.tertiary} />
          <div style={{ fontSize: 13, fontWeight: 600, color: C.sub, marginTop: 12 }}>
            Nenhum parecer gerado ainda
          </div>
          <div style={{ fontSize: 12, color: C.tertiary, marginTop: 4 }}>
            Preencha o checklist e clique em "Gerar Parecer Jurídico"
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MAIN COMPONENT ──────────────────────────────────────────── */
const SUB_TABS = [
  { id: 'documentos', label: 'Documentos (PDF)' },
  { id: 'checklist',  label: 'Checklist' },
  { id: 'parecer',    label: 'Parecer IA' },
];

export default function ChecklistHabilitacao({ toast: extToast }) {
  const [processo, setProcesso] = useState(() => loadPersistedState()?.processo || { numero: '', objeto: '' });
  const [empresas, setEmpresas] = useState(() => loadPersistedState()?.empresas || [emptyEmpresa(1)]);
  const [empIdx, setEmpIdx] = useState(0);
  const [subTab, setSubTab] = useState('checklist');
  const [saving, setSaving] = useState(false);
  const [localToast, setLocalToast] = useState(null);

  useEffect(() => { persistState(processo, empresas); }, [processo, empresas]);

  const showToast = (msg, type = 'ok') => {
    if (extToast) { extToast(msg, type); return; }
    setLocalToast({ msg, type });
    setTimeout(() => setLocalToast(null), 3500);
  };

  const updateEmpresa = (id, patch) =>
    setEmpresas(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));

  const addEmpresa = () => {
    if (empresas.length >= 8) { showToast('Máximo de 8 empresas atingido', 'warn'); return; }
    const n = empresas.length + 1;
    setEmpresas(prev => [...prev, emptyEmpresa(n)]);
    setEmpIdx(empresas.length);
    setSubTab('checklist');
  };

  const removeEmpresa = (idx) => {
    if (empresas.length <= 1) return;
    setEmpresas(prev => prev.filter((_, i) => i !== idx));
    setEmpIdx(prev => Math.min(prev, empresas.length - 2));
  };

  const selectEmpresa = (idx) => {
    setEmpIdx(idx);
    setSubTab('checklist');
  };

  const salvar = async () => {
    if (!processo.numero.trim()) { showToast('Informe o número do processo', 'warn'); return; }
    const semNome = empresas.findIndex(e => !e.nome.trim());
    if (semNome >= 0) {
      setEmpIdx(semNome);
      showToast('Preencha o nome de todas as empresas', 'warn');
      return;
    }
    setSaving(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase não configurado');

      for (const emp of empresas) {
        const record = {
          numero_processo: processo.numero.trim(),
          objeto: processo.objeto.trim() || null,
          empresa_nome: emp.nome.trim(),
          empresa_cnpj: emp.cnpj.trim() || null,
          checklist: emp.checklist,
          veredicto: calcVeredicto(emp.checklist),
          parecer_ia: emp.parecer_ia || null,
          pdfs_nomes: emp.arquivos.map(a => a.name),
          updated_at: new Date().toISOString(),
        };

        if (emp.sb_id) {
          const { error } = await sb.from('checklist_habilitacao').update(record).eq('id', emp.sb_id);
          if (error) throw error;
        } else {
          const { data, error } = await sb
            .from('checklist_habilitacao')
            .insert(record)
            .select('id')
            .single();
          if (error) throw error;
          if (data?.id) updateEmpresa(emp.id, { sb_id: data.id });
        }
      }

      showToast('Checklist salvo com sucesso!');
    } catch (err) {
      showToast(`Erro ao salvar: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const emp = empresas[empIdx];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter,system-ui,sans-serif' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-status { display: inline !important; }
        }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {localToast && <Toast msg={localToast.msg} type={localToast.type} />}

      {/* Page header */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, marginBottom: 14,
        }}>
          <div>
            <h2 style={{
              fontSize: 26, fontWeight: 700, color: C.text,
              borderLeft: '4px solid #FF7A00', paddingLeft: 14,
              lineHeight: 1.2, margin: 0,
            }}>
              Checklist de Habilitação
            </h2>
            <p style={{ fontSize: 13, color: C.sub, marginTop: 6, paddingLeft: 18, marginBottom: 0 }}>
              Pregão Eletrônico — Prefeitura de Mascote/BA — Lei 14.133/2021
            </p>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => window.print()} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '8px 14px', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', color: C.text, fontFamily: 'inherit',
              transition: 'border-color 0.14s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
            >
              <Icon name="print" size={13} /> Imprimir
            </button>

            <button onClick={salvar} disabled={saving} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: saving ? '#9ca3af' : C.accent,
              color: '#121212', border: 'none', borderRadius: 8,
              padding: '8px 18px', fontSize: 12, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}>
              {saving
                ? <><Spinner size={12} /> Salvando...</>
                : <><Icon name="check" size={13} color="#121212" /> Salvar</>
              }
            </button>
          </div>
        </div>

        {/* Processo fields */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '14px 18px',
          display: 'grid',
          gridTemplateColumns: 'clamp(160px, 20%, 220px) 1fr',
          gap: 14,
        }}>
          <Field
            label="N.º do Processo"
            value={processo.numero}
            onChange={v => setProcesso(p => ({ ...p, numero: v }))}
            placeholder="Ex: 001/2025"
          />
          <Field
            label="Objeto"
            value={processo.objeto}
            onChange={v => setProcesso(p => ({ ...p, objeto: v }))}
            placeholder="Descreva o objeto da licitação..."
          />
        </div>
      </div>

      {/* Empresa tabs row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {empresas.map((e, idx) => {
          const v = calcVeredicto(e.checklist);
          const dotColor = v === 'HABILITADA' ? C.green : v === 'INABILITADA' ? C.red : '#b45309';
          const active = idx === empIdx;
          return (
            <div key={e.id}
              onClick={() => selectEmpresa(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: active ? C.surface : 'transparent',
                border: `1px solid ${active ? C.borderStrong : C.border}`,
                borderRadius: 8, padding: '6px 10px', cursor: 'pointer', flexShrink: 0,
                transition: 'all 0.13s',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
              <span style={{
                fontSize: 12, fontWeight: active ? 600 : 400,
                color: active ? C.text : C.sub,
                maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {e.nome.trim() || `Empresa ${idx + 1}`}
              </span>
              {empresas.length > 1 && (
                <button
                  className="no-print"
                  onClick={ev => { ev.stopPropagation(); removeEmpresa(idx); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: C.tertiary, padding: '1px 2px', borderRadius: 3,
                    display: 'flex', alignItems: 'center', marginLeft: 2,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = C.red}
                  onMouseLeave={e => e.currentTarget.style.color = C.tertiary}
                >
                  <Icon name="close" size={11} />
                </button>
              )}
            </div>
          );
        })}

        {empresas.length < 8 && (
          <button
            className="no-print"
            onClick={addEmpresa}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: `1px dashed ${C.border}`,
              borderRadius: 8, padding: '6px 12px', fontSize: 12,
              color: C.sub, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              transition: 'border-color 0.13s, color 0.13s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.sub; }}
          >
            <Icon name="plus" size={12} /> Adicionar empresa
          </button>
        )}
      </div>

      {/* Empresa card */}
      {emp && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Empresa identity fields */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '14px 18px',
            display: 'grid',
            gridTemplateColumns: '1fr clamp(160px, 25%, 240px)',
            gap: 14,
          }}>
            <Field
              label="Razão Social"
              value={emp.nome}
              onChange={v => updateEmpresa(emp.id, { nome: v })}
              placeholder="Nome da empresa..."
            />
            <Field
              label="CNPJ"
              value={emp.cnpj}
              onChange={v => updateEmpresa(emp.id, { cnpj: v })}
              placeholder="00.000.000/0000-00"
            />
          </div>

          {/* Sub-tab bar */}
          <div className="no-print" style={{
            display: 'flex', borderBottom: `1px solid ${C.border}`,
          }}>
            {SUB_TABS.map(st => (
              <button key={st.id} onClick={() => setSubTab(st.id)} style={{
                padding: '9px 20px', fontSize: 13,
                fontWeight: subTab === st.id ? 600 : 400,
                color: subTab === st.id ? C.accent : C.sub,
                background: 'none', border: 'none',
                borderBottom: `2px solid ${subTab === st.id ? C.accent : 'transparent'}`,
                marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'color 0.13s',
              }}>
                {st.label}
              </button>
            ))}
          </div>

          {/* Sub-tab content */}
          <div>
            {subTab === 'documentos' && (
              <SectionDocumentos
                empresa={emp}
                onUpdate={p => updateEmpresa(emp.id, p)}
                showToast={showToast}
              />
            )}
            {subTab === 'checklist' && (
              <SectionChecklist
                empresa={emp}
                onUpdate={p => updateEmpresa(emp.id, p)}
              />
            )}
            {subTab === 'parecer' && (
              <SectionParecer
                empresa={emp}
                processo={processo}
                onUpdate={p => updateEmpresa(emp.id, p)}
                showToast={showToast}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
