import { useState, useCallback, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   LICITAGOV — Sistema de Gestão de Licitações Públicas
   Lei 14.133/2021 · Light Professional · Clériston
═══════════════════════════════════════════════════════════════ */

const C = {
  bg:           "#f4f5f7",
  surface:      "#ffffff",
  card:         "#ffffff",
  overlay:      "#f8f9fa",
  subtle:       "#edf0f2",
  border:       "rgba(0,0,0,0.09)",
  borderStrong: "rgba(0,0,0,0.16)",
  accent:       "#1a56db",
  accentHover:  "#1344b8",
  accentSubtle: "rgba(26,86,219,0.08)",
  accentBorder: "rgba(26,86,219,0.20)",
  accent2:      "#0e7490",
  gold:         "#b45309",
  red:          "#dc2626",
  green:        "#15803d",
  amber:        "#b45309",
  purple:       "#6d28d9",
  text:         "#111827",
  sub:          "#6b7280",
  subL:         "#6b7280",
  tertiary:     "#9ca3af",
};

const fmtBRL = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
const fmtDate = d => d ? new Date(d+"T00:00:00").toLocaleDateString("pt-BR") : "—";
const hoje = () => new Date().toISOString().slice(0,10);
const diasParaVencer = d => {
  if (!d) return null;
  return Math.round((new Date(d+"T00:00:00") - new Date()) / 86400000);
};
const calcMediana = arr => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a,b)=>a-b);
  const m = Math.floor(s.length/2);
  return s.length%2 ? s[m] : (s[m-1]+s[m])/2;
};
const uid = () => Math.random().toString(36).slice(2,10);

/* ── SVG ICON SYSTEM ───────────────────────────────────────── */
function Icon({ name, size=16, strokeWidth=1.8, color="currentColor" }) {
  const d = {
    dashboard:  <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></>,
    processos:  <><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    atas:       <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    contratos:  <><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></>,
    cotacoes:   <><circle cx="12" cy="12" r="10"/><path d="M12 8v1m0 6v1"/><path d="M14.5 9.5a2.5 2.5 0 0 0-5 0c0 1.4.9 2.2 2.5 2.5s2.5 1.1 2.5 2.5a2.5 2.5 0 0 1-5 0"/></>,
    relatorios: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></>,
    claude:     <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
    attach:     <><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></>,
    send:       <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    close:      <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    warning:    <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    settings:   <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    print:      <><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>,
    install:    <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    menu:       <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    user:       <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    back:       <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    plus:       <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    search:     <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    check:      <><polyline points="20 6 9 17 4 12"/></>,
    image:      <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
    file:       <><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    key:        <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
    robot:      <><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
      {d[name] || null}
    </svg>
  );
}

const STORAGE_KEY = "licitagov_data_v2";
function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return null;
}
function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

const SEED = {
  processos: [
    { id:"p1", numero:"001/2025", objeto:"Aquisição de combustíveis", modalidade:"Pregão Eletrônico", fase:"Homologado", valor:180000, abertura:"2025-03-10", orgao:"Secretaria de Obras" },
    { id:"p2", numero:"002/2025", objeto:"Serviços de limpeza urbana", modalidade:"Pregão Eletrônico", fase:"Em andamento", valor:320000, abertura:"2025-04-22", orgao:"Secretaria de Serviços" },
    { id:"p3", numero:"003/2025", objeto:"Material de escritório", modalidade:"Dispensa", fase:"Planejamento", valor:12000, abertura:"2025-05-15", orgao:"Administrativo" },
    { id:"p4", numero:"004/2025", objeto:"Equipamentos de TI", modalidade:"Pregão Eletrônico", fase:"Publicado", valor:95000, abertura:"2025-06-01", orgao:"Secretaria de TI" },
  ],
  atas: [
    { id:"a1", numero:"ARP 001/2025", objeto:"Combustíveis automotivos", fornecedor:"Posto Ipiranga Ltda", cnpj:"12.345.678/0001-99", vigencia:"2026-03-10", valorTotal:180000, saldoDisponivel:145000, itens:[
      { id:"i1", descricao:"Gasolina Comum", unidade:"Litro", qtdRegistrada:5000, qtdUtilizada:1400, valorUnit:5.80 },
      { id:"i2", descricao:"Diesel S-10", unidade:"Litro", qtdRegistrada:8000, qtdUtilizada:2200, valorUnit:6.40 },
    ]},
    { id:"a2", numero:"ARP 002/2025", objeto:"Material de limpeza", fornecedor:"Distribuidora Clean Ltda", cnpj:"98.765.432/0001-11", vigencia:"2025-12-31", valorTotal:48000, saldoDisponivel:31200, itens:[
      { id:"i3", descricao:"Detergente 500ml", unidade:"Unidade", qtdRegistrada:2000, qtdUtilizada:600, valorUnit:2.50 },
      { id:"i4", descricao:"Água sanitária 1L", unidade:"Unidade", qtdRegistrada:1500, qtdUtilizada:400, valorUnit:3.20 },
    ]},
  ],
  contratos: [
    { id:"c1", numero:"CT 001/2025", objeto:"Serviços de limpeza urbana", fornecedor:"LimpaMais Ltda", cnpj:"11.222.333/0001-44", valor:320000, inicio:"2025-05-01", fim:"2026-04-30", status:"Vigente", processo:"002/2025" },
    { id:"c2", numero:"CT 002/2025", objeto:"Manutenção de veículos", fornecedor:"Auto Center Norte", cnpj:"55.666.777/0001-88", valor:85000, inicio:"2025-01-15", fim:"2026-01-15", status:"A vencer", processo:"—" },
    { id:"c3", numero:"CT 003/2024", objeto:"Fornecimento de merenda", fornecedor:"Alimentos Bom Sabor", cnpj:"33.444.555/0001-22", valor:210000, inicio:"2024-02-01", fim:"2025-02-01", status:"Encerrado", processo:"—" },
  ],
  cotacoes: [
    { id:"q1", numero:"COT 001/2025", objeto:"Aquisição de papel A4", processo:"003/2025", status:"Finalizada", dataCriacao:"2025-02-10",
      fornecedores:[
        { id:"f1", razao:"Papelaria ABC", cnpj:"10.000.001/0001-01" },
        { id:"f2", razao:"Distribuidora XYZ", cnpj:"10.000.002/0001-02" },
        { id:"f3", razao:"Atacado Paper", cnpj:"10.000.003/0001-03" },
      ],
      itens:[
        { id:"it1", descricao:"Papel A4 75g/m² — Resma 500fls", unidade:"Resma", qtd:200, valores:{ f1:22.50, f2:21.00, f3:23.80 } },
        { id:"it2", descricao:"Papel A4 90g/m² — Resma 500fls", unidade:"Resma", qtd:50, valores:{ f1:28.00, f2:26.50, f3:29.00 } },
      ]
    },
  ],
};

/* ── COMPONENTES BASE ──────────────────────────────────────── */

function Badge({ label, color }) {
  const map = {
    "Vigente":      C.green,
    "A vencer":     C.gold,
    "Encerrado":    C.sub,
    "Vencido":      C.red,
    "Homologado":   C.green,
    "Em andamento": C.accent,
    "Publicado":    C.accent2,
    "Planejamento": C.gold,
    "Revogado":     C.red,
    "Suspenso":     C.purple,
    "Finalizada":   C.green,
    "Em coleta":    C.accent,
    "Rascunho":     C.sub,
  };
  const c = color || map[label] || C.subL;
  return (
    <span style={{
      background: c+"18", color: c, border: `1px solid ${c}44`,
      borderRadius: 4, padding: "2px 8px",
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      textTransform: "uppercase",
    }}>{label}</span>
  );
}

function Btn({ children, onClick, color=C.accent, variant="solid", size="md", disabled=false, style:sx={} }) {
  const [hov,setHov]=useState(false);
  const pad = size==="sm" ? "5px 12px" : size==="lg" ? "11px 28px" : "8px 16px";
  const fs  = size==="sm" ? 12 : size==="lg" ? 14 : 13;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background: variant==="solid" ? (hov?C.accentHover:color) : (hov?color+"12":"transparent"),
        color: variant==="solid" ? "#ffffff" : color,
        border: variant==="solid" ? "none" : `1px solid ${color}55`,
        borderRadius:6, padding:pad, fontSize:fs, fontWeight:500,
        cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.45:1,
        transition:"all 0.14s", fontFamily:"inherit", whiteSpace:"nowrap", ...sx,
      }}>{children}</button>
  );
}

function Input({ label, value, onChange, type="text", placeholder="", required=false, style:sx={} }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, ...sx }}>
      {label && <label style={{ fontSize:12, color:C.sub, fontWeight:500 }}>{label}{required&&<span style={{color:C.red}}> *</span>}</label>}
      <input value={value} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder}
        style={{
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
          padding:"8px 11px", color:C.text, fontSize:13, fontFamily:"inherit",
          outline:"none", width:"100%", boxSizing:"border-box",
          transition:"border-color 0.14s, box-shadow 0.14s",
        }}
        onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
        onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, style:sx={} }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, ...sx }}>
      {label && <label style={{ fontSize:12, color:C.sub, fontWeight:500 }}>{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
          padding:"8px 11px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none",
        }}>
        {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
    </div>
  );
}

function Modal({ title, onClose, children, wide=false }) {
  return (
    <div style={{
      position:"fixed", inset:0,
      background:"rgba(0,0,0,0.35)",
      backdropFilter:"blur(3px)",
      WebkitBackdropFilter:"blur(3px)",
      zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:C.card, border:`1px solid ${C.borderStrong}`, borderRadius:12,
        padding:"28px 32px", width:"100%", maxWidth:wide?780:500,
        maxHeight:"90vh", overflowY:"auto",
        boxShadow:"0 20px 48px rgba(0,0,0,0.18)",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontSize:16, fontWeight:600, fontFamily:"'Syne',sans-serif", color:C.text }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.sub, cursor:"pointer", display:"flex", alignItems:"center", padding:4, borderRadius:4 }}
            onMouseEnter={e=>e.currentTarget.style.color=C.text}
            onMouseLeave={e=>e.currentTarget.style.color=C.sub}>
            <Icon name="close" size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  const c = type==="error"?C.red:type==="warn"?C.gold:C.green;
  return (
    <div style={{
      position:"fixed", top:20, right:20, zIndex:500,
      background:c, color:"#fff", borderRadius:8,
      padding:"11px 18px", fontSize:13, fontWeight:500,
      boxShadow:`0 4px 16px ${c}44`, maxWidth:320,
      animation:"slideIn 0.22s ease",
    }}>{msg}</div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 24px", color:C.sub }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:4 }}>{title}</div>
      <div style={{ fontSize:13, color:C.sub }}>{sub}</div>
    </div>
  );
}

function KpiCard({ label, value, sub, color=C.accent }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderTop: `3px solid ${color}`,
      borderRadius: 8,
      padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <div style={{ fontSize:11, color:C.sub, fontWeight:500, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:700, color:C.text, fontFamily:"'Syne',sans-serif", lineHeight:1.1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:C.sub, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════ */
function TabDashboard({ data }) {
  const { processos, atas, contratos, cotacoes } = data;
  const vencendo = contratos.filter(c => {
    const d = diasParaVencer(c.fim);
    return d !== null && d >= 0 && d <= 30 && c.status !== "Encerrado";
  });
  const valorContratos = contratos.filter(c=>c.status==="Vigente").reduce((a,c)=>a+c.valor,0);
  const atasVigentes = atas.filter(a => diasParaVencer(a.vigencia) > 0).length;

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:12, marginBottom:24 }}>
        <KpiCard label="Processos Ativos" value={processos.filter(p=>p.fase!=="Encerrado").length} sub={`${processos.length} total`} color={C.accent} />
        <KpiCard label="Atas Vigentes" value={atasVigentes} sub="Registro de Preços" color={C.accent2} />
        <KpiCard label="Contratos Vigentes" value={contratos.filter(c=>c.status==="Vigente").length} sub={fmtBRL(valorContratos)} color={C.green} />
        <KpiCard label="Cotações" value={cotacoes.length} sub="Pesquisas de preço" color={C.gold} />
        <KpiCard label="A Vencer (30d)" value={vencendo.length} sub="Contratos" color={vencendo.length>0?C.red:C.green} />
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:20, marginBottom:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize:11, fontWeight:600, color:C.sub, marginBottom:14, textTransform:"uppercase", letterSpacing:"0.06em" }}>Processos Recentes</div>
        {processos.slice(0,4).map(p=>(
          <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.numero} — {p.objeto}</div>
              <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>{p.modalidade} · {p.orgao}</div>
            </div>
            <Badge label={p.fase} />
            <div style={{ fontSize:13, fontWeight:600, color:C.accent, minWidth:80, textAlign:"right" }}>{fmtBRL(p.valor)}</div>
          </div>
        ))}
      </div>

      {vencendo.length > 0 && (
        <div style={{ background:"rgba(220,38,38,0.05)", border:`1px solid rgba(220,38,38,0.18)`, borderRadius:8, padding:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:600, color:C.red, marginBottom:12 }}>
            <Icon name="warning" size={14} color={C.red} /> Contratos a vencer em 30 dias
          </div>
          {vencendo.map(c=>(
            <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid rgba(220,38,38,0.10)`, flexWrap:"wrap", gap:8 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{c.numero} — {c.objeto}</div>
                <div style={{ fontSize:12, color:C.sub }}>{c.fornecedor}</div>
              </div>
              <div style={{ fontSize:13, color:C.red, fontWeight:600 }}>Vence em {diasParaVencer(c.fim)}d · {fmtDate(c.fim)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PROCESSOS
══════════════════════════════════════════════════════════════ */
function TabProcessos({ processos, setProcessos, toast }) {
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroFase, setFiltroFase] = useState("Todos");
  const [form, setForm] = useState({ numero:"", objeto:"", modalidade:"Pregão Eletrônico", fase:"Planejamento", valor:"", abertura:"", orgao:"" });

  const fases = ["Todos","Planejamento","Publicado","Em andamento","Homologado","Revogado","Suspenso"];
  const modalidades = ["Pregão Eletrônico","Pregão Presencial","Concorrência","Concurso","Leilão","Diálogo Competitivo","Dispensa","Inexigibilidade"];

  const filtered = processos.filter(p => {
    const ok = filtroFase==="Todos" || p.fase===filtroFase;
    const s = search.toLowerCase();
    return ok && (p.numero.toLowerCase().includes(s) || p.objeto.toLowerCase().includes(s) || p.orgao.toLowerCase().includes(s));
  });

  const salvar = () => {
    if (!form.numero||!form.objeto) { toast("Número e objeto são obrigatórios","error"); return; }
    setProcessos(prev=>[{ id:uid(), ...form, valor:parseFloat(form.valor)||0 }, ...prev]);
    setModal(false);
    setForm({ numero:"", objeto:"", modalidade:"Pregão Eletrônico", fase:"Planejamento", valor:"", abertura:"", orgao:"" });
    toast("Processo cadastrado com sucesso!");
  };

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar processo..."
          style={{ flex:1, minWidth:150, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none", transition:"border-color 0.14s, box-shadow 0.14s" }}
          onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
          onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
        <Select value={filtroFase} onChange={setFiltroFase} options={fases} />
        <Btn onClick={()=>setModal(true)}>+ Novo Processo</Btn>
      </div>

      {filtered.length===0 ? <EmptyState icon="📋" title="Nenhum processo encontrado" sub="Cadastre um novo processo para começar" /> : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          {filtered.map((p,i)=>(
            <div key={p.id} style={{ padding:"14px 18px", borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none", transition:"background 0.12s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.overlay}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:14, fontWeight:700, color:C.accent, fontFamily:"'Syne',sans-serif" }}>{p.numero}</span>
                    <Badge label={p.fase} />
                  </div>
                  <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:3 }}>{p.objeto}</div>
                  <div style={{ fontSize:12, color:C.sub }}>{p.modalidade} · {p.orgao} · Abertura: {fmtDate(p.abertura)}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:16, fontWeight:700, color:C.text }}>{fmtBRL(p.valor)}</div>
                  <div style={{ fontSize:11, color:C.sub, marginTop:1 }}>Valor estimado</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title="Novo Processo Licitatório" onClose={()=>setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Número" value={form.numero} onChange={v=>setForm(f=>({...f,numero:v}))} placeholder="001/2025" required />
              <Select label="Modalidade" value={form.modalidade} onChange={v=>setForm(f=>({...f,modalidade:v}))} options={modalidades} />
            </div>
            <Input label="Objeto" value={form.objeto} onChange={v=>setForm(f=>({...f,objeto:v}))} placeholder="Descreva o objeto da licitação" required />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Órgão/Setor" value={form.orgao} onChange={v=>setForm(f=>({...f,orgao:v}))} placeholder="Secretaria..." />
              <Select label="Fase" value={form.fase} onChange={v=>setForm(f=>({...f,fase:v}))} options={["Planejamento","Publicado","Em andamento","Homologado","Revogado","Suspenso"]} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Valor Estimado (R$)" value={form.valor} onChange={v=>setForm(f=>({...f,valor:v}))} type="number" placeholder="0,00" />
              <Input label="Data de Abertura" value={form.abertura} onChange={v=>setForm(f=>({...f,abertura:v}))} type="date" />
            </div>
            <div style={{ display:"flex", gap:10, marginTop:8, justifyContent:"flex-end" }}>
              <Btn variant="outline" onClick={()=>setModal(false)} color={C.sub}>Cancelar</Btn>
              <Btn onClick={salvar}>Salvar Processo</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ATAS
══════════════════════════════════════════════════════════════ */
function TabAtas({ atas, setAtas, toast }) {
  const [modal, setModal] = useState(false);
  const [ataAtiva, setAtaAtiva] = useState(null);
  const [form, setForm] = useState({ numero:"", objeto:"", fornecedor:"", cnpj:"", vigencia:"", valorTotal:"" });

  const salvar = () => {
    if (!form.numero||!form.objeto||!form.fornecedor) { toast("Preencha os campos obrigatórios","error"); return; }
    setAtas(prev=>[{ id:uid(), ...form, valorTotal:parseFloat(form.valorTotal)||0, saldoDisponivel:parseFloat(form.valorTotal)||0, itens:[] }, ...prev]);
    setModal(false);
    setForm({ numero:"", objeto:"", fornecedor:"", cnpj:"", vigencia:"", valorTotal:"" });
    toast("Ata registrada com sucesso!");
  };

  if (ataAtiva) {
    const ata = atas.find(a=>a.id===ataAtiva);
    if (!ata) { setAtaAtiva(null); return null; }
    const pctUsado = ((ata.valorTotal - ata.saldoDisponivel)/ata.valorTotal*100).toFixed(1);
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <Btn variant="outline" onClick={()=>setAtaAtiva(null)} color={C.sub} size="sm">← Voltar</Btn>
          <div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Syne',sans-serif", color:C.text }}>{ata.numero}</div>
            <div style={{ fontSize:12, color:C.sub }}>{ata.objeto}</div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:12, marginBottom:18 }}>
          <KpiCard label="Fornecedor" value={ata.fornecedor.split(" ").slice(0,2).join(" ")} color={C.accent} />
          <KpiCard label="Valor Total" value={fmtBRL(ata.valorTotal)} color={C.accent2} />
          <KpiCard label="Saldo" value={fmtBRL(ata.saldoDisponivel)} sub={`${(100-parseFloat(pctUsado)).toFixed(1)}% disponível`} color={C.green} />
          <KpiCard label="Vigência" value={fmtDate(ata.vigencia)} sub={`${diasParaVencer(ata.vigencia)} dias`} color={diasParaVencer(ata.vigencia)<30?C.red:C.amber} />
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:16, marginBottom:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:500, color:C.text }}>Utilização da Ata</span>
            <span style={{ fontSize:13, color:C.accent, fontWeight:600 }}>{pctUsado}% utilizado</span>
          </div>
          <div style={{ background:C.subtle, borderRadius:4, height:6, overflow:"hidden" }}>
            <div style={{ width:`${pctUsado}%`, height:"100%", background:C.accent, borderRadius:4, transition:"width 0.6s" }} />
          </div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ padding:"13px 18px", borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:600, color:C.text }}>Itens da Ata</div>
          {(!ata.itens?.length) ? <EmptyState icon="📦" title="Sem itens cadastrados" sub="" /> : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
                <thead>
                  <tr style={{ background:C.overlay }}>
                    {["Descrição","Unidade","Qtd Reg.","Qtd Util.","Vlr Unit.","Saldo"].map(h=>(
                      <th key={h} style={{ padding:"9px 16px", fontSize:11, color:C.sub, fontWeight:600, textAlign:"left", whiteSpace:"nowrap", textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ata.itens.map((it,i)=>{
                    const saldo = it.qtdRegistrada - it.qtdUtilizada;
                    const pct = (it.qtdUtilizada/it.qtdRegistrada*100).toFixed(0);
                    return (
                      <tr key={it.id} style={{ borderBottom:`1px solid ${C.border}`, transition:"background 0.1s" }}
                        onMouseEnter={e=>e.currentTarget.style.background=C.overlay}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"11px 16px", fontSize:13, fontWeight:500, color:C.text }}>{it.descricao}</td>
                        <td style={{ padding:"11px 16px", fontSize:12, color:C.sub }}>{it.unidade}</td>
                        <td style={{ padding:"11px 16px", fontSize:13, color:C.text }}>{it.qtdRegistrada.toLocaleString("pt-BR")}</td>
                        <td style={{ padding:"11px 16px", fontSize:13, color:C.gold }}>{it.qtdUtilizada.toLocaleString("pt-BR")} <span style={{fontSize:11,color:C.sub}}>({pct}%)</span></td>
                        <td style={{ padding:"11px 16px", fontSize:13, color:C.accent2, fontWeight:500 }}>{fmtBRL(it.valorUnit)}</td>
                        <td style={{ padding:"11px 16px", fontSize:13, color:saldo<it.qtdRegistrada*0.1?C.red:C.green, fontWeight:600 }}>{saldo.toLocaleString("pt-BR")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <Btn onClick={()=>setModal(true)} color={C.accent2}>+ Nova Ata de RP</Btn>
      </div>
      {atas.length===0 ? <EmptyState icon="📜" title="Nenhuma Ata cadastrada" sub="Registre uma Ata de Registro de Preços" /> : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          {atas.map((a,i)=>{
            const d = diasParaVencer(a.vigencia);
            const pct = ((a.valorTotal-a.saldoDisponivel)/a.valorTotal*100).toFixed(0);
            return (
              <div key={a.id} onClick={()=>setAtaAtiva(a.id)}
                style={{ padding:"14px 18px", borderBottom:i<atas.length-1?`1px solid ${C.border}`:"none", cursor:"pointer", transition:"background 0.12s" }}
                onMouseEnter={e=>e.currentTarget.style.background=C.overlay}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ fontSize:14, fontWeight:700, color:C.accent2, fontFamily:"'Syne',sans-serif" }}>{a.numero}</span>
                      <Badge label={d>0?"Vigente":d===0?"Vence hoje":"Vencida"} />
                    </div>
                    <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:3 }}>{a.objeto}</div>
                    <div style={{ fontSize:12, color:C.sub }}>{a.fornecedor} · CNPJ {a.cnpj} · Vigência: {fmtDate(a.vigencia)}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:16, fontWeight:700, color:C.green }}>{fmtBRL(a.saldoDisponivel)}</div>
                    <div style={{ fontSize:11, color:C.sub }}>saldo disponível</div>
                    <div style={{ fontSize:11, color:C.gold, marginTop:1 }}>{pct}% utilizado</div>
                  </div>
                </div>
                <div style={{ marginTop:10, background:C.subtle, borderRadius:3, height:3, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:C.accent2 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {modal && (
        <Modal title="Nova Ata de Registro de Preços" onClose={()=>setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Número da Ata" value={form.numero} onChange={v=>setForm(f=>({...f,numero:v}))} placeholder="ARP 001/2025" required />
              <Input label="Vigência" value={form.vigencia} onChange={v=>setForm(f=>({...f,vigencia:v}))} type="date" />
            </div>
            <Input label="Objeto" value={form.objeto} onChange={v=>setForm(f=>({...f,objeto:v}))} placeholder="Objeto do registro de preços" required />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Fornecedor" value={form.fornecedor} onChange={v=>setForm(f=>({...f,fornecedor:v}))} placeholder="Razão social" required />
              <Input label="CNPJ" value={form.cnpj} onChange={v=>setForm(f=>({...f,cnpj:v}))} placeholder="00.000.000/0001-00" />
            </div>
            <Input label="Valor Total da Ata (R$)" value={form.valorTotal} onChange={v=>setForm(f=>({...f,valorTotal:v}))} type="number" placeholder="0,00" />
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="outline" onClick={()=>setModal(false)} color={C.sub}>Cancelar</Btn>
              <Btn onClick={salvar} color={C.accent2}>Salvar Ata</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CONTRATOS
══════════════════════════════════════════════════════════════ */
function TabContratos({ contratos, setContratos, toast }) {
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [form, setForm] = useState({ numero:"", objeto:"", fornecedor:"", cnpj:"", valor:"", inicio:"", fim:"", processo:"" });

  const filtered = contratos.filter(c=>{
    const ok = filtro==="Todos" || c.status===filtro;
    const s = search.toLowerCase();
    return ok && (c.numero.toLowerCase().includes(s)||c.objeto.toLowerCase().includes(s)||c.fornecedor.toLowerCase().includes(s));
  }).map(c=>{
    const d = diasParaVencer(c.fim);
    let status = c.status;
    if (d !== null && c.status !== "Encerrado") {
      if (d < 0) status = "Vencido";
      else if (d <= 30) status = "A vencer";
      else status = "Vigente";
    }
    return { ...c, status, diasRestantes: d };
  });

  const salvar = () => {
    if (!form.numero||!form.objeto||!form.fornecedor) { toast("Preencha os campos obrigatórios","error"); return; }
    setContratos(prev=>[{ id:uid(), ...form, valor:parseFloat(form.valor)||0, status:"Vigente" }, ...prev]);
    setModal(false);
    setForm({ numero:"", objeto:"", fornecedor:"", cnpj:"", valor:"", inicio:"", fim:"", processo:"" });
    toast("Contrato cadastrado!");
  };

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar contrato..."
          style={{ flex:1, minWidth:150, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none", transition:"border-color 0.14s, box-shadow 0.14s" }}
          onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
          onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
        <Select value={filtro} onChange={setFiltro} options={["Todos","Vigente","A vencer","Encerrado","Vencido"]} />
        <Btn onClick={()=>setModal(true)} color={C.green}>+ Novo Contrato</Btn>
      </div>

      {filtered.length===0 ? <EmptyState icon="📄" title="Nenhum contrato encontrado" sub="Cadastre contratos para acompanhar sua vigência" /> : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          {filtered.map((c,i)=>(
            <div key={c.id} style={{ padding:"14px 18px", borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none", borderLeft:`3px solid ${c.status==="A vencer"?C.gold:c.status==="Vencido"?C.red:c.status==="Vigente"?C.green:"transparent"}`, transition:"background 0.12s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.overlay}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:"'Syne',sans-serif" }}>{c.numero}</span>
                    <Badge label={c.status} />
                    {c.processo && <span style={{ fontSize:12, color:C.sub }}>Proc. {c.processo}</span>}
                  </div>
                  <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:3 }}>{c.objeto}</div>
                  <div style={{ fontSize:12, color:C.sub }}>{c.fornecedor} · CNPJ {c.cnpj}</div>
                  <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>
                    {fmtDate(c.inicio)} → {fmtDate(c.fim)}
                    {c.diasRestantes !== null && c.status !== "Encerrado" && (
                      <span style={{ marginLeft:8, color:c.status==="A vencer"?C.gold:c.status==="Vencido"?C.red:C.green, fontWeight:600 }}>
                        {c.diasRestantes < 0 ? `Venceu há ${Math.abs(c.diasRestantes)}d` : `${c.diasRestantes}d restantes`}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:16, fontWeight:700, color:C.text }}>{fmtBRL(c.valor)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title="Novo Contrato" onClose={()=>setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Número do Contrato" value={form.numero} onChange={v=>setForm(f=>({...f,numero:v}))} placeholder="CT 001/2025" required />
              <Input label="Processo (opcional)" value={form.processo} onChange={v=>setForm(f=>({...f,processo:v}))} placeholder="001/2025" />
            </div>
            <Input label="Objeto" value={form.objeto} onChange={v=>setForm(f=>({...f,objeto:v}))} required />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Fornecedor" value={form.fornecedor} onChange={v=>setForm(f=>({...f,fornecedor:v}))} required />
              <Input label="CNPJ" value={form.cnpj} onChange={v=>setForm(f=>({...f,cnpj:v}))} placeholder="00.000.000/0001-00" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <Input label="Valor (R$)" value={form.valor} onChange={v=>setForm(f=>({...f,valor:v}))} type="number" />
              <Input label="Início" value={form.inicio} onChange={v=>setForm(f=>({...f,inicio:v}))} type="date" />
              <Input label="Fim" value={form.fim} onChange={v=>setForm(f=>({...f,fim:v}))} type="date" />
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="outline" onClick={()=>setModal(false)} color={C.sub}>Cancelar</Btn>
              <Btn onClick={salvar} color={C.green}>Salvar Contrato</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COTAÇÕES
══════════════════════════════════════════════════════════════ */
function TabCotacoes({ cotacoes, setCotacoes, toast }) {
  const [modal, setModal] = useState(null);
  const [cotAtiva, setCotAtiva] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ numero:"", objeto:"", processo:"" });
  const [fornecedores, setFornecedores] = useState([{ id:"f1",razao:"",cnpj:"" },{ id:"f2",razao:"",cnpj:"" },{ id:"f3",razao:"",cnpj:"" }]);
  const [itens, setItens] = useState([{ id:"it1", descricao:"", unidade:"", qtd:"", valores:{} }]);

  const addFornecedor = () => setFornecedores(p=>[...p,{ id:uid(), razao:"", cnpj:"" }]);
  const remFornecedor = id => setFornecedores(p=>p.filter(f=>f.id!==id));
  const updForn = (id,field,val) => setFornecedores(p=>p.map(f=>f.id===id?{...f,[field]:val}:f));
  const addItem = () => setItens(p=>[...p,{ id:uid(), descricao:"", unidade:"", qtd:"", valores:{} }]);
  const remItem = id => setItens(p=>p.filter(i=>i.id!==id));
  const updItem = (id,field,val) => setItens(p=>p.map(i=>i.id===id?{...i,[field]:val}:i));
  const updValor = (itemId,fornId,val) => setItens(p=>p.map(i=>i.id===itemId?{...i,valores:{...i.valores,[fornId]:parseFloat(val)||0}}:i));

  const resetForm = () => {
    setForm({ numero:"", objeto:"", processo:"" });
    setFornecedores([{ id:"f1",razao:"",cnpj:"" },{ id:"f2",razao:"",cnpj:"" },{ id:"f3",razao:"",cnpj:"" }]);
    setItens([{ id:"it1",descricao:"",unidade:"",qtd:"",valores:{} }]);
    setStep(1);
  };

  const salvarCotacao = () => {
    if (!form.numero||!form.objeto) { toast("Número e objeto são obrigatórios","error"); return; }
    const fornsValidos = fornecedores.filter(f=>f.razao.trim());
    if (fornsValidos.length < 2) { toast("Informe ao menos 2 fornecedores (Lei 14.133)","error"); return; }
    const itensValidos = itens.filter(i=>i.descricao.trim());
    if (!itensValidos.length) { toast("Adicione ao menos 1 item","error"); return; }
    setCotacoes(p=>[{ id:uid(), ...form, status:"Finalizada", dataCriacao:hoje(), fornecedores:fornsValidos, itens:itensValidos },...p]);
    setModal(null); resetForm();
    toast("Cotação finalizada — mapa de preços gerado!");
  };

  if (cotAtiva) {
    const cot = cotacoes.find(c=>c.id===cotAtiva);
    if (!cot) { setCotAtiva(null); return null; }
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <Btn variant="outline" onClick={()=>setCotAtiva(null)} color={C.sub} size="sm">← Voltar</Btn>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Syne',sans-serif", color:C.text }}>{cot.numero}</div>
            <div style={{ fontSize:12, color:C.sub }}>{cot.objeto} · {fmtDate(cot.dataCriacao)}</div>
          </div>
          <Badge label={cot.status} />
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:16, marginBottom:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.sub, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>Fornecedores Consultados</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {cot.fornecedores.map((f,i)=>(
              <div key={f.id} style={{ background:C.overlay, border:`1px solid ${C.border}`, borderRadius:6, padding:"10px 14px", flex:1, minWidth:140 }}>
                <div style={{ fontSize:11, color:C.accent, fontWeight:600, marginBottom:2, textTransform:"uppercase", letterSpacing:"0.04em" }}>Fornecedor {i+1}</div>
                <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{f.razao}</div>
                <div style={{ fontSize:12, color:C.sub }}>{f.cnpj}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", marginBottom:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ padding:"13px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:13, fontWeight:600, color:C.text }}>Mapa de Preços</span>
            <span style={{ fontSize:12, color:C.sub }}>Mediana conforme Lei 14.133/2021</span>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
              <thead>
                <tr style={{ background:C.overlay }}>
                  <th style={{ padding:"9px 16px", fontSize:11, color:C.sub, fontWeight:600, textAlign:"left", textTransform:"uppercase", letterSpacing:"0.05em" }}>Item</th>
                  <th style={{ padding:"9px 16px", fontSize:11, color:C.sub, fontWeight:600, textAlign:"center", textTransform:"uppercase", letterSpacing:"0.05em" }}>Un.</th>
                  <th style={{ padding:"9px 16px", fontSize:11, color:C.sub, fontWeight:600, textAlign:"center", textTransform:"uppercase", letterSpacing:"0.05em" }}>Qtd</th>
                  {cot.fornecedores.map((f,i)=>(
                    <th key={f.id} style={{ padding:"9px 16px", fontSize:11, color:C.accent, fontWeight:600, textAlign:"right", textTransform:"uppercase", letterSpacing:"0.05em" }}>F{i+1}</th>
                  ))}
                  <th style={{ padding:"9px 16px", fontSize:11, color:C.gold, fontWeight:700, textAlign:"right", background:"rgba(180,83,9,0.05)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Mediana</th>
                  <th style={{ padding:"9px 16px", fontSize:11, color:C.accent2, fontWeight:700, textAlign:"right", textTransform:"uppercase", letterSpacing:"0.05em" }}>Total Ref.</th>
                </tr>
              </thead>
              <tbody>
                {cot.itens.map((it,i)=>{
                  const vals = cot.fornecedores.map(f=>it.valores[f.id]||0).filter(v=>v>0);
                  const mediana = calcMediana(vals);
                  const qtd = parseFloat(it.qtd)||0;
                  return (
                    <tr key={it.id} style={{ borderBottom:`1px solid ${C.border}`, transition:"background 0.1s" }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.overlay}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"11px 16px", fontSize:13, fontWeight:500, color:C.text }}>{it.descricao}</td>
                      <td style={{ padding:"11px 16px", fontSize:12, color:C.sub, textAlign:"center" }}>{it.unidade}</td>
                      <td style={{ padding:"11px 16px", fontSize:13, textAlign:"center", color:C.text }}>{qtd.toLocaleString("pt-BR")}</td>
                      {cot.fornecedores.map(f=>{
                        const v = it.valores[f.id]||0;
                        const isMin = v>0 && v===Math.min(...vals);
                        return (
                          <td key={f.id} style={{ padding:"11px 16px", fontSize:13, textAlign:"right", color:isMin?C.green:C.text, fontWeight:isMin?600:400 }}>
                            {v>0?fmtBRL(v):<span style={{color:C.tertiary}}>—</span>}
                          </td>
                        );
                      })}
                      <td style={{ padding:"11px 16px", fontSize:13, fontWeight:700, color:C.gold, textAlign:"right", background:"rgba(180,83,9,0.04)" }}>{fmtBRL(mediana)}</td>
                      <td style={{ padding:"11px 16px", fontSize:13, fontWeight:600, color:C.accent2, textAlign:"right" }}>{fmtBRL(mediana*qtd)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:C.accentSubtle, borderTop:`2px solid ${C.accentBorder}` }}>
                  <td colSpan={3+cot.fornecedores.length} style={{ padding:"11px 16px", fontSize:12, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"0.04em" }}>
                    Valor Total de Referência
                  </td>
                  <td style={{ padding:"11px 16px", fontSize:15, fontWeight:700, color:C.accent2, textAlign:"right" }}>
                    {fmtBRL(cot.itens.reduce((acc,it)=>{
                      const vals = cot.fornecedores.map(f=>it.valores[f.id]||0).filter(v=>v>0);
                      return acc + calcMediana(vals)*(parseFloat(it.qtd)||0);
                    },0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"center" }}>
          <Btn color={C.sub} variant="outline" onClick={()=>window.print()}>Imprimir Mapa de Preços</Btn>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <Btn onClick={()=>{ resetForm(); setModal("nova"); }} color={C.accent}>+ Nova Pesquisa de Preços</Btn>
      </div>

      {cotacoes.length===0 ? <EmptyState icon="💰" title="Nenhuma cotação cadastrada" sub="Crie uma pesquisa de preços conforme Lei 14.133/2021" /> : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          {cotacoes.map((c,i)=>(
            <div key={c.id} onClick={()=>setCotAtiva(c.id)}
              style={{ padding:"14px 18px", borderBottom:i<cotacoes.length-1?`1px solid ${C.border}`:"none", cursor:"pointer", transition:"background 0.12s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.overlay}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                <div>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:"'Syne',sans-serif" }}>{c.numero}</span>
                    <Badge label={c.status} />
                  </div>
                  <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:3 }}>{c.objeto}</div>
                  <div style={{ fontSize:12, color:C.sub }}>
                    {c.fornecedores.length} fornecedores · {c.itens.length} itens · {fmtDate(c.dataCriacao)}
                    {c.processo && ` · Proc. ${c.processo}`}
                  </div>
                </div>
                <div style={{ fontSize:12, color:C.accent, fontWeight:500, alignSelf:"center" }}>Ver mapa →</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal==="nova" && (
        <Modal title={`Nova Pesquisa de Preços — Etapa ${step}/3`} onClose={()=>setModal(null)} wide>
          <div style={{ display:"flex", marginBottom:20, borderBottom:`1px solid ${C.border}`, paddingBottom:16 }}>
            {["Identificação","Fornecedores","Itens e Preços"].map((s,i)=>(
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{
                  width:26, height:26, borderRadius:13,
                  background:step>i+1?C.green:step===i+1?C.accent:C.subtle,
                  border:`2px solid ${step>i+1?C.green:step===i+1?C.accent:C.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, fontWeight:700, color:step>=i+1?"#fff":C.sub, transition:"all 0.2s",
                }}>{step>i+1?"✓":i+1}</div>
                <span style={{ fontSize:11, color:step===i+1?C.accent:C.sub, fontWeight:step===i+1?600:400 }}>{s}</span>
              </div>
            ))}
          </div>

          {step===1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Input label="Número da Cotação" value={form.numero} onChange={v=>setForm(f=>({...f,numero:v}))} placeholder="COT 001/2025" required />
                <Input label="Processo vinculado (opcional)" value={form.processo} onChange={v=>setForm(f=>({...f,processo:v}))} placeholder="001/2025" />
              </div>
              <Input label="Objeto da pesquisa de preços" value={form.objeto} onChange={v=>setForm(f=>({...f,objeto:v}))} placeholder="Descreva o objeto" required />
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
                <Btn onClick={()=>{ if(!form.numero||!form.objeto){toast("Preencha os campos","error");return;} setStep(2); }}>Próximo →</Btn>
              </div>
            </div>
          )}

          {step===2 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ fontSize:12, color:C.accent, background:C.accentSubtle, borderRadius:6, padding:"8px 12px", border:`1px solid ${C.accentBorder}` }}>
                Lei 14.133/2021 recomenda no mínimo 3 fornecedores para pesquisa de preços.
              </div>
              {fornecedores.map((f,i)=>(
                <div key={f.id} style={{ background:C.overlay, borderRadius:6, padding:12, display:"flex", gap:10, alignItems:"flex-end", border:`1px solid ${C.border}` }}>
                  <div style={{ width:24, height:24, borderRadius:4, background:C.accentSubtle, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:C.accent, flexShrink:0 }}>{i+1}</div>
                  <Input style={{flex:2}} label={i===0?"Razão Social":""} value={f.razao} onChange={v=>updForn(f.id,"razao",v)} placeholder="Razão social / nome" />
                  <Input style={{flex:1}} label={i===0?"CNPJ/CPF":""} value={f.cnpj} onChange={v=>updForn(f.id,"cnpj",v)} placeholder="00.000.000/0001" />
                  {fornecedores.length>2 && <Btn variant="outline" color={C.red} size="sm" onClick={()=>remFornecedor(f.id)}>✕</Btn>}
                </div>
              ))}
              <Btn variant="outline" color={C.accent} size="sm" onClick={addFornecedor}>+ Adicionar Fornecedor</Btn>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                <Btn variant="outline" color={C.sub} onClick={()=>setStep(1)}>← Anterior</Btn>
                <Btn onClick={()=>{ const v=fornecedores.filter(f=>f.razao.trim()); if(v.length<2){toast("Mínimo 2 fornecedores","error");return;} setStep(3); }}>Próximo →</Btn>
              </div>
            </div>
          )}

          {step===3 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {itens.map((it,i)=>(
                <div key={it.id} style={{ background:C.overlay, borderRadius:6, padding:14, border:`1px solid ${C.border}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:C.sub, background:C.subtle, padding:"2px 8px", borderRadius:4, textTransform:"uppercase", letterSpacing:"0.04em" }}>Item {i+1}</span>
                    {itens.length>1 && <Btn variant="outline" color={C.red} size="sm" onClick={()=>remItem(it.id)}>✕</Btn>}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10, marginBottom:10 }}>
                    <Input label="Descrição" value={it.descricao} onChange={v=>updItem(it.id,"descricao",v)} placeholder="Descrição completa" />
                    <Input label="Unidade" value={it.unidade} onChange={v=>updItem(it.id,"unidade",v)} placeholder="Un, Kg, L..." />
                    <Input label="Quantidade" value={it.qtd} onChange={v=>updItem(it.id,"qtd",v)} type="number" placeholder="0" />
                  </div>
                  <div style={{ fontSize:12, color:C.sub, marginBottom:6, fontWeight:500 }}>Preços por fornecedor:</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:8 }}>
                    {fornecedores.filter(f=>f.razao.trim()).map((f,fi)=>(
                      <Input key={f.id} label={`F${fi+1}: ${f.razao.split(" ")[0]}`}
                        value={it.valores[f.id]||""} onChange={v=>updValor(it.id,f.id,v)} type="number" placeholder="0,00" />
                    ))}
                  </div>
                  {(() => {
                    const vals = fornecedores.filter(f=>f.razao.trim()).map(f=>parseFloat(it.valores[f.id])||0).filter(v=>v>0);
                    if (!vals.length) return null;
                    const med = calcMediana(vals);
                    return (
                      <div style={{ marginTop:10, background:C.accentSubtle, borderRadius:6, padding:"6px 12px", display:"flex", gap:12, border:`1px solid ${C.accentBorder}` }}>
                        <span style={{ fontSize:12, color:C.accent, fontWeight:600 }}>Mediana: {fmtBRL(med)}</span>
                        {parseFloat(it.qtd)>0 && <span style={{ fontSize:12, color:C.accent2 }}>Total ref: {fmtBRL(med*parseFloat(it.qtd))}</span>}
                      </div>
                    );
                  })()}
                </div>
              ))}
              <Btn variant="outline" color={C.accent} size="sm" onClick={addItem}>+ Adicionar Item</Btn>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                <Btn variant="outline" color={C.sub} onClick={()=>setStep(2)}>← Anterior</Btn>
                <Btn onClick={salvarCotacao}>✓ Finalizar Pesquisa</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   RELATÓRIOS
══════════════════════════════════════════════════════════════ */
function TabRelatorios({ data }) {
  const { processos, contratos, cotacoes, atas } = data;
  const reports = [
    { icon:"processos",  title:"Processos por Modalidade",   color:C.accent,  desc:"Distribuição e valores por tipo de licitação" },
    { icon:"contratos",  title:"Contratos a Vencer",         color:C.gold,    desc:"Contratos nos próximos 30, 60 e 90 dias" },
    { icon:"atas",       title:"Saldo de Atas de RP",        color:C.accent2, desc:"Utilização e saldo por fornecedor/item" },
    { icon:"cotacoes",   title:"Mapa de Preços Consolidado", color:C.green,   desc:"Medianas por categoria de objeto" },
    { icon:"relatorios", title:"Relatório Gerencial",        color:C.purple,  desc:"Visão geral de todos os processos e contratos" },
  ];
  const byModalidade = processos.reduce((acc,p)=>{ acc[p.modalidade]=(acc[p.modalidade]||0)+1; return acc; },{});

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))", gap:12, marginBottom:24 }}>
        {reports.map(r=>(
          <div key={r.title} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:18, cursor:"pointer", transition:"border-color 0.14s, box-shadow 0.14s", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=r.color; e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.10)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)"; }}
            onClick={()=>window.print()}>
            <div style={{ marginBottom:10, color:r.color }}>
              <Icon name={r.icon} size={20} strokeWidth={1.6} color={r.color} />
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:4 }}>{r.title}</div>
            <div style={{ fontSize:12, color:C.sub, marginBottom:14, lineHeight:1.5 }}>{r.desc}</div>
            <Btn color={r.color} variant="outline" size="sm">Gerar Relatório</Btn>
          </div>
        ))}
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:20, marginBottom:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize:11, fontWeight:600, color:C.sub, marginBottom:16, textTransform:"uppercase", letterSpacing:"0.06em" }}>Processos por Modalidade</div>
        {Object.entries(byModalidade).map(([mod,qtd])=>(
          <div key={mod} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:13, fontWeight:400, color:C.text }}>{mod}</span>
              <span style={{ fontSize:13, color:C.accent, fontWeight:600 }}>{qtd}</span>
            </div>
            <div style={{ background:C.subtle, borderRadius:3, height:5, overflow:"hidden" }}>
              <div style={{ width:`${(qtd/processos.length)*100}%`, height:"100%", background:C.accent, borderRadius:3 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:10 }}>
        <KpiCard label="Valor total contratos" value={fmtBRL(contratos.filter(c=>c.status==="Vigente").reduce((a,c)=>a+c.valor,0))} color={C.green} />
        <KpiCard label="Atas ativas" value={atas.filter(a=>diasParaVencer(a.vigencia)>0).length} color={C.accent2} />
        <KpiCard label="Cotações realizadas" value={cotacoes.length} color={C.gold} />
        <KpiCard label="Processos ativos" value={processos.filter(p=>!["Revogado","Suspenso"].includes(p.fase)).length} color={C.accent} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   IA CLAUDE
══════════════════════════════════════════════════════════════ */
const CLAUDE_SYSTEM = `Você é um assistente especializado em licitações públicas brasileiras, com foco na Lei 14.133/2021 (Nova Lei de Licitações e Contratos Administrativos).

Você auxilia pregoeiros, agentes de contratação, gestores e fiscais de contratos públicos com:
- Interpretação e aplicação da Lei 14.133/2021 e regulamentos
- Modalidades licitatórias: Pregão, Concorrência, Concurso, Leilão, Diálogo Competitivo
- Contratação direta: Dispensa e Inexigibilidade (arts. 74-79)
- Ata de Registro de Preços (ARP) — arts. 82-86
- Pesquisa de preços e elaboração de mapa de preços
- Gestão e fiscalização de contratos administrativos
- Prazos, recursos, impugnações e sanções
- Habilitação jurídica, fiscal, técnica e econômico-financeira
- Planejamento da contratação e estudo técnico preliminar

Responda sempre em português brasileiro, de forma clara, objetiva e juridicamente fundamentada. Cite os artigos e incisos da Lei 14.133/2021 e demais normas quando relevante.`;

function TabClaude({ data }) {
  const [msgs, setMsgs] = useState([{ role:"assistant", content:"Olá. Sou o assistente LicitaGov com IA, especializado na Lei 14.133/2021. Posso responder dúvidas sobre modalidades licitatórias, atas de RP, contratos, pesquisa de preços e muito mais.\n\nVocê também pode anexar imagens para análise. Configure sua chave de API abaixo para começar." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [apiKey, setApiKey] = useState(()=>localStorage.getItem("licitagov_claude_key")||"");
  const [keyDraft, setKeyDraft] = useState("");
  const [showKey, setShowKey] = useState(!localStorage.getItem("licitagov_claude_key"));
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }); },[msgs]);

  const saveKey = () => {
    const k = keyDraft.trim() || apiKey;
    if (!k) return;
    localStorage.setItem("licitagov_claude_key", k);
    setApiKey(k); setKeyDraft(""); setShowKey(false);
  };

  const buildCtx = () => {
    const { processos, atas, contratos, cotacoes } = data;
    return `\n\nContexto atual do sistema LicitaGov do usuário:\n- ${processos.length} processos (${processos.filter(p=>p.fase==="Em andamento").length} em andamento)\n- ${atas.length} atas de registro de preços\n- ${contratos.filter(c=>c.status==="Vigente").length} contratos vigentes\n- ${cotacoes.length} pesquisas de preços realizadas`;
  };

  const send = async () => {
    if ((!input.trim() && !attachments.length) || loading) return;
    if (!apiKey) { setShowKey(true); return; }
    let userContent;
    if (attachments.length > 0) {
      const parts = attachments.map(att => att.type.startsWith("image/") ? { type:"image", source:{ type:"base64", media_type:att.type, data:att.data.split(",")[1] } } : null).filter(Boolean);
      parts.push({ type:"text", text: input.trim() || "Analise o conteúdo do arquivo anexado." });
      userContent = parts;
    } else { userContent = input.trim(); }
    const displayMsg = { role:"user", content: input.trim() || "(arquivo anexado)", attachmentNames: attachments.map(a=>a.name) };
    const apiHistory = [...msgs.filter(m=>typeof m.content==="string"), displayMsg].map(m=>({ role:m.role, content:m.content }));
    apiHistory[apiHistory.length-1].content = userContent;
    setMsgs(prev=>[...prev, displayMsg]);
    setInput(""); setAttachments([]); setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json", "anthropic-dangerous-allow-browser": "true" },
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:2048, system:CLAUDE_SYSTEM+buildCtx(), messages:apiHistory }),
      });
      if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.error?.message || `Erro HTTP ${res.status}`); }
      const json = await res.json();
      setMsgs(prev=>[...prev, { role:"assistant", content:json.content?.[0]?.text || "Sem resposta." }]);
    } catch(err) {
      setMsgs(prev=>[...prev, { role:"assistant", content:`Erro: ${err.message}\n\nVerifique sua chave de API em console.anthropic.com` }]);
    } finally { setLoading(false); }
  };

  const handleFile = (e) => {
    Array.from(e.target.files).forEach(file => {
      if (file.size > 5*1024*1024) return;
      const reader = new FileReader();
      reader.onload = ev => setAttachments(prev=>[...prev,{ id:uid(), name:file.name, type:file.type, data:ev.target.result }]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const SUGGESTIONS = [
    "Quais são as modalidades de licitação da Lei 14.133?",
    "Como calcular a mediana para pesquisa de preços?",
    "Qual o prazo mínimo para publicação de um pregão?",
    "Quando posso usar dispensa de licitação?",
    "O que é Ata de Registro de Preços?",
  ];

  const MsgBubble = ({ m }) => (
    <div style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", gap:8, alignItems:"flex-start" }}>
      {m.role==="assistant" && (
        <div style={{ width:28, height:28, borderRadius:6, flexShrink:0, marginTop:2, background:C.accentSubtle, display:"flex", alignItems:"center", justifyContent:"center", color:C.accent }}>
          <Icon name="claude" size={13} strokeWidth={1.6} />
        </div>
      )}
      <div style={{
        maxWidth:"78%", padding:"10px 14px", borderRadius:10,
        background: m.role==="user" ? C.accentSubtle : C.overlay,
        border: `1px solid ${m.role==="user" ? C.accentBorder : C.border}`,
        color: C.text, fontSize:14, lineHeight:1.7,
        whiteSpace:"pre-wrap", wordBreak:"break-word",
        borderBottomRightRadius: m.role==="user" ? 3 : 10,
        borderBottomLeftRadius: m.role==="assistant" ? 3 : 10,
      }}>
        {m.attachmentNames?.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
            {m.attachmentNames.map((name,i)=>(
              <span key={i} style={{ display:"flex", alignItems:"center", gap:4, background:C.accentSubtle, borderRadius:4, padding:"2px 8px", fontSize:11, color:C.accent }}>
                <Icon name="file" size={11} /> {name}
              </span>
            ))}
          </div>
        )}
        {m.content}
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"13px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:600, fontFamily:"'Syne',sans-serif", color:C.text, display:"flex", alignItems:"center", gap:8 }}>
            <Icon name="claude" size={15} color={C.accent} />
            Assistente IA — Lei 14.133/2021
          </div>
          <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>claude-sonnet-4-6 · Suporte a anexos de imagem</div>
        </div>
        <button onClick={()=>setShowKey(s=>!s)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 10px", color:C.sub, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontSize:12, fontFamily:"inherit", transition:"all 0.12s" }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.accent; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.sub; }}>
          <Icon name="key" size={13} /> API Key
        </button>
      </div>

      {showKey && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:16, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.sub, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>Chave de API Claude (Anthropic)</div>
          <div style={{ display:"flex", gap:8 }}>
            <input value={keyDraft||(showKey&&!keyDraft?"":apiKey)} onChange={e=>setKeyDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveKey()}
              type="password" placeholder="sk-ant-api03-..."
              style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 11px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none", transition:"border-color 0.14s, box-shadow 0.14s" }}
              onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
              onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
            <Btn onClick={saveKey} color={C.accent} size="sm">Salvar</Btn>
          </div>
          <div style={{ fontSize:12, color:C.sub, marginTop:8 }}>
            Armazenada no seu navegador. Obtenha em:{" "}
            <a href="https://console.anthropic.com" target="_blank" rel="noopener" style={{color:C.accent}}>console.anthropic.com</a>
          </div>
          {apiKey && <div style={{ fontSize:12, color:C.green, marginTop:4, fontWeight:500 }}>✓ Chave configurada — {apiKey.slice(0,16)}...</div>}
        </div>
      )}

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:16, minHeight:300, maxHeight:460, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        {msgs.map((m,i)=><MsgBubble key={i} m={m} />)}
        {loading && (
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ width:28, height:28, borderRadius:6, background:C.accentSubtle, display:"flex", alignItems:"center", justifyContent:"center", color:C.accent }}>
              <Icon name="claude" size={13} strokeWidth={1.6} />
            </div>
            <div style={{ background:C.overlay, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 14px", color:C.sub, fontSize:13 }}>
              Consultando Lei 14.133/2021<span style={{ display:"inline-block", animation:"dots 1.2s steps(3,end) infinite" }}>...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {msgs.length <= 1 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {SUGGESTIONS.map(s=>(
            <button key={s} onClick={()=>setInput(s)} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 12px", color:C.sub, fontSize:12, cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.accent; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.sub; }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {attachments.map(att=>(
            <div key={att.id} style={{ display:"flex", alignItems:"center", gap:5, background:C.overlay, border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 10px", fontSize:12 }}>
              <Icon name={att.type.startsWith("image/")?"image":"file"} size={12} color={C.accent} />
              <span style={{ color:C.sub, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{att.name}</span>
              <button onClick={()=>setAttachments(p=>p.filter(a=>a.id!==att.id))} style={{ background:"none", border:"none", cursor:"pointer", color:C.tertiary, padding:0, display:"flex" }}>
                <Icon name="close" size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:8 }}>
        <input type="file" ref={fileRef} onChange={handleFile} accept="image/png,image/jpeg,image/gif,image/webp" multiple style={{display:"none"}} />
        <button onClick={()=>fileRef.current?.click()} title="Anexar imagem" style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:7, padding:"0 13px", color:C.sub, cursor:"pointer", display:"flex", alignItems:"center", transition:"all 0.12s", flexShrink:0 }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.accent; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.sub; }}>
          <Icon name="attach" size={16} />
        </button>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); } }}
          placeholder={apiKey ? "Pergunte sobre licitações, Lei 14.133, contratos, RP..." : "Configure sua API Key para começar..."}
          style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:7, padding:"11px 14px", color:C.text, fontSize:14, fontFamily:"inherit", outline:"none", transition:"border-color 0.14s, box-shadow 0.14s" }}
          onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
          onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
        <Btn onClick={send} disabled={loading||(!input.trim()&&!attachments.length)||!apiKey} color={C.accent} style={{ padding:"0 16px", display:"flex", alignItems:"center", gap:5 }}>
          <Icon name="send" size={14} color="#fff" />
        </Btn>
      </div>
      {!apiKey && <div style={{ textAlign:"center", fontSize:12, color:C.tertiary }}>Configure sua chave de API Claude acima para usar o assistente</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   APP ROOT
══════════════════════════════════════════════════════════════ */
const TABS = [
  { id:"dashboard",  icon:"dashboard",  label:"Dashboard",  short:"Início" },
  { id:"processos",  icon:"processos",  label:"Processos",  short:"Proc." },
  { id:"atas",       icon:"atas",       label:"Ata de RP",  short:"Atas" },
  { id:"contratos",  icon:"contratos",  label:"Contratos",  short:"Contr." },
  { id:"cotacoes",   icon:"cotacoes",   label:"Cotações",   short:"Cot." },
  { id:"relatorios", icon:"relatorios", label:"Relatórios", short:"Relat." },
  { id:"claude",     icon:"claude",     label:"IA Claude",  short:"IA" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sideOpen, setSideOpen] = useState(false);
  const [toast, setToast_] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const initial = loadData() || SEED;
  const [processos,  setProcessos_]  = useState(initial.processos);
  const [atas,       setAtas_]       = useState(initial.atas);
  const [contratos,  setContratos_]  = useState(initial.contratos);
  const [cotacoes,   setCotacoes_]   = useState(initial.cotacoes);

  const setProcessos  = useCallback(fn=>{ setProcessos_(p=>{  const n=typeof fn==="function"?fn(p):fn; saveData({processos:n,atas,contratos,cotacoes}); return n; }); },[atas,contratos,cotacoes]);
  const setAtas       = useCallback(fn=>{ setAtas_(p=>{       const n=typeof fn==="function"?fn(p):fn; saveData({processos,atas:n,contratos,cotacoes}); return n; }); },[processos,contratos,cotacoes]);
  const setContratos  = useCallback(fn=>{ setContratos_(p=>{  const n=typeof fn==="function"?fn(p):fn; saveData({processos,atas,contratos:n,cotacoes}); return n; }); },[processos,atas,cotacoes]);
  const setCotacoes   = useCallback(fn=>{ setCotacoes_(p=>{   const n=typeof fn==="function"?fn(p):fn; saveData({processos,atas,contratos,cotacoes:n}); return n; }); },[processos,atas,contratos]);

  const showToast = useCallback((msg, type="success") => {
    setToast_({ msg, type });
    setTimeout(()=>setToast_(null), 3500);
  }, []);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    const h = e => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const data = { processos, atas, contratos, cotacoes };
  const curTab = TABS.find(t=>t.id===tab);

  const NavItem = ({ t }) => {
    const active = tab === t.id;
    return (
      <button onClick={()=>{ setTab(t.id); setSideOpen(false); }}
        onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background=C.overlay; e.currentTarget.style.color=C.text; } }}
        onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.sub; } }}
        style={{
          display:"flex", alignItems:"center", gap:9,
          padding:"9px 12px", borderRadius:6, border:"none",
          borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
          background: active ? C.accentSubtle : "transparent",
          color: active ? C.accent : C.sub,
          fontSize:13, fontWeight: active ? 600 : 400,
          cursor:"pointer", transition:"background 0.12s, color 0.12s",
          textAlign:"left", width:"100%",
        }}>
        <Icon name={t.icon} size={15} strokeWidth={active ? 2 : 1.6} />
        {t.label}
      </button>
    );
  };

  const Sidebar = () => (
    <div style={{ position:"fixed", left:0, top:0, bottom:0, width:220, background:C.overlay, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", zIndex:30 }}>
      <div style={{ padding:"20px 16px 16px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:16, fontWeight:800, fontFamily:"'Syne',sans-serif", letterSpacing:-0.5, color:C.text }}>
          Licita<span style={{color:C.accent}}>Gov</span>
        </div>
        <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>Lei 14.133 / 2021</div>
      </div>
      <nav style={{ flex:1, padding:"8px", display:"flex", flexDirection:"column", gap:1, overflowY:"auto" }}>
        {TABS.map(t=><NavItem key={t.id} t={t} />)}
      </nav>
      {deferredPrompt && (
        <div style={{ padding:"10px 12px", borderTop:`1px solid ${C.border}` }}>
          <button onClick={installPWA} style={{ width:"100%", background:C.accent, border:"none", borderRadius:6, padding:"9px 12px", color:"#fff", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <Icon name="install" size={13} /> Instalar App
          </button>
        </div>
      )}
      <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, color:C.sub, lineHeight:1.6 }}>
          <div style={{ fontWeight:500, color:C.text, marginBottom:1 }}>Prefeitura Municipal</div>
          Módulo de Licitações
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans',sans-serif", color:C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:#f4f5f7;}
        ::-webkit-scrollbar-thumb{background:#ced2d8;border-radius:3px;}
        ::-webkit-scrollbar-thumb:hover{background:#b5bac2;}
        button,input,select,textarea{font-family:inherit;}
        input::placeholder,textarea::placeholder{color:#9ca3af;}
        select option{background:#ffffff;color:#111827;}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
        @keyframes dots{0%,20%{content:'.'} 40%{content:'..'} 60%,100%{content:'...'}}
        @media print{
          .no-print{display:none!important;}
          body{background:#fff!important;color:#000!important;}
        }
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {isMobile && sideOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.40)", zIndex:25, backdropFilter:"blur(2px)", WebkitBackdropFilter:"blur(2px)" }}
          onClick={()=>setSideOpen(false)} />
      )}

      {(!isMobile || sideOpen) && <Sidebar />}

      <div style={{ marginLeft:isMobile?0:220, minHeight:"100vh", display:"flex", flexDirection:"column", paddingBottom:isMobile?70:0 }}>
        <div className="no-print" style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:isMobile?"12px 16px":"14px 28px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:20, boxShadow:"0 1px 0 rgba(0,0,0,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {isMobile && (
              <button onClick={()=>setSideOpen(s=>!s)} style={{ background:"none", border:"none", color:C.sub, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                <Icon name="menu" size={20} />
              </button>
            )}
            {isMobile && (
              <span style={{ fontSize:15, fontWeight:800, fontFamily:"'Syne',sans-serif", color:C.text }}>
                Licita<span style={{color:C.accent}}>Gov</span>
              </span>
            )}
            {!isMobile && (
              <div>
                <div style={{ fontSize:17, fontWeight:700, fontFamily:"'Syne',sans-serif", color:C.text }}>{curTab?.label}</div>
                <div style={{ fontSize:12, color:C.sub, marginTop:1 }}>
                  {new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                </div>
              </div>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {deferredPrompt && isMobile && (
              <button onClick={installPWA} style={{ background:C.accent, border:"none", borderRadius:6, padding:"6px 12px", color:"#fff", fontSize:11, fontWeight:500, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
                <Icon name="install" size={12} /> Instalar
              </button>
            )}
            <div style={{ background:C.overlay, border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 11px", fontSize:12, color:C.sub, fontWeight:400, display:"flex", alignItems:"center", gap:5 }}>
              <Icon name="user" size={13} color={C.tertiary} />
              {isMobile ? "Pregoeiro" : "Pregoeiro Municipal"}
            </div>
          </div>
        </div>

        {isMobile && (
          <div style={{ padding:"12px 16px 0", fontSize:16, fontWeight:700, fontFamily:"'Syne',sans-serif", color:C.text }}>{curTab?.label}</div>
        )}

        <div style={{ flex:1, padding:isMobile?"12px 16px":"24px 28px", maxWidth:1200 }}>
          {tab==="dashboard"  && <TabDashboard data={data} />}
          {tab==="processos"  && <TabProcessos processos={processos} setProcessos={setProcessos} toast={showToast} />}
          {tab==="atas"       && <TabAtas atas={atas} setAtas={setAtas} toast={showToast} />}
          {tab==="contratos"  && <TabContratos contratos={contratos} setContratos={setContratos} toast={showToast} />}
          {tab==="cotacoes"   && <TabCotacoes cotacoes={cotacoes} setCotacoes={setCotacoes} toast={showToast} />}
          {tab==="relatorios" && <TabRelatorios data={data} />}
          {tab==="claude"     && <TabClaude data={data} />}
        </div>
      </div>

      {isMobile && (
        <div className="no-print" style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:20, background:C.surface, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-around", alignItems:"center", padding:"5px 0", paddingBottom:"max(5px, env(safe-area-inset-bottom))" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"5px 8px", border:"none", background: tab===t.id ? C.accentSubtle : "transparent", borderRadius:6, color: tab===t.id ? C.accent : C.sub, fontSize:9, fontWeight: tab===t.id ? 600 : 400, cursor:"pointer", fontFamily:"inherit", minWidth:40, transition:"all 0.12s" }}>
              <Icon name={t.icon} size={18} strokeWidth={tab===t.id ? 2 : 1.6} />
              {t.short}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
