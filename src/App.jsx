import { useState, useCallback, useEffect, useRef, Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error('[LicitaGov] Crash:', e, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight:'100vh', background:'#f5f5f5', color:'#111827', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"'Inter',system-ui,sans-serif", gap:12 }}>
          <div style={{ fontSize:18, fontWeight:700, color:'#b91c1c' }}>Erro na aplicação</div>
          <div style={{ fontSize:13, color:'#6b7280', maxWidth:600, textAlign:'center' }}>{this.state.error.message}</div>
          <button onClick={()=>window.location.reload()} style={{ marginTop:8, padding:'8px 20px', background:'#FF7A00', color:'#121212', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:"'Inter',system-ui,sans-serif", fontWeight:600 }}>Recarregar</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { getSupabase, isSupabaseReady, saveAnonKey, getAnonKey } from './lib/supabase.js';
import { useOverlayBack } from './lib/useOverlayBack.js';
import { loadAllData, sbCreateProcesso, sbUpdateProcesso, sbDeleteProcesso, sbCreateAta, sbUpdateAta, sbDeleteAta, sbCreateAtaItem, sbDeleteAtaItem, sbUpdateAtaSaldo, sbCreateContrato, sbUpdateContrato, sbDeleteContrato, sbCreateDispensa, sbUpdateDispensa, sbDeleteDispensa, sbCreateInexigibilidade, sbUpdateInexigibilidade, sbDeleteInexigibilidade, sbCreateCotacao, sbDeleteCotacao } from './lib/db.js';
import { sbListDispensaProcessos, sbSaveRascunho, sbDeleteDispensaProcesso, sbGetDispensaConfig, sbSaveDispensaConfig, gerarProcessoDispensa } from './lib/dbDispensas.js';
import { validarLimiteLegal, TIPOS_OBJETO } from './lib/dispensaLegal.js';
import {
  sbListLexcoreAnalises, sbCreateLexcoreAnalise, sbUpdateLexcoreAnalise, sbDeleteLexcoreAnalise,
  sbGetLexcoreAnalise, sbListPontosCriticos, sbInsertPontosCriticos, sbSetPontoSelecionado,
  sbListPecas, sbListTodasPecas, sbGetPeca, sbCreatePeca, sbUpdatePeca, sbDeletePeca, exportarPecaDocx, uploadEditalOriginal,
} from './lib/lexcoreDb.js';
import { ANALISE_SYSTEM, buildPecaSystem, buildPecaUserPrompt, parsePontosCriticosJSON, TIPOS_PECA, labelTipoPeca, labelTipoProblema } from './lib/lexcoreLegal.js';
import {
  sbListRespostas, sbCreateResposta, sbGetResposta, sbUpdateResposta, sbDeleteResposta,
  uploadDocumentoRecebido, exportarRespostaDocx,
} from './lib/lexcoreRespostaDb.js';
import { TIPOS_RESPOSTA, labelTipoResposta, buildRespostaSystem, buildRespostaUserText } from './lib/lexcoreRespostaLegal.js';
import { markModalOpen, markModalClosed } from './lib/modalGuard.js';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import KPICards from "./components/KPICards.jsx";
import ProcessosTable from "./components/ProcessosTable.jsx";
import StatusBadge from "./components/StatusBadge.jsx";

/* ═══════════════════════════════════════════════════════════════
   LICITAGOV — Sistema de Gestão de Licitações Públicas
   Lei 14.133/2021 · Light Professional · Clériston
═══════════════════════════════════════════════════════════════ */

const C = {
  bg:           "#f5f5f5",
  surface:      "#ffffff",
  card:         "#ffffff",
  overlay:      "#f8fafc",
  subtle:       "#f1f5f9",
  border:       "#e4e8ef",
  borderStrong: "#cbd5e1",
  accent:       "#FF7A00",
  accentHover:  "#e56e00",
  accentSubtle: "#fff1e6",
  accentBorder: "#FF7A0055",
  accent2:      "#FF9633",
  gold:         "#b45309",
  red:          "#b91c1c",
  green:        "#15803d",
  amber:        "#b45309",
  purple:       "#6b7280",
  text:         "#111827",
  sub:          "#6b7280",
  subL:         "#6b7280",
  tertiary:     "#9ca3af",
};

const fmtBRL = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
const parseBRL = v => {
  if (!v && v !== 0) return 0;
  const s = String(v).trim().replace(/[R$\s]/g,"");
  if (!s) return 0;
  const hasComma = s.includes(","), hasDot = s.includes(".");
  if (hasComma && hasDot)
    return s.lastIndexOf(",") > s.lastIndexOf(".")
      ? parseFloat(s.replace(/\./g,"").replace(",",".")) || 0   // BR: 2.234.567,23
      : parseFloat(s.replace(/,/g,"")) || 0;                    // US: 2,234,567.23
  if (hasComma) {
    const p = s.split(",");
    return (p.length===2 && p[1].length<=2)
      ? parseFloat(s.replace(",",".")) || 0   // BR decimal: 1234,56
      : parseFloat(s.replace(/,/g,"")) || 0;  // US milhar: 1,234
  }
  if (hasDot) {
    const p = s.split(".");
    return (p.length>2 || (p.length===2 && p[1].length===3))
      ? parseFloat(s.replace(/\./g,"")) || 0  // BR milhar: 1.234 ou 1.234.567
      : parseFloat(s) || 0;                   // decimal normal: 1234.56
  }
  return parseFloat(s) || 0;
};
const fmtDate = d => {
  if (!d) return "—";
  // Datas puras (YYYY-MM-DD, campos de formulário como abertura/vigência) precisam do "T00:00:00"
  // para não sofrer o shift de fuso horário do UTC; timestamps completos (createdAt/updatedAt,
  // vindos como timestamptz do Postgres) já têm hora e fuso embutidos e não devem ser concatenados.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + "T00:00:00" : d);
  return isNaN(date) ? "—" : date.toLocaleDateString("pt-BR");
};
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
const uid = () => crypto.randomUUID();

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
    edit:       <><path d="M11 4H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash:      <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
    copy:       <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4c0-1.1.9-2 2-2h9a2 2 0 0 1 2 2v1"/></>,
    globe:      <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    sparkle:    <><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></>,
    logout:     <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    lock:       <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    mail:       <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    externallink:<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
    dispensa:    <><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></>,
    inexigib:    <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    lexcore:     <><path d="M12 3v18"/><path d="M5 7l-3 6a3 3 0 0 0 6 0z"/><path d="M19 7l-3 6a3 3 0 0 0 6 0z"/><path d="M5 7h14"/><path d="M12 3l-3 2 3 2 3-2z"/><path d="M7 21h10"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
      {d[name] || null}
    </svg>
  );
}

/* ── API ROUTE SERVER-SIDE (Vercel) ─────────────────────────── */
const anthropicFetch = (_proxyUrl, opts) => {
  const headers = { ...opts.headers };
  delete headers["anthropic-dangerous-allow-browser"];
  delete headers["x-api-key"];
  return fetch("/api/claude", { ...opts, headers });
};

const STORAGE_KEY = "licitagov_data_v2";
function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return null;
}
function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) { console.error('[LicitaGov] localStorage falhou:', e); }
}

const SEED = {
  processos: [], atas: [], contratos: [], cotacoes: [], dispensas: [], inexigibilidades: [],
};

/* ── COMPONENTES BASE ──────────────────────────────────────── */

function Badge({ label, color }) {
  const map = {
    "Vigente":      { bg:"#f0fdf4", fg:"#15803d" },
    "A vencer":     { bg:"#fff1e6", fg:"#c25a00" },
    "Encerrado":    { bg:"#f3f4f6", fg:"#6b7280" },
    "Vencido":      { bg:"#fef2f2", fg:"#b91c1c" },
    "Homologado":   { bg:"#f0fdf4", fg:"#15803d" },
    "Em andamento": { bg:"#fff1e6", fg:"#c25a00" },
    "Publicado":    { bg:"#fff1e6", fg:"#c25a00" },
    "Planejamento": { bg:"#fff1e6", fg:"#c25a00" },
    "Revogado":     { bg:"#fef2f2", fg:"#b91c1c" },
    "Suspenso":     { bg:"#f3f4f6", fg:"#6b7280" },
    "Finalizada":   { bg:"#f0fdf4", fg:"#15803d" },
    "Em coleta":    { bg:"#fff1e6", fg:"#c25a00" },
    "Rascunho":     { bg:"#f3f4f6", fg:"#6b7280" },
    "Concluída":    { bg:"#f0fdf4", fg:"#15803d" },
    "Cancelada":    { bg:"#fef2f2", fg:"#b91c1c" },
  };
  const preset = map[label];
  const bg = preset ? preset.bg : "#f3f4f6";
  const fg = color || (preset ? preset.fg : "#6b7280");
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      background: bg, color: fg,
      borderRadius: 999, padding: "3px 10px",
      fontSize: 11, fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:"currentColor", flexShrink:0 }} />
      {label}
    </span>
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
        background: variant==="solid" ? color : (hov?color+"12":"transparent"),
        color: variant==="solid" ? "#ffffff" : color,
        border: variant==="solid" ? "none" : `1px solid ${color}55`,
        filter: variant==="solid" && hov && !disabled ? "brightness(0.88)" : "none",
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
  useOverlayBack(true, onClose);
  useEffect(() => { markModalOpen(); return () => markModalClosed(); }, []);
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
          <span style={{ fontSize:16, fontWeight:600, fontFamily:"Inter,system-ui,sans-serif", color:C.text }}>{title}</span>
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
      <div style={{ display:"flex", justifyContent:"center", marginBottom:14, opacity:0.3 }}>
        <Icon name={icon} size={40} strokeWidth={1.1} />
      </div>
      <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:4 }}>{title}</div>
      <div style={{ fontSize:13, color:C.sub }}>{sub}</div>
    </div>
  );
}

function KpiCard({ label, value, sub, color=C.accent }) {
  return (
    <div
      style={{
        background: "#121212",
        border: `1px solid #2a2a2a`,
        borderRadius: 12,
        padding: "16px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        transition:"border-color 0.14s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor=`${color}66`}
      onMouseLeave={e => e.currentTarget.style.borderColor="#2a2a2a"}
    >
      <div style={{ fontSize:11, color:"#c0c0c0", fontWeight:500, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:700, color, fontFamily:"Inter,system-ui,sans-serif", lineHeight:1.2, wordBreak:"break-word" }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:"#9a9a9a", marginTop:5 }}>{sub}</div>}
    </div>
  );
}

/* ── GLOBAL STYLES ─────────────────────────────────────────── */
function GlobalStyles() {
  return (
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#f5f5f5;color:#111827;}
      ::-webkit-scrollbar{width:5px;height:5px;}
      ::-webkit-scrollbar-track{background:transparent;}
      ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:3px;}
      ::-webkit-scrollbar-thumb:hover{background:#cbd5e1;}
      button,input,select,textarea{font-family:inherit;}
      input::placeholder,textarea::placeholder{color:#9ca3af;}
      @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
      @keyframes dots{0%,20%{content:'.'} 40%{content:'..'} 60%,100%{content:'...'}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @media print{
        .no-print{display:none!important;}
        body{background:#fff!important;color:#111!important;}
      }
    `}</style>
  );
}

/* ── SETUP SCREEN (configura Supabase na 1ª vez) ─────────── */
function SetupScreen({ onReady }) {
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const salvar = async () => {
    const k = key.trim();
    if (!k || (!k.startsWith("eyJ") && !k.startsWith("sb_"))) { setErr("Chave inválida. Cole a anon/public key do painel Supabase."); return; }
    setLoading(true); setErr("");
    try {
      saveAnonKey(k);
      const sb = getSupabase();
      await sb.auth.getSession();
      onReady();
    } catch {
      setErr("Chave inválida ou projeto inacessível. Verifique no painel Supabase.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Inter,system-ui,sans-serif" }}>
      <GlobalStyles />
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"36px 40px", maxWidth:480, width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.10)", animation:"fadeUp 0.3s ease" }}>
        <div style={{ marginBottom:28, textAlign:"center" }}>
          <div style={{ fontSize:22, fontWeight:800, fontFamily:"Inter,system-ui,sans-serif", color:C.text, marginBottom:6 }}>
            Licita<span style={{color:C.accent}}>Gov</span>
          </div>
          <div style={{ fontSize:13, color:C.sub }}>Configuração inicial — conexão Supabase</div>
        </div>
        <div style={{ background:C.accentSubtle, border:`1px solid ${C.accentBorder}`, borderRadius:8, padding:"12px 16px", fontSize:13, color:C.accent, marginBottom:20, lineHeight:1.6 }}>
          Acesse <strong>supabase.com/dashboard/project/xqlrfsrjvqmucchzpapk/settings/api</strong> e copie a <strong>anon public key</strong>.
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <label style={{ fontSize:12, color:C.sub, fontWeight:500 }}>Chave Anon Public</label>
          <input value={key} onChange={e=>setKey(e.target.value)} type="password" placeholder="eyJhbGciOiJIUzI1NiIs..."
            style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"10px 12px", color:C.text, fontSize:13, outline:"none", transition:"border-color 0.14s" }}
            onFocus={e=>{ e.target.style.borderColor=C.accent; }}
            onBlur={e=>{ e.target.style.borderColor=C.border; }}
            onKeyDown={e=>e.key==="Enter"&&salvar()} />
          {err && <div style={{ fontSize:12, color:C.red }}>{err}</div>}
          <button onClick={salvar} disabled={loading}
            style={{ marginTop:8, background:C.accent, color:"#121212", border:"none", borderRadius:6, padding:"11px", fontSize:14, fontWeight:600, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, transition:"all 0.14s" }}>
            {loading ? "Verificando..." : "Conectar e Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── DEFINIR NOVA SENHA ────────────────────────────────────── */
function SetPasswordScreen({ onDone }) {
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const salvar = async () => {
    if (!senha || senha.length < 6) { setErr("A senha deve ter pelo menos 6 caracteres."); return; }
    if (senha !== confirma) { setErr("As senhas não coincidem."); return; }
    setLoading(true); setErr("");
    try {
      const sb = getSupabase();
      const { error } = await sb.auth.updateUser({ password: senha });
      if (error) throw error;
      setOk(true);
      setTimeout(() => { sb.auth.signOut(); onDone(); }, 2000);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const inputStyle = {
    background: C.surface, border:`1px solid ${C.border}`, borderRadius:8,
    padding:"11px 14px", color:C.text, fontSize:14, outline:"none",
    width:"100%", transition:"border-color 0.14s, box-shadow 0.14s",
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:C.bg, fontFamily:"Inter,system-ui,sans-serif" }}>
      <GlobalStyles />
      <div style={{ width:"100%", maxWidth:380, padding:24, animation:"fadeUp 0.3s ease" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <img src="/govcore-logo.png" alt="GovCore" style={{ maxWidth:180, width:"65%", marginBottom:12 }} />
        </div>
        <div style={{ fontSize:20, fontWeight:700, fontFamily:"Inter,system-ui,sans-serif", color:C.text, marginBottom:6 }}>Definir nova senha</div>
        <div style={{ fontSize:13, color:C.sub, marginBottom:24 }}>Crie uma senha segura para acessar o sistema.</div>

        {ok ? (
          <div style={{ textAlign:"center", color:C.green, fontSize:14, fontWeight:600, padding:16 }}>
            ✓ Senha definida com sucesso! Redirecionando...
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:12, color:C.sub, fontWeight:500 }}>Nova senha</label>
              <div style={{ position:"relative" }}>
                <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.tertiary }}>
                  <Icon name="lock" size={15} />
                </div>
                <input value={senha} onChange={e=>setSenha(e.target.value)} type="password" placeholder="Mínimo 6 caracteres"
                  style={{...inputStyle, paddingLeft:38}}
                  onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
                  onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }}
                  onKeyDown={e=>e.key==="Enter"&&salvar()} />
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:12, color:C.sub, fontWeight:500 }}>Confirmar senha</label>
              <div style={{ position:"relative" }}>
                <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.tertiary }}>
                  <Icon name="lock" size={15} />
                </div>
                <input value={confirma} onChange={e=>setConfirma(e.target.value)} type="password" placeholder="Repita a senha"
                  style={{...inputStyle, paddingLeft:38}}
                  onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
                  onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }}
                  onKeyDown={e=>e.key==="Enter"&&salvar()} />
              </div>
            </div>
            {err && <div style={{ fontSize:12, color:C.red, background:"rgba(220,38,38,0.06)", padding:"8px 12px", borderRadius:6, border:"1px solid rgba(220,38,38,0.15)" }}>{err}</div>}
            <button onClick={salvar} disabled={loading}
              style={{ background:C.accent, color:"#121212", border:"none", borderRadius:8, padding:"13px", fontSize:14, fontWeight:600, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, transition:"all 0.14s", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {loading ? (
                <><div style={{ width:16, height:16, border:"2px solid rgba(0,0,0,0.25)", borderTopColor:"#121212", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} /> Salvando...</>
              ) : "Salvar senha"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── LOGIN SCREEN ───────────────────────────────────────────── */
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const isMobile = window.innerWidth < 768;

  const entrar = async () => {
    if (!email || !senha) { setErr("Preencha e-mail e senha."); return; }
    setLoading(true); setErr("");
    try {
      const sb = getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      onLogin(data.session);
    } catch (e) {
      setErr(e.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : e.message);
    } finally { setLoading(false); }
  };

  const enviarReset = async () => {
    if (!email) { setErr("Digite seu e-mail para recuperação."); return; }
    setLoading(true); setErr("");
    try {
      const sb = getSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
      if (error) throw error;
      setResetSent(true);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const inputStyle = {
    background: C.surface, border:`1px solid ${C.border}`, borderRadius:8,
    padding:"11px 14px", color:C.text, fontSize:14, outline:"none",
    width:"100%", transition:"border-color 0.14s, box-shadow 0.14s",
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", fontFamily:"Inter,system-ui,sans-serif" }}>
      <GlobalStyles />

      {/* Painel esquerdo — identidade */}
      {!isMobile && (
        <div style={{ width:"45%", background:"linear-gradient(150deg, #0d0d0d 0%, #1a1a1a 55%, #4d2c0f 100%)", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:"60px 48px", color:"#E0E0E0", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-60, right:-60, width:280, height:280, borderRadius:"50%", background:"rgba(255,122,0,0.08)" }} />
          <div style={{ position:"absolute", bottom:-80, left:-40, width:220, height:220, borderRadius:"50%", background:"rgba(255,122,0,0.10)" }} />
          <div style={{ position:"relative", textAlign:"center", maxWidth:320 }}>
            <img src="/govcore-logo.png" alt="GovCore" style={{ maxWidth:300, width:"90%", marginBottom:36, filter:"drop-shadow(0 6px 32px rgba(0,0,0,0.45))" }} />
            <div style={{ fontSize:20, fontWeight:700, marginBottom:12, lineHeight:1.3 }}>
              Núcleo Inteligente da Gestão Pública
            </div>
            <div style={{ fontSize:14, opacity:0.75, lineHeight:1.7 }}>
              Lei 14.133/2021 · IN SEGES 65/2021
            </div>
          </div>
        </div>
      )}

      {/* Painel direito — formulário */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:C.bg, padding:isMobile?"24px":"48px" }}>
        <div style={{ width:"100%", maxWidth:380, animation:"fadeUp 0.3s ease" }}>
          {isMobile && (
            <div style={{ textAlign:"center", marginBottom:32 }}>
              <img src="/govcore-logo.png" alt="GovCore" style={{ maxWidth:180, width:"65%", marginBottom:10 }} />
              <div style={{ fontSize:13, color:C.sub, marginTop:4 }}>Gestão de Licitações Públicas</div>
            </div>
          )}

          {resetSent ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:16, fontWeight:600, color:C.text, marginBottom:8 }}>E-mail enviado!</div>
              <div style={{ fontSize:13, color:C.sub, marginBottom:20 }}>Verifique sua caixa de entrada para redefinir a senha.</div>
              <button onClick={()=>{ setResetMode(false); setResetSent(false); }} style={{ color:C.accent, background:"none", border:"none", cursor:"pointer", fontSize:13, fontWeight:500 }}>
                ← Voltar ao login
              </button>
            </div>
          ) : resetMode ? (
            <div>
              <div style={{ fontSize:20, fontWeight:700, fontFamily:"Inter,system-ui,sans-serif", color:C.text, marginBottom:6 }}>Recuperar senha</div>
              <div style={{ fontSize:13, color:C.sub, marginBottom:24 }}>Informe seu e-mail para receber o link de redefinição.</div>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={{ fontSize:12, color:C.sub, fontWeight:500 }}>E-mail</label>
                  <div style={{ position:"relative" }}>
                    <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.tertiary }}>
                      <Icon name="mail" size={15} />
                    </div>
                    <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="seu@email.gov.br"
                      style={{...inputStyle, paddingLeft:38}}
                      onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
                      onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
                  </div>
                </div>
                {err && <div style={{ fontSize:12, color:C.red, background:"rgba(220,38,38,0.06)", padding:"8px 12px", borderRadius:6 }}>{err}</div>}
                <button onClick={enviarReset} disabled={loading}
                  style={{ background:C.accent, color:"#121212", border:"none", borderRadius:8, padding:"13px", fontSize:14, fontWeight:600, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, transition:"all 0.14s" }}>
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </button>
                <button onClick={()=>{ setResetMode(false); setErr(""); }} style={{ color:C.sub, background:"none", border:"none", cursor:"pointer", fontSize:13, textAlign:"center" }}>
                  ← Voltar ao login
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:20, fontWeight:700, fontFamily:"Inter,system-ui,sans-serif", color:C.text, marginBottom:6 }}>Bem-vindo</div>
              <div style={{ fontSize:13, color:C.sub, marginBottom:28 }}>Entre com suas credenciais para acessar o sistema.</div>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={{ fontSize:12, color:C.sub, fontWeight:500 }}>E-mail institucional</label>
                  <div style={{ position:"relative" }}>
                    <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.tertiary }}>
                      <Icon name="mail" size={15} />
                    </div>
                    <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="seu@prefeitura.gov.br"
                      style={{...inputStyle, paddingLeft:38}}
                      onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
                      onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }}
                      onKeyDown={e=>e.key==="Enter"&&entrar()} />
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={{ fontSize:12, color:C.sub, fontWeight:500 }}>Senha</label>
                  <div style={{ position:"relative" }}>
                    <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.tertiary }}>
                      <Icon name="lock" size={15} />
                    </div>
                    <input value={senha} onChange={e=>setSenha(e.target.value)} type="password" placeholder="••••••••"
                      style={{...inputStyle, paddingLeft:38}}
                      onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
                      onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }}
                      onKeyDown={e=>e.key==="Enter"&&entrar()} />
                  </div>
                </div>
                {err && <div style={{ fontSize:12, color:C.red, background:"rgba(220,38,38,0.06)", padding:"8px 12px", borderRadius:6, border:"1px solid rgba(220,38,38,0.15)" }}>{err}</div>}
                <button onClick={entrar} disabled={loading}
                  style={{ background:C.accent, color:"#121212", border:"none", borderRadius:8, padding:"13px", fontSize:14, fontWeight:600, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, transition:"all 0.14s", marginTop:4, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  {loading ? (
                    <><div style={{ width:16, height:16, border:"2px solid rgba(0,0,0,0.25)", borderTopColor:"#121212", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} /> Entrando...</>
                  ) : "Entrar"}
                </button>
                <div style={{ textAlign:"center" }}>
                  <button onClick={()=>{ setResetMode(true); setErr(""); }} style={{ color:C.sub, background:"none", border:"none", cursor:"pointer", fontSize:12 }}>
                    Esqueci minha senha
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════ */
function TabDashboard({ data, onViewProcessos }) {
  const { processos, atas, contratos, cotacoes, inexigibilidades } = data;
  const vencendo = contratos.filter(c => {
    const d = diasParaVencer(c.fim);
    return d !== null && d >= 0 && d <= 30 && c.status !== "Encerrado";
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <h2 style={{ fontSize:18, fontWeight:700, fontFamily:"Inter,system-ui,sans-serif", color:C.text, marginBottom:4 }}>Visão geral</h2>
        <p style={{ fontSize:13, color:C.sub }}>Acompanhe processos, contratos e indicadores de compras públicas em tempo real.</p>
      </div>

      <KPICards processos={processos} atas={atas} contratos={contratos} inexigibilidades={inexigibilidades} />

      <ProcessosTable processos={processos} onViewAll={onViewProcessos} />

      {vencendo.length > 0 && (
        <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:12, padding:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:600, color:C.red, marginBottom:12 }}>
            <Icon name="warning" size={14} color={C.red} /> Contratos a vencer em 30 dias
          </div>
          {vencendo.map(c => (
            <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #fecaca", flexWrap:"wrap", gap:8 }}>
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
const FASES_PROC = ["Planejamento","Publicado","Em andamento","Homologado","Revogado","Suspenso"];
const MODALIDADES = ["Pregão Eletrônico","Pregão Presencial","Concorrência Eletrônica","Concorrência Presencial","Concorrência","Concurso","Leilão","Diálogo Competitivo"];
const FORM_PROC_EMPTY = { numero:"", objeto:"", modalidade:"Pregão Eletrônico", fase:"Planejamento", valor:"", abertura:"", orgao:"" };

function IconBtn({ name, color, title, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={e=>{ e.stopPropagation(); onClick(); }} title={title}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:hov?color+"12":"transparent", border:`1px solid ${hov?color+"44":"transparent"}`, borderRadius:5, padding:"5px 7px", cursor:"pointer", color:hov?color:C.sub, display:"flex", alignItems:"center", transition:"all 0.13s", flexShrink:0 }}>
      <Icon name={name} size={13} strokeWidth={1.7} />
    </button>
  );
}

function TabProcessos({ processos, setProcessos, toast }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filtroFase, setFiltroFase] = useState("Todos");
  const [form, setForm] = useState(FORM_PROC_EMPTY);

  const EXCLUIR_MODALIDADES = new Set(["Dispensa","Dispensa de Licitação","Inexigibilidade","Inexigibilidade de Licitação"]);
  const filtered = processos.filter(p => {
    if (EXCLUIR_MODALIDADES.has(p.modalidade)) return false;
    const ok = filtroFase==="Todos" || p.fase===filtroFase;
    const s = search.toLowerCase();
    return ok && (p.numero.toLowerCase().includes(s) || p.objeto.toLowerCase().includes(s) || (p.orgao||"").toLowerCase().includes(s));
  });

  const openNovo = () => { setEditId(null); setForm(FORM_PROC_EMPTY); setModal(true); };
  const openEdit = (p) => { setEditId(p.id); setForm({ numero:p.numero, objeto:p.objeto, modalidade:p.modalidade, fase:p.fase, valor:String(p.valor||""), abertura:p.abertura||"", orgao:p.orgao||"" }); setModal(true); };
  const deletar = (id) => {
    if (!window.confirm("Excluir este processo?")) return;
    setProcessos(prev=>prev.filter(p=>p.id!==id));
    toast("Processo excluído");
    sbDeleteProcesso(id).then(({error})=>{ if(error) toast("Erro ao excluir: "+error.message,"error"); });
  };

  const salvar = () => {
    if (!form.numero||!form.objeto) { toast("Número e objeto são obrigatórios","error"); return; }
    if (editId) {
      const fields = { ...form, valor:parseBRL(form.valor) };
      setProcessos(prev=>prev.map(p=>p.id===editId?{ ...p, ...fields }:p));
      toast("Processo atualizado!");
      sbUpdateProcesso(editId, { numero:fields.numero, objeto:fields.objeto, modalidade:fields.modalidade, fase:fields.fase, valor:fields.valor, abertura:fields.abertura||null, orgao:fields.orgao||null })
        .then(({error})=>{ if(error) toast("Erro ao salvar: "+error.message,"error"); });
    } else {
      const id = uid();
      const newItem = { id, ...form, valor:parseBRL(form.valor) };
      setProcessos(prev=>[newItem, ...prev]);
      toast("Processo cadastrado com sucesso!");
      sbCreateProcesso({ id, numero:form.numero, objeto:form.objeto, modalidade:form.modalidade, fase:form.fase, valor:parseBRL(form.valor), abertura:form.abertura||null, orgao:form.orgao||null })
        .then(({error})=>{ if(error) toast("Erro ao salvar: "+error.message,"error"); });
    }
    setModal(false);
  };

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar processo..."
          style={{ flex:1, minWidth:150, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none", transition:"border-color 0.14s, box-shadow 0.14s" }}
          onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
          onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
        <Select value={filtroFase} onChange={setFiltroFase} options={["Todos",...FASES_PROC]} />
        <Btn onClick={openNovo}>+ Novo Processo</Btn>
      </div>

      {filtered.length===0 ? <EmptyState icon="processos" title="Nenhum processo encontrado" sub="Cadastre um novo processo para começar" /> : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          {filtered.map((p,i)=>(
            <div key={p.id} style={{ padding:"13px 18px", borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none", transition:"background 0.12s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.overlay}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:14, fontWeight:700, color:C.accent, fontFamily:"Inter,system-ui,sans-serif" }}>{p.numero}</span>
                    <Badge label={p.fase} />
                  </div>
                  <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:3 }}>{p.objeto}</div>
                  <div style={{ fontSize:12, color:C.sub }}>{p.modalidade} · {p.orgao} · Abertura: {fmtDate(p.abertura)}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ textAlign:"right", marginRight:4 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{fmtBRL(p.valor)}</div>
                    <div style={{ fontSize:11, color:C.sub }}>Valor estimado</div>
                  </div>
                  <IconBtn name="edit" color={C.accent} title="Editar" onClick={()=>openEdit(p)} />
                  <IconBtn name="trash" color={C.red} title="Excluir" onClick={()=>deletar(p.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={editId?"Editar Processo":"Novo Processo Licitatório"} onClose={()=>setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Número" value={form.numero} onChange={v=>setForm(f=>({...f,numero:v}))} placeholder="001/2025" required />
              <Select label="Modalidade" value={form.modalidade} onChange={v=>setForm(f=>({...f,modalidade:v}))} options={MODALIDADES} />
            </div>
            <Input label="Objeto" value={form.objeto} onChange={v=>setForm(f=>({...f,objeto:v}))} placeholder="Descreva o objeto da licitação" required />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Órgão/Setor" value={form.orgao} onChange={v=>setForm(f=>({...f,orgao:v}))} placeholder="Secretaria..." />
              <Select label="Fase" value={form.fase} onChange={v=>setForm(f=>({...f,fase:v}))} options={FASES_PROC} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Valor Estimado (R$)" value={form.valor} onChange={v=>setForm(f=>({...f,valor:v}))} placeholder="0,00" />
              <Input label="Data de Abertura" value={form.abertura} onChange={v=>setForm(f=>({...f,abertura:v}))} type="date" />
            </div>
            <div style={{ display:"flex", gap:10, marginTop:8, justifyContent:"flex-end" }}>
              <Btn variant="outline" onClick={()=>setModal(false)} color={C.sub}>Cancelar</Btn>
              <Btn onClick={salvar}>{editId?"Salvar Alterações":"Salvar Processo"}</Btn>
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
const ATA_FORM_EMPTY = { numero:"", objeto:"", fornecedor:"", cnpj:"", vigencia:"", valorTotal:"", link_drive:"", endereco:"", telefone:"", email:"" };

function TabAtas({ atas, setAtas, toast }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [modalItem, setModalItem] = useState(false);
  const [ataAtiva, setAtaAtiva] = useState(null);
  const [confirmarExcluirId, setConfirmarExcluirId] = useState(null);
  const [form, setForm] = useState(ATA_FORM_EMPTY);
  const [formItem, setFormItem] = useState({ descricao:"", unidade:"", qtdRegistrada:"", qtdUtilizada:"", valorUnit:"" });
  useOverlayBack(!!ataAtiva, () => setAtaAtiva(null));
  const isMobile = useMobileCD();

  const openNova = () => { setEditId(null); setForm(ATA_FORM_EMPTY); setModal(true); };
  const openEdit = (a) => {
    setEditId(a.id);
    setForm({ numero:a.numero, objeto:a.objeto, fornecedor:a.fornecedor, cnpj:a.cnpj||"", vigencia:a.vigencia||"", valorTotal:String(a.valorTotal||""), link_drive:a.link_drive||"", endereco:a.endereco||"", telefone:a.telefone||"", email:a.email||"" });
    setModal(true);
  };

  const salvar = () => {
    if (!form.numero||!form.objeto||!form.fornecedor) { toast("Preencha os campos obrigatórios","error"); return; }
    if (editId) {
      const vt = parseBRL(form.valorTotal);
      setAtas(prev=>prev.map(a=>a.id===editId?{ ...a, ...form, valorTotal:vt }:a));
      toast("Ata atualizada!");
      sbUpdateAta(editId, { numero:form.numero, objeto:form.objeto, fornecedor:form.fornecedor, cnpj:form.cnpj||null, vigencia:form.vigencia||null, valor_total:vt, link_drive:form.link_drive||null, endereco:form.endereco||null, telefone:form.telefone||null, email:form.email||null })
        .then(({error})=>{ if(error) toast("Erro ao salvar: "+error.message,"error"); });
    } else {
      const id = uid();
      const vt = parseBRL(form.valorTotal);
      const newAta = { id, ...form, valorTotal:vt, saldoDisponivel:vt, itens:[] };
      setAtas(prev=>[newAta, ...prev]);
      toast("Ata registrada com sucesso!");
      sbCreateAta({ id, numero:form.numero, objeto:form.objeto, fornecedor:form.fornecedor, cnpj:form.cnpj||null, vigencia:form.vigencia||null, valor_total:vt, saldo_disponivel:vt, link_drive:form.link_drive||null, endereco:form.endereco||null, telefone:form.telefone||null, email:form.email||null })
        .then(({error})=>{ if(error) toast("Erro ao salvar: "+error.message,"error"); });
    }
    setModal(false);
    setForm(ATA_FORM_EMPTY);
  };

  const deletarAta = (id) => setConfirmarExcluirId(id);

  const confirmarExclusaoAta = () => {
    const idParaExcluir = confirmarExcluirId;
    setAtas(prev=>prev.filter(a=>a.id!==idParaExcluir));
    setConfirmarExcluirId(null);
    toast("Ata excluída");
    sbDeleteAta(idParaExcluir).then(({error})=>{ if(error) toast("Erro ao excluir: "+error.message,"error"); });
  };

  const salvarItem = () => {
    if (!formItem.descricao||!formItem.qtdRegistrada) { toast("Descrição e quantidade são obrigatórios","error"); return; }
    const qtdReg = parseFloat(formItem.qtdRegistrada)||0;
    const qtdUtil = parseFloat(formItem.qtdUtilizada)||0;
    const vUnit = parseBRL(formItem.valorUnit);
    const itemId = uid();
    const newItem = { id:itemId, descricao:formItem.descricao, unidade:formItem.unidade, qtdRegistrada:qtdReg, qtdUtilizada:qtdUtil, valorUnit:vUnit };
    const ataAtual = atas.find(a=>a.id===ataAtiva);
    const newSaldo = (ataAtual?.saldoDisponivel||0) - (qtdUtil*vUnit);
    setAtas(prev=>prev.map(a=>a.id===ataAtiva?{
      ...a,
      itens:[...a.itens, newItem],
      saldoDisponivel: newSaldo,
    }:a));
    setModalItem(false);
    setFormItem({ descricao:"", unidade:"", qtdRegistrada:"", qtdUtilizada:"", valorUnit:"" });
    toast("Item adicionado!");
    Promise.all([
      sbCreateAtaItem(ataAtiva, newItem),
      sbUpdateAtaSaldo(ataAtiva, newSaldo),
    ]).then(results=>{ const err=results.find(r=>r.error); if(err) toast("Erro ao salvar item: "+err.error.message,"error"); });
  };

  const deletarItem = (itemId) => {
    if (!window.confirm("Remover este item?")) return;
    const ataAtual = atas.find(a=>a.id===ataAtiva);
    const it = ataAtual?.itens.find(i=>i.id===itemId);
    const newSaldo = (ataAtual?.saldoDisponivel||0) + (it ? it.qtdUtilizada*it.valorUnit : 0);
    setAtas(prev=>prev.map(a=>{
      if (a.id!==ataAtiva) return a;
      return { ...a, itens:a.itens.filter(i=>i.id!==itemId), saldoDisponivel:newSaldo };
    }));
    toast("Item removido");
    Promise.all([
      sbDeleteAtaItem(itemId),
      sbUpdateAtaSaldo(ataAtiva, newSaldo),
    ]).then(results=>{ const err=results.find(r=>r.error); if(err) toast("Erro ao remover item: "+err.error.message,"error"); });
  };

  if (ataAtiva) {
    const ata = atas.find(a=>a.id===ataAtiva);
    if (!ata) { setAtaAtiva(null); return null; }
    const pctUsado = ata.valorTotal>0?((ata.valorTotal - ata.saldoDisponivel)/ata.valorTotal*100).toFixed(1):"0.0";
    const diasV = diasParaVencer(ata.vigencia);
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:20, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={()=>setAtaAtiva(null)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 12px", color:C.sub, cursor:"pointer", fontSize:12, fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
              <Icon name="back" size={13} /> Voltar
            </button>
            <div>
              <div style={{ fontSize:16, fontWeight:700, fontFamily:"Inter,system-ui,sans-serif", color:C.text }}>{ata.numero}</div>
              <div style={{ fontSize:12, color:C.sub }}>{ata.objeto}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {ata.link_drive && (
              <Btn onClick={()=>window.open(ata.link_drive,"_blank","noopener")} color={C.accent} size="sm" style={{ display:"flex", alignItems:"center", gap:5 }}>
                <Icon name="externallink" size={13} /> Abrir no Drive
              </Btn>
            )}
            <Btn onClick={()=>setModalItem(true)} color={C.accent2} size="sm">+ Adicionar Item</Btn>
          </div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"14px 18px", marginBottom:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.sub, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Dados do Fornecedor</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.accent, marginBottom:4 }}>{ata.fornecedor}</div>
          {ata.cnpj && <div style={{ fontSize:13, color:C.text, marginBottom:3 }}>CNPJ: <span style={{ fontWeight:500 }}>{ata.cnpj}</span></div>}
          {ata.endereco && <div style={{ fontSize:13, color:C.sub, marginBottom:3 }}>📍 {ata.endereco}</div>}
          <div style={{ display:"flex", gap:18, flexWrap:"wrap", marginTop: (ata.telefone||ata.email) ? 4 : 0 }}>
            {ata.telefone && <div style={{ fontSize:13, color:C.sub }}>📞 {ata.telefone}</div>}
            {ata.email && <div style={{ fontSize:13, color:C.sub }}>✉ {ata.email}</div>}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:12, marginBottom:18 }}>
          <KpiCard label="Valor Total" value={fmtBRL(ata.valorTotal)} color={C.accent2} />
          <KpiCard label="Saldo" value={fmtBRL(ata.saldoDisponivel)} sub={`${(100-parseFloat(pctUsado)).toFixed(1)}% disponível`} color={C.green} />
          <KpiCard label="Vigência" value={fmtDate(ata.vigencia)} sub={diasV!==null?`${diasV} dias`:""} color={diasV!==null&&diasV<30?C.red:C.amber} />
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:16, marginBottom:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:500, color:C.text }}>Utilização da Ata</span>
            <span style={{ fontSize:13, color:C.accent, fontWeight:600 }}>{pctUsado}% utilizado</span>
          </div>
          <div style={{ background:C.subtle, borderRadius:4, height:6, overflow:"hidden" }}>
            <div style={{ width:`${pctUsado}%`, height:"100%", background:parseFloat(pctUsado)>80?C.red:C.accent, borderRadius:4, transition:"width 0.6s" }} />
          </div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ padding:"13px 18px", borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:600, color:C.text }}>Itens da Ata</div>
          {(!ata.itens?.length) ? <EmptyState icon="file" title="Sem itens cadastrados" sub="Adicione itens para controlar o saldo da ata" /> : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:520 }}>
                <thead>
                  <tr style={{ background:C.overlay }}>
                    {["Descrição","Un.","Qtd Reg.","Qtd Util.","Vlr Unit.","Saldo",""].map(h=>(
                      <th key={h} style={{ padding:"9px 14px", fontSize:11, color:C.sub, fontWeight:600, textAlign:"left", whiteSpace:"nowrap", textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ata.itens.map((it)=>{
                    const saldo = it.qtdRegistrada - it.qtdUtilizada;
                    const pct = it.qtdRegistrada>0?(it.qtdUtilizada/it.qtdRegistrada*100).toFixed(0):"0";
                    return (
                      <tr key={it.id} style={{ borderBottom:`1px solid ${C.border}`, transition:"background 0.1s" }}
                        onMouseEnter={e=>e.currentTarget.style.background=C.overlay}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"11px 14px", fontSize:13, fontWeight:500, color:C.text }}>{it.descricao}</td>
                        <td style={{ padding:"11px 14px", fontSize:12, color:C.sub }}>{it.unidade}</td>
                        <td style={{ padding:"11px 14px", fontSize:13, color:C.text }}>{it.qtdRegistrada.toLocaleString("pt-BR")}</td>
                        <td style={{ padding:"11px 14px", fontSize:13, color:C.gold }}>{it.qtdUtilizada.toLocaleString("pt-BR")} <span style={{fontSize:11,color:C.sub}}>({pct}%)</span></td>
                        <td style={{ padding:"11px 14px", fontSize:13, color:C.accent2, fontWeight:500 }}>{fmtBRL(it.valorUnit)}</td>
                        <td style={{ padding:"11px 14px", fontSize:13, color:saldo<it.qtdRegistrada*0.1?C.red:C.green, fontWeight:600 }}>{saldo.toLocaleString("pt-BR")}</td>
                        <td style={{ padding:"11px 14px" }}>
                          <IconBtn name="trash" color={C.red} title="Remover item" onClick={()=>deletarItem(it.id)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {modalItem && (
          <Modal title="Adicionar Item à Ata" onClose={()=>setModalItem(false)}>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <Input label="Descrição do Item" value={formItem.descricao} onChange={v=>setFormItem(f=>({...f,descricao:v}))} placeholder="Descrição completa" required />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Input label="Unidade" value={formItem.unidade} onChange={v=>setFormItem(f=>({...f,unidade:v}))} placeholder="Un, Kg, L..." />
                <Input label="Valor Unitário (R$)" value={formItem.valorUnit} onChange={v=>setFormItem(f=>({...f,valorUnit:v}))} placeholder="0,00" />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Input label="Qtd. Registrada" value={formItem.qtdRegistrada} onChange={v=>setFormItem(f=>({...f,qtdRegistrada:v}))} type="number" required />
                <Input label="Qtd. Já Utilizada" value={formItem.qtdUtilizada} onChange={v=>setFormItem(f=>({...f,qtdUtilizada:v}))} type="number" placeholder="0" />
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                <Btn variant="outline" onClick={()=>setModalItem(false)} color={C.sub}>Cancelar</Btn>
                <Btn onClick={salvarItem} color={C.accent2}>Adicionar Item</Btn>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <Btn onClick={openNova} color={C.accent2}>+ Nova Ata de RP</Btn>
      </div>
      {atas.length===0 ? <EmptyState icon="atas" title="Nenhuma Ata cadastrada" sub="Registre uma Ata de Registro de Preços" /> : (
        <div style={{ display:"flex", flexDirection:"column", gap: isMobile ? 10 : 0, background: isMobile ? "transparent" : C.card, border: isMobile ? "none" : `1px solid ${C.border}`, borderRadius: isMobile ? 0 : 8, overflow: isMobile ? "visible" : "hidden", boxShadow: isMobile ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}>
          {atas.map((a,i)=>{
            const d = diasParaVencer(a.vigencia);
            const pct = a.valorTotal>0?((a.valorTotal-a.saldoDisponivel)/a.valorTotal*100).toFixed(0):"0";
            const statusLabel = d>0?"Vigente":d===0?"Vence hoje":"Vencida";

            if (isMobile) {
              return (
                <div key={a.id}
                  style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16, cursor:"pointer", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column", gap:8 }}
                  onClick={()=>setAtaAtiva(a.id)}>
                  {/* L1: número + badge */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:C.accent2 }}>{a.numero}</span>
                    <Badge label={statusLabel} />
                  </div>
                  {/* L2: valor grande em verde */}
                  <div>
                    <div style={{ fontSize:22, fontWeight:700, color:C.green, lineHeight:1.1 }}>{fmtBRL(a.saldoDisponivel)}</div>
                    <div style={{ display:"flex", gap:10, marginTop:3 }}>
                      <span style={{ fontSize:11, color:C.sub }}>saldo disponível</span>
                      <span style={{ fontSize:11, color:C.gold, fontWeight:600 }}>{pct}% utilizado</span>
                    </div>
                  </div>
                  {/* L3: objeto */}
                  <div style={{ fontSize:14, fontWeight:600, color:C.text, lineHeight:1.6, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                    {a.objeto}
                  </div>
                  {/* L4: fornecedor */}
                  <div style={{ fontSize:12, color:C.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {a.fornecedor}
                  </div>
                  {/* L5: CNPJ · Vigência */}
                  <div style={{ fontSize:12, color:C.tertiary }}>
                    {a.cnpj ? `CNPJ ${a.cnpj} · ` : ""}Vigência: {fmtDate(a.vigencia)}
                  </div>
                  {/* L6: botões de ação */}
                  <div style={{ display:"flex", gap:8, marginTop:2 }}>
                    {a.link_drive && (
                      <button onClick={e=>{ e.stopPropagation(); window.open(a.link_drive,"_blank","noopener"); }}
                        style={{ flex:1, minHeight:36, background:`${C.accent}12`, border:`1px solid ${C.accent}44`, borderRadius:8, color:C.accent, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        Drive
                      </button>
                    )}
                    <button onClick={e=>{ e.stopPropagation(); openEdit(a); }}
                      style={{ flex:1, minHeight:36, background:`${C.accent}12`, border:`1px solid ${C.accent}44`, borderRadius:8, color:C.accent, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                      Editar
                    </button>
                    <button onClick={e=>{ e.stopPropagation(); deletarAta(a.id); }}
                      style={{ flex:1, minHeight:36, background:`${C.red}12`, border:`1px solid ${C.red}44`, borderRadius:8, color:C.red, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                      Excluir
                    </button>
                  </div>
                  {/* Progress bar */}
                  <div style={{ background:C.subtle, borderRadius:3, height:3, overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:parseFloat(pct)>80?C.red:C.accent2 }} />
                  </div>
                </div>
              );
            }

            return (
              <div key={a.id} onClick={()=>setAtaAtiva(a.id)}
                style={{ padding:"14px 18px", borderBottom:i<atas.length-1?`1px solid ${C.border}`:"none", cursor:"pointer", transition:"background 0.12s" }}
                onMouseEnter={e=>e.currentTarget.style.background=C.overlay}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ fontSize:14, fontWeight:700, color:C.accent2, fontFamily:"Inter,system-ui,sans-serif" }}>{a.numero}</span>
                      <Badge label={statusLabel} />
                    </div>
                    <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.objeto}</div>
                    <div style={{ fontSize:12, color:C.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {a.fornecedor}{a.cnpj ? ` · CNPJ ${a.cnpj}` : ""} · Vigência: {fmtDate(a.vigencia)}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:8, flexShrink:0 }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:15, fontWeight:700, color:C.green }}>{fmtBRL(a.saldoDisponivel)}</div>
                      <div style={{ fontSize:11, color:C.sub }}>saldo disponível</div>
                      <div style={{ fontSize:11, color:C.gold, marginTop:1 }}>{pct}% utilizado</div>
                    </div>
                    {a.link_drive && (
                      <IconBtn name="externallink" color={C.accent} title="Abrir no Google Drive"
                        onClick={()=>window.open(a.link_drive,"_blank","noopener")} />
                    )}
                    <IconBtn name="edit" color={C.accent} title="Editar ata" onClick={()=>openEdit(a)} />
                    <IconBtn name="trash" color={C.red} title="Excluir ata" onClick={()=>deletarAta(a.id)} />
                  </div>
                </div>
                <div style={{ marginTop:10, background:C.subtle, borderRadius:3, height:3, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:parseFloat(pct)>80?C.red:C.accent2 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {modal && (
        <Modal title={editId?"Editar Ata de Registro de Preços":"Nova Ata de Registro de Preços"} onClose={()=>setModal(false)}>
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
            <Input label="Valor Total da Ata (R$)" value={form.valorTotal} onChange={v=>setForm(f=>({...f,valorTotal:v}))} placeholder="0,00" />
            <Input label="Endereço do Fornecedor" value={form.endereco} onChange={v=>setForm(f=>({...f,endereco:v}))} placeholder="Rua, número, bairro, cidade/UF" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Telefone" value={form.telefone} onChange={v=>setForm(f=>({...f,telefone:v}))} placeholder="(00) 00000-0000" />
              <Input label="E-mail" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} type="email" placeholder="contato@empresa.com.br" />
            </div>
            <Input label="Link do documento (Google Drive)" value={form.link_drive} onChange={v=>setForm(f=>({...f,link_drive:v}))} type="url" placeholder="https://drive.google.com/..." />
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="outline" onClick={()=>setModal(false)} color={C.sub}>Cancelar</Btn>
              <Btn onClick={salvar} color={C.accent2}>{editId?"Salvar Alterações":"Salvar Ata"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {confirmarExcluirId && (
        <Modal title="Excluir Ata" onClose={()=>setConfirmarExcluirId(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ fontSize:14, color:C.text, lineHeight:1.6 }}>
              Tem certeza que deseja excluir esta Ata de Registro de Preços?<br/>
              <span style={{ fontSize:12, color:C.sub }}>Esta ação não pode ser desfeita.</span>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn variant="outline" onClick={()=>setConfirmarExcluirId(null)} color={C.sub}>Cancelar</Btn>
              <Btn onClick={confirmarExclusaoAta} color={C.red}>Excluir</Btn>
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
const FORM_CT_EMPTY = { numero:"", objeto:"", fornecedor:"", cnpj:"", valor:"", inicio:"", fim:"", processo:"", link_drive:"" };

function TabContratos({ contratos, setContratos, toast }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [form, setForm] = useState(FORM_CT_EMPTY);

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

  const openNovo = () => { setEditId(null); setForm(FORM_CT_EMPTY); setModal(true); };
  const openEdit = (c) => {
    setEditId(c.id);
    setForm({ numero:c.numero, objeto:c.objeto, fornecedor:c.fornecedor, cnpj:c.cnpj||"", valor:String(c.valor||""), inicio:c.inicio||"", fim:c.fim||"", processo:c.processo||"", link_drive:c.link_drive||"" });
    setModal(true);
  };
  const deletar = (id) => {
    if (!window.confirm("Excluir este contrato?")) return;
    setContratos(prev=>prev.filter(c=>c.id!==id));
    toast("Contrato excluído");
    sbDeleteContrato(id).then(({error})=>{ if(error) toast("Erro ao excluir: "+error.message,"error"); });
  };

  const salvar = () => {
    if (!form.numero||!form.objeto||!form.fornecedor) { toast("Preencha os campos obrigatórios","error"); return; }
    if (editId) {
      const fields = { ...form, valor:parseBRL(form.valor) };
      setContratos(prev=>prev.map(c=>c.id===editId?{ ...c, ...fields }:c));
      toast("Contrato atualizado!");
      sbUpdateContrato(editId, { numero:fields.numero, objeto:fields.objeto, fornecedor:fields.fornecedor, cnpj:fields.cnpj||null, valor:fields.valor, inicio:fields.inicio||null, fim:fields.fim||null, processo:fields.processo||null, link_drive:fields.link_drive||null })
        .then(({error})=>{ if(error) toast("Erro ao salvar: "+error.message,"error"); });
    } else {
      const id = uid();
      const newItem = { id, ...form, valor:parseBRL(form.valor), status:"Vigente" };
      setContratos(prev=>[newItem, ...prev]);
      toast("Contrato cadastrado!");
      sbCreateContrato({ id, numero:form.numero, objeto:form.objeto, fornecedor:form.fornecedor, cnpj:form.cnpj||null, valor:parseBRL(form.valor), inicio:form.inicio||null, fim:form.fim||null, status:'Vigente', processo:form.processo||null, link_drive:form.link_drive||null })
        .then(({error})=>{ if(error) toast("Erro ao salvar: "+error.message,"error"); });
    }
    setModal(false);
  };

  const borderColor = (status) => status==="A vencer"?C.gold:status==="Vencido"?C.red:status==="Vigente"?C.green:"transparent";

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar contrato..."
          style={{ flex:1, minWidth:150, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none", transition:"border-color 0.14s, box-shadow 0.14s" }}
          onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
          onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
        <Select value={filtro} onChange={setFiltro} options={["Todos","Vigente","A vencer","Encerrado","Vencido"]} />
        <Btn onClick={openNovo} color={C.green}>+ Novo Contrato</Btn>
      </div>

      {filtered.length===0 ? <EmptyState icon="contratos" title="Nenhum contrato encontrado" sub="Cadastre contratos para acompanhar sua vigência" /> : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          {filtered.map((c,i)=>(
            <div key={c.id} style={{ padding:"13px 18px", borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none", borderLeft:`3px solid ${borderColor(c.status)}`, transition:"background 0.12s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.overlay}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:"Inter,system-ui,sans-serif" }}>{c.numero}</span>
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
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ textAlign:"right", marginRight:4 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{fmtBRL(c.valor)}</div>
                  </div>
                  {c.link_drive && (
                    <IconBtn name="externallink" color={C.accent} title="Abrir no Google Drive"
                      onClick={()=>window.open(c.link_drive,"_blank","noopener")} />
                  )}
                  <IconBtn name="edit" color={C.accent} title="Editar" onClick={()=>openEdit(c)} />
                  <IconBtn name="trash" color={C.red} title="Excluir" onClick={()=>deletar(c.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={editId?"Editar Contrato":"Novo Contrato"} onClose={()=>setModal(false)}>
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
              <Input label="Valor (R$)" value={form.valor} onChange={v=>setForm(f=>({...f,valor:v}))} placeholder="0,00" />
              <Input label="Início" value={form.inicio} onChange={v=>setForm(f=>({...f,inicio:v}))} type="date" />
              <Input label="Fim" value={form.fim} onChange={v=>setForm(f=>({...f,fim:v}))} type="date" />
            </div>
            <Input label="Link do documento (Google Drive)" value={form.link_drive} onChange={v=>setForm(f=>({...f,link_drive:v}))} type="url" placeholder="https://drive.google.com/..." />
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="outline" onClick={()=>setModal(false)} color={C.sub}>Cancelar</Btn>
              <Btn onClick={salvar} color={C.green}>{editId?"Salvar Alterações":"Salvar Contrato"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COTAÇÕES — inclui pesquisa automática via IA
══════════════════════════════════════════════════════════════ */

const SYSTEM_PESQUISA = `Você é especialista em pesquisa de preços para licitações públicas brasileiras (Lei 14.133/2021 e IN SEGES 65/2021). Para o objeto informado, pesquise preços reais de mercado em no mínimo 3 fontes distintas (e-commerce, PNCP, Comprasnet, BEC, distribuidoras, fabricantes). Retorne SOMENTE o seguinte JSON sem markdown, sem explicação, sem bloco de código:
{"fontes":[{"descricao":"","valor_unitario":0.00,"fornecedor":"","url":""}],"mediana":0.00,"valor_referencia":0.00,"precos_inexequiveis":[],"precos_excessivos":[],"texto_mapa_precos":""}
O campo texto_mapa_precos deve ser o texto formal do Mapa de Preços para instrução do processo licitatório, fundamentado na Lei 14.133/2021 art. 23 e IN SEGES 65/2021, citando as fontes consultadas e a mediana calculada.`;

function TabCotacoes({ cotacoes, setCotacoes, toast }) {
  const [modal, setModal] = useState(null);
  const [cotAtiva, setCotAtiva] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ numero:"", objeto:"", processo:"" });
  const [fornecedores, setFornecedores] = useState([{ id:"f1",razao:"",cnpj:"" },{ id:"f2",razao:"",cnpj:"" },{ id:"f3",razao:"",cnpj:"" }]);
  const [itens, setItens] = useState([{ id:"it1", descricao:"", unidade:"", qtd:"", valores:{} }]);

  // ── Pesquisa IA ─────────────────────────────────────────────
  const [objetoIA, setObjetoIA] = useState("");
  const [loadingIA, setLoadingIA] = useState(false);
  const [resultadoIA, setResultadoIA] = useState(null);
  const [mostrarTextoIA, setMostrarTextoIA] = useState(false);
  // Estado INDEPENDENTE para visualizar uma fonte — não interfere em nenhum outro estado
  const [fonteAberta, setFonteAberta] = useState(null);

  useOverlayBack(!!cotAtiva, () => setCotAtiva(null));
  useOverlayBack(!!resultadoIA, () => setResultadoIA(null));
  useOverlayBack(!!fonteAberta, () => setFonteAberta(null));

  const addFornecedor = () => setFornecedores(p=>[...p,{ id:uid(), razao:"", cnpj:"" }]);
  const remFornecedor = id => setFornecedores(p=>p.filter(f=>f.id!==id));
  const updForn = (id,field,val) => setFornecedores(p=>p.map(f=>f.id===id?{...f,[field]:val}:f));
  const addItem = () => setItens(p=>[...p,{ id:uid(), descricao:"", unidade:"", qtd:"", valores:{} }]);
  const remItem = id => setItens(p=>p.filter(i=>i.id!==id));
  const updItem = (id,field,val) => setItens(p=>p.map(i=>i.id===id?{...i,[field]:val}:i));
  const updValor = (itemId,fornId,val) => setItens(p=>p.map(i=>i.id===itemId?{...i,valores:{...i.valores,[fornId]:parseBRL(val)}}:i));

  const resetForm = () => {
    setForm({ numero:"", objeto:"", processo:"" });
    setFornecedores([{ id:"f1",razao:"",cnpj:"" },{ id:"f2",razao:"",cnpj:"" },{ id:"f3",razao:"",cnpj:"" }]);
    setItens([{ id:"it1",descricao:"",unidade:"",qtd:"",valores:{} }]);
    setStep(1);
  };

  const pesquisarIA = async () => {
    if (!objetoIA.trim()) { toast("Digite o objeto da licitação","error"); return; }
    setLoadingIA(true); setResultadoIA(null);
    try {
      const headers = {
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
        "content-type": "application/json",
      };
      let messages = [{ role:"user", content:`Pesquise preços de mercado para licitação pública — objeto: ${objetoIA.trim()}` }];
      let finalText = "";
      for (let iter = 0; iter < 6; iter++) {
        const res = await anthropicFetch(null, {
          method:"POST", headers,
          body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:4096, tools:[{ type:"web_search_20250305", name:"web_search" }], system:SYSTEM_PESQUISA, messages }),
        });
        if (!res.ok) { const e = await res.json().catch(()=>{}); throw new Error(e?.error?.message||`HTTP ${res.status}`); }
        const json = await res.json();
        const texts = (json.content||[]).filter(b=>b.type==="text").map(b=>b.text);
        if (texts.length) finalText = texts.join("\n");
        if (json.stop_reason === "end_turn") break;
        if (json.stop_reason === "tool_use") {
          messages.push({ role:"assistant", content:json.content });
          const tus = (json.content||[]).filter(b=>b.type==="tool_use");
          messages.push({ role:"user", content:tus.map(tu=>({ type:"tool_result", tool_use_id:tu.id, content:"Pesquisa executada." })) });
        } else break;
      }
      const m = finalText.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("IA não retornou JSON válido. Tente novamente.");
      const r = JSON.parse(m[0]);
      if (!r.fontes?.length) throw new Error("Nenhum preço encontrado. Reformule o objeto e tente novamente.");
      const vals = r.fontes.map(f=>parseFloat(f.valor_unitario)||0).filter(v=>v>0);
      r.mediana = calcMediana(vals);
      r.valor_referencia = r.mediana;
      r.precos_inexequiveis = vals.filter(v=>v < r.mediana*0.70);
      r.precos_excessivos   = vals.filter(v=>v > r.mediana*1.30);
      setResultadoIA(r);
    } catch(err) {
      toast(`Erro: ${err.message}`,"error");
    } finally { setLoadingIA(false); }
  };

  const confirmarIA = () => {
    if (!resultadoIA) return;
    const n = cotacoes.length+1;
    const fornFormatados = resultadoIA.fontes.map((f,i)=>({ id:uid(), razao:f.fornecedor||`Fornecedor ${i+1}`, cnpj:"" }));
    const valoresItem = Object.fromEntries(resultadoIA.fontes.map((f,i)=>[fornFormatados[i].id, parseFloat(f.valor_unitario)||0]));
    const cotId = uid();
    const newCot = {
      id:cotId,
      numero:`COT-IA ${String(n).padStart(3,"0")}/${new Date().getFullYear()}`,
      objeto:objetoIA.trim(),
      processo:"",
      status:"Finalizada",
      dataCriacao:hoje(),
      geradoPorIA:true,
      fontes_ia:resultadoIA.fontes,
      mediana:resultadoIA.mediana,
      texto_mapa_precos:resultadoIA.texto_mapa_precos,
      fornecedores:fornFormatados,
      itens:[{ id:uid(), descricao:objetoIA.trim(), unidade:"Un", qtd:"1", valores:valoresItem }],
    };
    setCotacoes(prev=>[newCot,...prev]);
    setResultadoIA(null); setObjetoIA("");
    toast("Cotação salva com mapa de preços gerado pela IA!");
    sbCreateCotacao(newCot).catch(err=>toast("Erro ao salvar no banco: "+err.message,"error"));
  };

  const salvarCotacao = () => {
    if (!form.numero||!form.objeto) { toast("Número e objeto são obrigatórios","error"); return; }
    const fornsValidos = fornecedores.filter(f=>f.razao.trim());
    if (fornsValidos.length < 2) { toast("Informe ao menos 2 fornecedores (Lei 14.133)","error"); return; }
    const itensValidos = itens.filter(i=>i.descricao.trim());
    if (!itensValidos.length) { toast("Adicione ao menos 1 item","error"); return; }
    const cotId = uid();
    const newCot = { id:cotId, ...form, status:"Finalizada", dataCriacao:hoje(), fornecedores:fornsValidos, itens:itensValidos };
    setCotacoes(p=>[newCot,...p]);
    setModal(null); resetForm();
    toast("Cotação finalizada — mapa de preços gerado!");
    sbCreateCotacao(newCot).catch(err=>toast("Erro ao salvar no banco: "+err.message,"error"));
  };

  // ── Tela de resultado IA ──────────────────────────────────
  if (resultadoIA) {
    const { fontes, mediana, precos_inexequiveis, precos_excessivos, texto_mapa_precos } = resultadoIA;
    return (
      <>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"Inter,system-ui,sans-serif", color:C.text }}>Resultado da Pesquisa IA</div>
            <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>{objetoIA}</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="outline" color={C.sub} size="sm" onClick={()=>setResultadoIA(null)}>← Refazer</Btn>
            <Btn color={C.green} size="sm" onClick={confirmarIA}>Confirmar e Salvar Cotação</Btn>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))", gap:10 }}>
          <KpiCard label="Fontes Pesquisadas" value={fontes.length} color={C.accent} />
          <KpiCard label="Mediana (Ref.)" value={fmtBRL(mediana)} sub="IN SEGES 65/2021" color={C.gold} />
          <KpiCard label="Inexequíveis" value={precos_inexequiveis.length} sub="< 70% da mediana" color={precos_inexequiveis.length?C.red:C.green} />
          <KpiCard label="Excessivos" value={precos_excessivos.length} sub="> 130% da mediana" color={precos_excessivos.length?C.red:C.green} />
        </div>

        {/* Tabela de fontes */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ padding:"13px 18px", borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:600, color:C.text, display:"flex", alignItems:"center", gap:8 }}>
            <Icon name="globe" size={14} color={C.accent} /> Fontes de Preço Pesquisadas
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
              <thead>
                <tr style={{ background:C.overlay }}>
                  {["Descrição","Fornecedor/Plataforma","Vlr. Unit.","Status","Fonte"].map(h=>(
                    <th key={h} style={{ padding:"9px 14px", fontSize:11, color:C.sub, fontWeight:600, textAlign:"left", textTransform:"uppercase", letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fontes.map((f,i)=>{
                  const v = parseFloat(f.valor_unitario)||0;
                  const isInex = v>0 && v < mediana*0.70;
                  const isExcess = v>0 && v > mediana*1.30;
                  const isMin = v>0 && v===Math.min(...fontes.map(x=>parseFloat(x.valor_unitario)||0).filter(x=>x>0));
                  return (
                    <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"11px 14px", fontSize:13, color:C.text, maxWidth:220, wordBreak:"break-word" }}>{f.descricao||objetoIA}</td>
                      <td style={{ padding:"11px 14px", fontSize:13, color:C.text, fontWeight:500 }}>{f.fornecedor}</td>
                      <td style={{ padding:"11px 14px", fontSize:13, fontWeight:700, color:isMin?C.green:C.text, whiteSpace:"nowrap" }}>{fmtBRL(v)}</td>
                      <td style={{ padding:"11px 14px" }}>
                        {isInex && <Badge label="Inexequível" color={C.red} />}
                        {isExcess && <Badge label="Excessivo" color={C.gold} />}
                        {!isInex && !isExcess && <Badge label="Regular" color={C.green} />}
                      </td>
                      <td style={{ padding:"11px 14px" }}>
                        {f.url ? (
                          <button
                            onClick={e=>{ e.stopPropagation(); setFonteAberta({ url:f.url, fornecedor:f.fornecedor, descricao:f.descricao||objetoIA, valor:f.valor_unitario }); }}
                            style={{ background:"none", border:`1px solid ${C.accentBorder}`, borderRadius:5, padding:"3px 10px", color:C.accent, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                            Ver fonte ↗
                          </button>
                        ) : <span style={{ fontSize:12, color:C.tertiary }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
                {/* Linha da Mediana */}
                <tr style={{ background:C.accentSubtle, borderTop:`2px solid ${C.accentBorder}` }}>
                  <td colSpan={2} style={{ padding:"11px 14px", fontSize:12, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"0.04em" }}>
                    Mediana — Valor de Referência (art. 23 Lei 14.133/2021)
                  </td>
                  <td colSpan={3} style={{ padding:"11px 14px", fontSize:16, fontWeight:800, color:C.gold }}>
                    {fmtBRL(mediana)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Alertas */}
        {(precos_inexequiveis.length > 0 || precos_excessivos.length > 0) && (
          <div style={{ background:"rgba(220,38,38,0.05)", border:`1px solid rgba(220,38,38,0.15)`, borderRadius:8, padding:"13px 16px", display:"flex", gap:8, alignItems:"flex-start" }}>
            <Icon name="warning" size={15} color={C.red} />
            <div style={{ fontSize:13, color:C.red, lineHeight:1.6 }}>
              {precos_inexequiveis.length>0 && <><strong>Preços inexequíveis detectados</strong> (abaixo de 70% da mediana — {precos_inexequiveis.map(v=>fmtBRL(v)).join(", ")}). Verificar antes de usar na pesquisa.<br/></>}
              {precos_excessivos.length>0 && <><strong>Preços excessivos detectados</strong> (acima de 130% da mediana — {precos_excessivos.map(v=>fmtBRL(v)).join(", ")}). Podem ser excluídos da amostra.</>}
            </div>
          </div>
        )}

        {/* Texto do mapa de preços */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ padding:"13px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:13, fontWeight:600, color:C.text, display:"flex", alignItems:"center", gap:8 }}>
              <Icon name="file" size={14} color={C.accent} /> Texto do Mapa de Preços
            </span>
            <button onClick={()=>setMostrarTextoIA(s=>!s)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:5, padding:"4px 10px", fontSize:12, color:C.sub, cursor:"pointer" }}>
              {mostrarTextoIA ? "Recolher" : "Expandir"}
            </button>
          </div>
          {mostrarTextoIA && (
            <div style={{ padding:"16px 18px", fontSize:13, color:C.text, lineHeight:1.9, whiteSpace:"pre-wrap", maxHeight:400, overflowY:"auto" }}>
              {texto_mapa_precos}
            </div>
          )}
          {!mostrarTextoIA && (
            <div style={{ padding:"12px 18px", fontSize:13, color:C.sub, fontStyle:"italic" }}>
              Clique em "Expandir" para ver o texto formal do mapa de preços pronto para instrução do processo.
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:4 }}>
          <Btn variant="outline" color={C.sub} onClick={()=>window.print()}>Imprimir</Btn>
          <Btn color={C.green} onClick={confirmarIA}>Confirmar e Salvar Cotação</Btn>
        </div>
      </div>

      {/* Mini-modal de visualização de fonte — estado INDEPENDENTE (fonteAberta), não afeta nenhum outro estado */}
      {fonteAberta && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", backdropFilter:"blur(3px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={e=>{ if(e.target===e.currentTarget) setFonteAberta(null); }}>
          <div style={{ background:C.card, border:`1px solid ${C.borderStrong}`, borderRadius:12, padding:"28px 32px", width:"100%", maxWidth:480, boxShadow:"0 20px 48px rgba(0,0,0,0.2)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={{ fontSize:15, fontWeight:700, color:C.text }}>Fonte Pesquisada</span>
              <button onClick={()=>setFonteAberta(null)} style={{ background:"none", border:"none", color:C.sub, cursor:"pointer", padding:4, borderRadius:4, display:"flex" }}>
                <Icon name="close" size={17} />
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {fonteAberta.fornecedor && (
                <div><div style={{ fontSize:11, color:C.sub, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>Fornecedor / Plataforma</div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{fonteAberta.fornecedor}</div>
                </div>
              )}
              {fonteAberta.descricao && (
                <div><div style={{ fontSize:11, color:C.sub, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>Descrição</div>
                  <div style={{ fontSize:13, color:C.text }}>{fonteAberta.descricao}</div>
                </div>
              )}
              {fonteAberta.valor && (
                <div><div style={{ fontSize:11, color:C.sub, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>Valor Unitário</div>
                  <div style={{ fontSize:16, fontWeight:700, color:C.green }}>{fmtBRL(parseFloat(fonteAberta.valor)||0)}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize:11, color:C.sub, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>URL da Fonte</div>
                <div style={{ background:C.overlay, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", fontSize:12, color:C.sub, wordBreak:"break-all", marginBottom:10 }}>{fonteAberta.url}</div>
                <Btn onClick={()=>window.open(fonteAberta.url,"_blank","noopener,noreferrer")} color={C.accent}>
                  Abrir site em nova aba ↗
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  if (cotAtiva) {
    const cot = cotacoes.find(c=>c.id===cotAtiva);
    if (!cot) { setCotAtiva(null); return null; }
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <Btn variant="outline" onClick={()=>setCotAtiva(null)} color={C.sub} size="sm">← Voltar</Btn>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"Inter,system-ui,sans-serif", color:C.text }}>{cot.numero}</div>
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
      {/* Painel de Pesquisa Automática com IA */}
      <div style={{ background:C.card, border:`1px solid ${C.accentBorder}`, borderRadius:8, padding:"18px 20px", marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
          <div style={{ background:C.accentSubtle, borderRadius:6, padding:"5px 7px", display:"flex" }}>
            <Icon name="sparkle" size={15} color={C.accent} strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text }}>Pesquisa Automática com IA</div>
            <div style={{ fontSize:12, color:C.sub }}>A IA busca preços reais na web e calcula a mediana (IN SEGES 65/2021)</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <input value={objetoIA} onChange={e=>setObjetoIA(e.target.value)}
            disabled={loadingIA}
            placeholder="Ex: aquisição de notebooks Dell i5 8GB, 512GB SSD, Windows 11"
            style={{ flex:1, minWidth:220, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"9px 13px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none", transition:"border-color 0.14s, box-shadow 0.14s" }}
            onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
            onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }}
            onKeyDown={e=>e.key==="Enter"&&!loadingIA&&pesquisarIA()} />
          <Btn onClick={pesquisarIA} disabled={loadingIA||!objetoIA.trim()} color={C.accent} style={{ display:"flex", alignItems:"center", gap:6 }}>
            {loadingIA ? (
              <><div style={{ width:13, height:13, border:"2px solid rgba(255,255,255,0.35)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} /> Pesquisando...</>
            ) : (
              <><Icon name="globe" size={14} color="#fff" /> Pesquisar Preços</>
            )}
          </Btn>
        </div>
        {loadingIA && (
          <div style={{ marginTop:10, fontSize:12, color:C.accent, display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:10, height:10, border:"1.5px solid rgba(37,99,235,0.3)", borderTopColor:C.accent, borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
            Pesquisando preços no mercado — isso pode levar até 30 segundos...
          </div>
        )}
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
        <Btn onClick={()=>{ resetForm(); setModal("nova"); }} color={C.accent} variant="outline">+ Nova Pesquisa Manual</Btn>
      </div>

      {cotacoes.length===0 ? <EmptyState icon="cotacoes" title="Nenhuma cotação cadastrada" sub="Crie uma pesquisa de preços conforme Lei 14.133/2021" /> : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          {cotacoes.map((c,i)=>(
            <div key={c.id}
              style={{ padding:"13px 18px", borderBottom:i<cotacoes.length-1?`1px solid ${C.border}`:"none", transition:"background 0.12s", cursor:"pointer" }}
              onClick={()=>setCotAtiva(c.id)}
              onMouseEnter={e=>e.currentTarget.style.background=C.overlay}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:"Inter,system-ui,sans-serif" }}>{c.numero}</span>
                    <Badge label={c.status} />
                  </div>
                  <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:3 }}>{c.objeto}</div>
                  <div style={{ fontSize:12, color:C.sub }}>
                    {c.fornecedores.length} fornecedores · {c.itens.length} itens · {fmtDate(c.dataCriacao)}
                    {c.processo && ` · Proc. ${c.processo}`}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:12, color:C.accent, fontWeight:500 }}>Ver mapa →</span>
                  <IconBtn name="trash" color={C.red} title="Excluir cotação" onClick={()=>{ if(window.confirm("Excluir esta cotação?")) { setCotacoes(p=>p.filter(x=>x.id!==c.id)); toast("Cotação excluída"); sbDeleteCotacao(c.id).then(({error})=>{ if(error) toast("Erro ao excluir: "+error.message,"error"); }); } }} />
                </div>
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
                        value={it.valores[f.id]||""} onChange={v=>updValor(it.id,f.id,v)} placeholder="0,00" />
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
   DISPENSA / INEXIGIBILIDADE
══════════════════════════════════════════════════════════════ */
const CD_STATUS = ["Em andamento","Concluída","Cancelada"];
const CD_STATUS_COLOR = { "Em andamento": C.accent, "Concluída": C.green, "Cancelada": C.red };
const CD_FORM_EMPTY = { numero_processo:"", objeto:"", contratada:"", cnpj:"", valor_total:"", data_ratificacao:"", vigencia:"", secretaria:"", link_drive:"", status:"Em andamento" };

function useMobileCD() {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

function TabContratacaoDireta({ tipo, color, items, setItems, toast }) {
  const isMobile = useMobileCD();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [form, setForm] = useState(CD_FORM_EMPTY);

  const f = v => v => setForm(p => ({ ...p, ...v }));
  const ff = k => v => setForm(p => ({ ...p, [k]: v }));

  const filtered = items.filter(it => {
    const okStatus = filtro === "Todos" || it.status === filtro;
    const s = search.toLowerCase();
    return okStatus && (
      (it.numero_processo||"").toLowerCase().includes(s) ||
      (it.objeto||"").toLowerCase().includes(s) ||
      (it.contratada||"").toLowerCase().includes(s)
    );
  }).sort((a, b) => {
    if (!a.data_ratificacao && !b.data_ratificacao) return 0;
    if (!a.data_ratificacao) return 1;
    if (!b.data_ratificacao) return -1;
    return b.data_ratificacao.localeCompare(a.data_ratificacao);
  });

  const openNovo = () => { setEditId(null); setForm(CD_FORM_EMPTY); setModal(true); };
  const openEdit = (it) => {
    setEditId(it.id);
    setForm({ numero_processo:it.numero_processo||"", objeto:it.objeto||"", contratada:it.contratada||"", cnpj:it.cnpj||"", valor_total:String(it.valor_total||""), data_ratificacao:it.data_ratificacao||"", vigencia:it.vigencia||"", secretaria:it.secretaria||"", link_drive:it.link_drive||"", status:it.status||"Em andamento" });
    setModal(true);
  };
  const deletar = (id) => {
    if (!window.confirm(`Excluir esta ${tipo.toLowerCase()}?`)) return;
    setItems(prev=>prev.filter(it=>it.id!==id));
    toast(`${tipo} excluída`);
    const sbDel = tipo==="Dispensa" ? sbDeleteDispensa : sbDeleteInexigibilidade;
    sbDel(id).then(({error})=>{ if(error) toast("Erro ao excluir: "+error.message,"error"); });
  };

  const salvar = () => {
    if (!form.numero_processo || !form.objeto || !form.contratada) { toast("Preencha os campos obrigatórios","error"); return; }
    if (editId) {
      const fields = { ...form, valor_total:parseBRL(form.valor_total) };
      setItems(prev=>prev.map(it=>it.id===editId ? { ...it, ...fields } : it));
      toast(`${tipo} atualizada!`);
      const sbUpd = tipo==="Dispensa" ? sbUpdateDispensa : sbUpdateInexigibilidade;
      sbUpd(editId, { numero_processo:fields.numero_processo, objeto:fields.objeto, contratada:fields.contratada, cnpj:fields.cnpj||null, valor_total:fields.valor_total, data_ratificacao:fields.data_ratificacao||null, vigencia:fields.vigencia||null, secretaria:fields.secretaria||null, link_drive:fields.link_drive||null, status:fields.status })
        .then(({error})=>{ if(error) toast("Erro ao salvar: "+error.message,"error"); });
    } else {
      const id = uid();
      const newItem = { id, ...form, valor_total:parseBRL(form.valor_total) };
      setItems(prev=>[newItem, ...prev]);
      toast(`${tipo} cadastrada!`);
      const sbCreate = tipo==="Dispensa" ? sbCreateDispensa : sbCreateInexigibilidade;
      sbCreate({ id, numero_processo:form.numero_processo, objeto:form.objeto, contratada:form.contratada, cnpj:form.cnpj||null, valor_total:parseBRL(form.valor_total), data_ratificacao:form.data_ratificacao||null, vigencia:form.vigencia||null, secretaria:form.secretaria||null, link_drive:form.link_drive||null, status:form.status })
        .then(({error})=>{ if(error) toast("Erro ao salvar: "+error.message,"error"); });
    }
    setModal(false); setForm(CD_FORM_EMPTY);
  };

  const valorTotal = filtered.reduce((s,it)=>s+(it.valor_total||0),0);

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Buscar ${tipo.toLowerCase()}...`}
          style={{ flex:1, minWidth:150, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none" }}
          onFocus={e=>{ e.target.style.borderColor=color; e.target.style.boxShadow=`0 0 0 3px ${color}22`; }}
          onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
        <Select value={filtro} onChange={setFiltro} options={["Todos",...CD_STATUS]} />
        <Btn onClick={openNovo} color={color}>+ Nova {tipo}</Btn>
      </div>

      {filtered.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10, marginBottom:16 }}>
          <KpiCard label="Registros" value={filtered.length} color={color} />
          <KpiCard label="Valor Total" value={fmtBRL(valorTotal)} color={color} />
          <KpiCard label="Em andamento" value={filtered.filter(it=>it.status==="Em andamento").length} color={C.accent} />
          <KpiCard label="Concluídas" value={filtered.filter(it=>it.status==="Concluída").length} color={C.green} />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={tipo==="Dispensa"?"dispensa":"inexigib"} title={`Nenhuma ${tipo} encontrada`} sub={`Cadastre uma ${tipo} de contratação`} />
      ) : isMobile ? (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(it => (
            <div key={it.id} style={{
              background:"#121212", border:"1px solid #2a2a2a",
              borderLeft:`4px solid ${CD_STATUS_COLOR[it.status]||color}`,
              borderRadius:12, padding:16, boxShadow:"0 1px 3px rgba(0,0,0,0.25)",
              display:"flex", flexDirection:"column", gap:8,
            }}>
              {/* Linha 1: número + badge */}
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:13, fontWeight:700, color, fontFamily:"Inter,system-ui,sans-serif" }}>{it.numero_processo}</span>
                <Badge label={it.status} />
              </div>
              {/* Linha 2: valor */}
              <div style={{ fontSize:22, fontWeight:700, color, lineHeight:1.1 }}>{fmtBRL(it.valor_total)}</div>
              {/* Linha 3: objeto */}
              <div style={{ fontSize:14, fontWeight:600, color:"#e0e0e0", lineHeight:1.5, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{it.objeto}</div>
              {/* Linha 4: contratada */}
              <div style={{ fontSize:12, color:"#a0a0a0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{it.contratada}</div>
              {/* Linha 5: CNPJ · Vigência */}
              <div style={{ fontSize:12, color:"#8a8a8a" }}>
                {it.cnpj ? `CNPJ ${it.cnpj}` : ""}
                {it.cnpj && it.vigencia ? " · " : ""}
                {it.vigencia ? `Vigência: ${fmtDate(it.vigencia)}` : ""}
                {it.data_ratificacao ? ` · Rat.: ${fmtDate(it.data_ratificacao)}` : ""}
              </div>
              {/* Linha 6: botões */}
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                {it.link_drive && (
                  <button onClick={()=>window.open(it.link_drive,"_blank","noopener")}
                    style={{ flex:1, minHeight:36, background:`${color}12`, border:`1px solid ${color}44`, borderRadius:8, color, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    Drive
                  </button>
                )}
                <button onClick={()=>openEdit(it)}
                  style={{ flex:1, minHeight:36, background:`${C.accent}12`, border:`1px solid ${C.accent}44`, borderRadius:8, color:C.accent, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  Editar
                </button>
                <button onClick={()=>deletar(it.id)}
                  style={{ flex:1, minHeight:36, background:`${C.red}12`, border:`1px solid ${C.red}44`, borderRadius:8, color:C.red, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          {filtered.map((it,i) => (
            <div key={it.id} style={{ padding:"13px 18px", borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none", borderLeft:`3px solid ${CD_STATUS_COLOR[it.status]||C.border}`, transition:"background 0.12s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.overlay}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:14, fontWeight:700, color, fontFamily:"Inter,system-ui,sans-serif" }}>{it.numero_processo}</span>
                    <Badge label={it.status} />
                  </div>
                  <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{it.objeto}</div>
                  <div style={{ fontSize:12, color:C.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {it.contratada}{it.cnpj ? ` · CNPJ ${it.cnpj}` : ""}{it.secretaria ? ` · ${it.secretaria}` : ""}
                  </div>
                  <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>
                    {it.data_ratificacao && <>Ratificação: {fmtDate(it.data_ratificacao)}</>}
                    {it.vigencia && <> · Vigência: {fmtDate(it.vigencia)}</>}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ textAlign:"right", marginRight:4 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{fmtBRL(it.valor_total)}</div>
                  </div>
                  {it.link_drive && (
                    <IconBtn name="externallink" color={color} title="Abrir no Google Drive" onClick={()=>window.open(it.link_drive,"_blank","noopener")} />
                  )}
                  <IconBtn name="edit" color={C.accent} title="Editar" onClick={()=>openEdit(it)} />
                  <IconBtn name="trash" color={C.red} title="Excluir" onClick={()=>deletar(it.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={editId ? `Editar ${tipo}` : `Nova ${tipo}`} onClose={()=>setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Número do Processo" value={form.numero_processo} onChange={ff("numero_processo")} placeholder="001/2025" required />
              <div><div style={{ fontSize:12, color:C.sub, marginBottom:4 }}>Status</div><Select value={form.status} onChange={ff("status")} options={CD_STATUS} /></div>
            </div>
            <Input label="Objeto" value={form.objeto} onChange={ff("objeto")} placeholder="Objeto da contratação" required />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Contratada (Razão Social)" value={form.contratada} onChange={ff("contratada")} placeholder="Razão social" required />
              <Input label="CNPJ" value={form.cnpj} onChange={ff("cnpj")} placeholder="00.000.000/0001-00" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <Input label="Valor Total (R$)" value={form.valor_total} onChange={ff("valor_total")} placeholder="0,00" />
              <Input label="Data de Ratificação" value={form.data_ratificacao} onChange={ff("data_ratificacao")} type="date" />
              <Input label="Vigência (Fim)" value={form.vigencia} onChange={ff("vigencia")} type="date" />
            </div>
            <Input label="Secretaria" value={form.secretaria} onChange={ff("secretaria")} placeholder="Secretaria solicitante" />
            <Input label="Link do documento (Google Drive)" value={form.link_drive} onChange={ff("link_drive")} type="url" placeholder="https://drive.google.com/..." />
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="outline" onClick={()=>setModal(false)} color={C.sub}>Cancelar</Btn>
              <Btn onClick={salvar} color={color}>{editId ? "Salvar Alterações" : `Salvar ${tipo}`}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AGENTE DE DISPENSAS — geração automatizada do processo (Lei 14.133/2021)
   Identidade visual Shawex: Preto · Prata · Laranja Abóbora
══════════════════════════════════════════════════════════════ */
const SX = {
  preto:      "#121212",
  pretoSoft:  "#1a1a1a",
  prata:      "#E0E0E0",
  prataEsc:   "#C0C0C0",
  laranja:    "#FF7A00",
  laranjaEsc: "#e56e00",
};

const DISPENSA_CONFIG_EMPTY = {
  id:null, municipio:"", uf:"", cnpjMunicipio:"", endereco:"", cep:"", emailLicitacao:"",
  prefeitoNome:"", prefeitoCpf:"", agenteContratacaoNome:"", agenteContratacaoMatricula:"",
  procuradorNome:"", procuradorOab:"", secretarioFinancasNome:"", portariaAgente:"", decretoMunicipal:"",
};

const DISPENSA_FORM_EMPTY = {
  id:null,
  objeto:"", tipoObjeto:"compras_servicos", valorEstimado:"", prazoExecucao:"", unidadeGestora:"",
  numeroProcesso:"", numeroDispensa:"",
  secretariaDemandante:"", justificativa:"",
  dataAbertura:"", dataSessao:"",
  empresaRazaoSocial:"", empresaCnpj:"", empresaEndereco:"",
  empresaRepresentante:"", empresaRepresentanteCpf:"", empresaRepresentanteRg:"",
  dotacaoOrcamentaria:"", fiscalContrato:"", fiscalContratoCpf:"",
  numeroContrato:"", vigenciaContrato:"12 (doze) meses",
  itens:[],
};

function TextArea({ label, value, onChange, rows=3, placeholder="" }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      {label && <label style={{ fontSize:12, color:C.sub, fontWeight:500 }}>{label}</label>}
      <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
          padding:"8px 11px", color:C.text, fontSize:13, fontFamily:"inherit",
          outline:"none", width:"100%", boxSizing:"border-box", resize:"vertical",
        }}
        onFocus={e=>{ e.target.style.borderColor=SX.laranja; e.target.style.boxShadow=`0 0 0 3px ${SX.laranja}22`; }}
        onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }}
      />
    </div>
  );
}

function TabAgenteDispensas({ toast }) {
  const isMobile = useMobileCD();
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [configModal, setConfigModal] = useState(false);
  const [config, setConfig] = useState(DISPENSA_CONFIG_EMPTY);
  const [form, setForm] = useState(DISPENSA_FORM_EMPTY);
  const [gerando, setGerando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [salvandoRascunho, setSalvandoRascunho] = useState(false);

  const ff = k => v => setForm(p => ({ ...p, [k]: v }));

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sbListDispensaProcessos();
    if (error) toast("Erro ao carregar processos: " + error.message, "error");
    setProcessos(data);
    setLoading(false);
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    sbGetDispensaConfig().then(({ data, error }) => {
      if (error) { toast("Erro ao carregar configuração institucional: " + error.message, "error"); return; }
      if (data) setConfig(data);
    });
  }, [toast]);

  const valorNum = parseBRL(form.valorEstimado);
  const validacao = validarLimiteLegal({ tipoObjeto: form.tipoObjeto, valorEstimado: valorNum });

  const openNovo = () => { setForm(DISPENSA_FORM_EMPTY); setResultado(null); setModal(true); };
  const openEdit = (p) => {
    setForm({
      ...DISPENSA_FORM_EMPTY,
      ...p.dadosComplementares,
      id: p.id,
      objeto: p.objeto, tipoObjeto: p.tipoObjeto, valorEstimado: String(p.valorEstimado || ""),
      prazoExecucao: p.prazoExecucao, unidadeGestora: p.unidadeGestora,
      numeroProcesso: p.numeroProcesso, numeroDispensa: p.numeroDispensa,
      itens: (p.dadosComplementares && p.dadosComplementares.itens) || [],
    });
    setResultado(p.docxUrl || p.pdfUrl ? { docxUrl:p.docxUrl, pdfUrl:p.pdfUrl } : null);
    setModal(true);
  };

  const deletar = async (id) => {
    if (!window.confirm("Excluir este processo de dispensa? Os arquivos gerados permanecerão no histórico do Storage.")) return;
    const { error } = await sbDeleteDispensaProcesso(id);
    if (error) { toast("Erro ao excluir: " + error.message, "error"); return; }
    setProcessos(prev => prev.filter(p => p.id !== id));
    toast("Processo excluído");
  };

  const montarInput = () => ({
    id: form.id,
    objeto: form.objeto,
    tipoObjeto: form.tipoObjeto,
    valorEstimado: valorNum,
    prazoExecucao: form.prazoExecucao,
    unidadeGestora: form.unidadeGestora,
    numeroProcesso: form.numeroProcesso,
    numeroDispensa: form.numeroDispensa,
    dadosComplementares: {
      secretariaDemandante: form.secretariaDemandante,
      justificativa: form.justificativa,
      dataAbertura: form.dataAbertura,
      dataSessao: form.dataSessao,
      empresaRazaoSocial: form.empresaRazaoSocial,
      empresaCnpj: form.empresaCnpj,
      empresaEndereco: form.empresaEndereco,
      empresaRepresentante: form.empresaRepresentante,
      empresaRepresentanteCpf: form.empresaRepresentanteCpf,
      empresaRepresentanteRg: form.empresaRepresentanteRg,
      dotacaoOrcamentaria: form.dotacaoOrcamentaria,
      fiscalContrato: form.fiscalContrato,
      fiscalContratoCpf: form.fiscalContratoCpf,
      numeroContrato: form.numeroContrato,
      vigenciaContrato: form.vigenciaContrato,
      itens: form.itens,
    },
  });

  const salvarRascunho = async () => {
    if (!form.objeto) { toast("Informe o objeto da contratação", "error"); return; }
    setSalvandoRascunho(true);
    const { data, error } = await sbSaveRascunho(montarInput());
    setSalvandoRascunho(false);
    if (error) { toast("Erro ao salvar rascunho: " + error.message, "error"); return; }
    setForm(f => ({ ...f, id: data.id }));
    setProcessos(prev => [data, ...prev.filter(p => p.id !== data.id)]);
    toast("Rascunho salvo");
  };

  const gerar = async () => {
    if (!form.objeto || !valorNum) { toast("Informe objeto e valor estimado", "error"); return; }
    if (!config.municipio) { toast("Configure os dados institucionais (Prefeitura, Prefeito, Agente de Contratação) antes de gerar", "error"); setConfigModal(true); return; }
    setGerando(true);
    try {
      const { processo, docxUrl, pdfUrl } = await gerarProcessoDispensa({ processoId: form.id, input: montarInput(), config });
      setForm(f => ({ ...f, id: processo.id }));
      setResultado({ docxUrl, pdfUrl });
      setProcessos(prev => [processo, ...prev.filter(p => p.id !== processo.id)]);
      toast("Processo gerado com sucesso!");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setGerando(false);
    }
  };

  const salvarConfig = async () => {
    const { data, error } = await sbSaveDispensaConfig(config);
    if (error) { toast("Erro ao salvar configuração: " + error.message, "error"); return; }
    setConfig(data);
    toast("Configuração institucional salva");
    setConfigModal(false);
  };

  const addItem = () => setForm(f => ({ ...f, itens: [...f.itens, { descricao:"", unidade:"", quantidade:"", valorUnitario:"" }] }));
  const updItem = (i, k, v) => setForm(f => {
    const itens = [...f.itens];
    itens[i] = { ...itens[i], [k]: v };
    if (k === "quantidade" || k === "valorUnitario") {
      itens[i].total = (parseBRL(itens[i].quantidade) || 0) * (parseBRL(itens[i].valorUnitario) || 0);
    }
    return { ...f, itens };
  });
  const rmItem = (i) => setForm(f => ({ ...f, itens: f.itens.filter((_, idx) => idx !== i) }));

  const filtered = processos.filter(p => {
    const s = search.toLowerCase();
    return (p.objeto||"").toLowerCase().includes(s) || (p.numeroProcesso||"").toLowerCase().includes(s) || (p.numeroDispensa||"").toLowerCase().includes(s);
  });

  const valorTotal = filtered.reduce((s,p)=>s+(p.valorEstimado||0),0);

  return (
    <div>
      <div style={{
        background: `linear-gradient(135deg, ${SX.preto} 0%, ${SX.pretoSoft} 100%)`,
        border: `1px solid ${SX.laranja}33`, borderRadius: 12, padding: "18px 20px",
        marginBottom: 16, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12,
      }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff", fontFamily:"Inter,system-ui,sans-serif", display:"flex", alignItems:"center", gap:8 }}>
            <Icon name="sparkle" size={18} color={SX.laranja} />
            Agente de Dispensas
          </div>
          <div style={{ fontSize:12, color:SX.prata, marginTop:3 }}>Geração automatizada do processo de Dispensa de Licitação — Lei nº 14.133/2021, art. 75, II</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="outline" color={SX.prata} onClick={()=>setConfigModal(true)} style={{ borderColor:`${SX.prata}55`, color:SX.prata }}>
            <Icon name="settings" size={14} /> Configurações
          </Btn>
          <Btn color={SX.laranja} onClick={openNovo}>
            <Icon name="plus" size={14} /> Novo Processo
          </Btn>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por objeto, processo ou dispensa..."
          style={{ flex:1, minWidth:150, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none" }}
          onFocus={e=>{ e.target.style.borderColor=SX.laranja; e.target.style.boxShadow=`0 0 0 3px ${SX.laranja}22`; }}
          onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
      </div>

      {filtered.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10, marginBottom:16 }}>
          <KpiCard label="Processos" value={filtered.length} color={SX.laranja} />
          <KpiCard label="Valor Total Estimado" value={fmtBRL(valorTotal)} color={SX.laranja} />
          <KpiCard label="Gerados" value={filtered.filter(p=>p.status==="Gerado"||p.status==="Concluído").length} color={C.green} />
          <KpiCard label="Bloqueados (limite legal)" value={filtered.filter(p=>p.status==="Bloqueado").length} color={C.red} />
        </div>
      )}

      {loading ? (
        <div style={{ padding:40, textAlign:"center", color:C.sub, fontSize:13 }}>Carregando processos...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="dispensa" title="Nenhum processo de dispensa" sub='Clique em "Novo Processo" para gerar sua primeira dispensa de licitação' />
      ) : isMobile ? (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(p => (
            <div key={p.id} style={{
              background:C.card, border:`1px solid ${C.border}`,
              borderLeft:`4px solid ${p.excedeLimite ? C.red : SX.laranja}`,
              borderRadius:12, padding:16, boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
              display:"flex", flexDirection:"column", gap:8,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:13, fontWeight:700, color:SX.laranjaEsc, fontFamily:"Inter,system-ui,sans-serif" }}>
                  Dispensa {p.numeroDispensa || "—"}
                </span>
                <Badge label={p.status} color={p.status==="Bloqueado"?C.red:(p.status==="Gerado"||p.status==="Concluído")?C.green:undefined} />
              </div>
              <div style={{ fontSize:22, fontWeight:700, color:C.text, lineHeight:1.1 }}>{fmtBRL(p.valorEstimado)}</div>
              <div style={{ fontSize:14, fontWeight:600, color:C.text, lineHeight:1.5, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{p.objeto}</div>
              <div style={{ fontSize:12, color:C.sub }}>{p.unidadeGestora}</div>
              <div style={{ fontSize:12, color:C.tertiary }}>Processo {p.numeroProcesso || "—"}{p.prazoExecucao ? ` · Prazo: ${p.prazoExecucao}` : ""}</div>
              <div style={{ display:"flex", gap:8, marginTop:4, flexWrap:"wrap" }}>
                {p.docxUrl && (
                  <button onClick={()=>window.open(p.docxUrl,"_blank","noopener")}
                    style={{ flex:1, minHeight:36, background:`${SX.laranja}14`, border:`1px solid ${SX.laranja}55`, borderRadius:8, color:SX.laranjaEsc, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    DOCX
                  </button>
                )}
                {p.pdfUrl && (
                  <button onClick={()=>window.open(p.pdfUrl,"_blank","noopener")}
                    style={{ flex:1, minHeight:36, background:`${SX.preto}0d`, border:`1px solid ${SX.preto}44`, borderRadius:8, color:SX.preto, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    PDF
                  </button>
                )}
                <button onClick={()=>openEdit(p)}
                  style={{ flex:1, minHeight:36, background:`${C.accent}12`, border:`1px solid ${C.accent}44`, borderRadius:8, color:C.accent, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  Editar
                </button>
                <button onClick={()=>deletar(p.id)}
                  style={{ flex:1, minHeight:36, background:`${C.red}12`, border:`1px solid ${C.red}44`, borderRadius:8, color:C.red, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          {filtered.map((p,i) => (
            <div key={p.id} style={{ padding:"13px 18px", borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none", borderLeft:`3px solid ${p.excedeLimite ? C.red : SX.laranja}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:14, fontWeight:700, color:SX.laranjaEsc, fontFamily:"Inter,system-ui,sans-serif" }}>Dispensa {p.numeroDispensa || "—"}</span>
                    <Badge label={p.status} color={p.status==="Bloqueado"?C.red:(p.status==="Gerado"||p.status==="Concluído")?C.green:undefined} />
                  </div>
                  <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.objeto}</div>
                  <div style={{ fontSize:12, color:C.sub }}>{p.unidadeGestora} · Processo {p.numeroProcesso || "—"}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ textAlign:"right", marginRight:4 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{fmtBRL(p.valorEstimado)}</div>
                  </div>
                  {p.docxUrl && <IconBtn name="file" color={SX.laranjaEsc} title="Baixar .docx" onClick={()=>window.open(p.docxUrl,"_blank","noopener")} />}
                  {p.pdfUrl && <IconBtn name="file" color={SX.preto} title="Baixar .pdf" onClick={()=>window.open(p.pdfUrl,"_blank","noopener")} />}
                  <IconBtn name="edit" color={C.accent} title="Editar" onClick={()=>openEdit(p)} />
                  <IconBtn name="trash" color={C.red} title="Excluir" onClick={()=>deletar(p.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={form.id ? "Editar Processo de Dispensa" : "Novo Processo de Dispensa"} onClose={()=>setModal(false)} wide>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            <div style={{ fontSize:11, fontWeight:700, color:SX.laranjaEsc, textTransform:"uppercase", letterSpacing:"0.05em" }}>1. Dados da Contratação</div>
            <TextArea label="Objeto da Contratação" value={form.objeto} onChange={ff("objeto")} rows={2} placeholder="Descreva o objeto a ser contratado" />
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Select label="Tipo do Objeto" value={form.tipoObjeto} onChange={ff("tipoObjeto")} options={TIPOS_OBJETO} />
              <Input label="Valor Estimado (R$)" value={form.valorEstimado} onChange={ff("valorEstimado")} placeholder="0,00" required />
            </div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Input label="Prazo de Execução" value={form.prazoExecucao} onChange={ff("prazoExecucao")} placeholder="Ex.: 12 meses" />
              <Input label="Unidade Gestora" value={form.unidadeGestora} onChange={ff("unidadeGestora")} placeholder="Ex.: Secretaria Municipal de Obras" />
            </div>

            <div style={{
              background: validacao.excede ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${validacao.excede ? "#fecaca" : "#bbf7d0"}`,
              borderRadius:8, padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start",
            }}>
              <Icon name="warning" size={16} color={validacao.excede ? C.red : C.green} />
              <div style={{ fontSize:12.5, color: validacao.excede ? "#991b1b" : "#166534", lineHeight:1.5 }}>{validacao.mensagem}</div>
            </div>

            <div style={{ fontSize:11, fontWeight:700, color:SX.laranjaEsc, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:6 }}>2. Numeração e Datas</div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Input label="Número do Processo Administrativo" value={form.numeroProcesso} onChange={ff("numeroProcesso")} placeholder="013/2026" />
              <Input label="Número da Dispensa" value={form.numeroDispensa} onChange={ff("numeroDispensa")} placeholder="005/2026" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Input label="Data de Abertura" value={form.dataAbertura} onChange={ff("dataAbertura")} type="date" />
              <Input label="Data da Sessão/Ratificação" value={form.dataSessao} onChange={ff("dataSessao")} type="date" />
            </div>

            <div style={{ fontSize:11, fontWeight:700, color:SX.laranjaEsc, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:6 }}>3. Justificativa e Unidade Demandante</div>
            <Input label="Secretaria/Unidade Demandante" value={form.secretariaDemandante} onChange={ff("secretariaDemandante")} placeholder="Ex.: Secretaria Municipal de Planejamento e Obras" />
            <TextArea label="Justificativa da Necessidade" value={form.justificativa} onChange={ff("justificativa")} rows={3} placeholder="Justificativa técnica da contratação (opcional — o Agente gera um texto padrão se deixado em branco)" />

            <div style={{ fontSize:11, fontWeight:700, color:SX.laranjaEsc, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:6 }}>4. Empresa Vencedora (complementar após cotação)</div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Input label="Razão Social" value={form.empresaRazaoSocial} onChange={ff("empresaRazaoSocial")} placeholder="Razão social da empresa" />
              <Input label="CNPJ" value={form.empresaCnpj} onChange={ff("empresaCnpj")} placeholder="00.000.000/0001-00" />
            </div>
            <Input label="Endereço da Empresa" value={form.empresaEndereco} onChange={ff("empresaEndereco")} placeholder="Endereço completo" />
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap:12 }}>
              <Input label="Representante" value={form.empresaRepresentante} onChange={ff("empresaRepresentante")} placeholder="Nome do representante" />
              <Input label="CPF do Representante" value={form.empresaRepresentanteCpf} onChange={ff("empresaRepresentanteCpf")} placeholder="000.000.000-00" />
              <Input label="RG do Representante" value={form.empresaRepresentanteRg} onChange={ff("empresaRepresentanteRg")} placeholder="00.000.000-0" />
            </div>

            <div style={{ fontSize:11, fontWeight:700, color:SX.laranjaEsc, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:6 }}>5. Dotação, Contrato e Fiscalização</div>
            <TextArea label="Dotação Orçamentária" value={form.dotacaoOrcamentaria} onChange={ff("dotacaoOrcamentaria")} rows={2} placeholder="Poder / Órgão / Unidade / Elemento de despesa / Fonte de recurso" />
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Input label="Número do Contrato" value={form.numeroContrato} onChange={ff("numeroContrato")} placeholder="001/2026" />
              <Input label="Vigência do Contrato" value={form.vigenciaContrato} onChange={ff("vigenciaContrato")} placeholder="12 (doze) meses" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Input label="Fiscal do Contrato" value={form.fiscalContrato} onChange={ff("fiscalContrato")} placeholder="Nome do fiscal designado" />
              <Input label="CPF do Fiscal" value={form.fiscalContratoCpf} onChange={ff("fiscalContratoCpf")} placeholder="000.000.000-00" />
            </div>

            <div style={{ fontSize:11, fontWeight:700, color:SX.laranjaEsc, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:6 }}>6. Itens / Planilha de Custos (opcional)</div>
            {form.itens.map((it, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "3fr 1fr 1fr 1fr auto", gap:8, alignItems:"end" }}>
                <Input label={i===0 ? "Descrição" : undefined} value={it.descricao} onChange={v=>updItem(i,"descricao",v)} placeholder="Descrição do item" />
                <Input label={i===0 ? "Unid." : undefined} value={it.unidade} onChange={v=>updItem(i,"unidade",v)} placeholder="UND" />
                <Input label={i===0 ? "Quant." : undefined} value={it.quantidade} onChange={v=>updItem(i,"quantidade",v)} placeholder="0" />
                <Input label={i===0 ? "V. Unit." : undefined} value={it.valorUnitario} onChange={v=>updItem(i,"valorUnitario",v)} placeholder="0,00" />
                <button onClick={()=>rmItem(i)} style={{ height:36, background:`${C.red}12`, border:`1px solid ${C.red}44`, borderRadius:6, color:C.red, cursor:"pointer" }}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
            <Btn variant="outline" color={SX.laranjaEsc} onClick={addItem} style={{ alignSelf:"flex-start" }}>
              <Icon name="plus" size={13} /> Adicionar Item
            </Btn>

            {resultado && (
              <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:14, display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#166534" }}>Processo gerado com sucesso!</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {resultado.docxUrl && <Btn color={SX.laranja} onClick={()=>window.open(resultado.docxUrl,"_blank","noopener")}><Icon name="file" size={14}/> Baixar .DOCX</Btn>}
                  {resultado.pdfUrl && <Btn color={SX.preto} onClick={()=>window.open(resultado.pdfUrl,"_blank","noopener")}><Icon name="file" size={14}/> Baixar .PDF</Btn>}
                </div>
              </div>
            )}

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8, flexWrap:"wrap" }}>
              <Btn variant="outline" onClick={()=>setModal(false)} color={C.sub}>Fechar</Btn>
              <Btn variant="outline" color={SX.prataEsc} disabled={salvandoRascunho} onClick={salvarRascunho} style={{ borderColor:`${SX.prataEsc}55` }}>
                {salvandoRascunho ? "Salvando..." : "Salvar Rascunho"}
              </Btn>
              <Btn color={SX.laranja} disabled={gerando || validacao.excede} onClick={gerar}>
                {gerando ? "Gerando documentos..." : "Gerar Processo (.docx + .pdf)"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {configModal && (
        <Modal title="Configurações Institucionais" onClose={()=>setConfigModal(false)} wide>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ fontSize:12, color:C.sub, marginBottom:4 }}>
              Estes dados são reutilizados automaticamente em todos os processos gerados pelo Agente de Dispensas.
            </div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap:12 }}>
              <Input label="Município" value={config.municipio} onChange={v=>setConfig(c=>({...c,municipio:v}))} placeholder="Ex.: Mascote" />
              <Input label="UF" value={config.uf} onChange={v=>setConfig(c=>({...c,uf:v}))} placeholder="BA" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Input label="CNPJ do Município" value={config.cnpjMunicipio} onChange={v=>setConfig(c=>({...c,cnpjMunicipio:v}))} placeholder="00.000.000/0001-00" />
              <Input label="E-mail do Setor de Licitações" value={config.emailLicitacao} onChange={v=>setConfig(c=>({...c,emailLicitacao:v}))} placeholder="licitacao@municipio.ba.gov.br" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap:12 }}>
              <Input label="Endereço da Prefeitura" value={config.endereco} onChange={v=>setConfig(c=>({...c,endereco:v}))} placeholder="Praça..., nº, Centro" />
              <Input label="CEP" value={config.cep} onChange={v=>setConfig(c=>({...c,cep:v}))} placeholder="00000-000" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Input label="Prefeito(a) Municipal" value={config.prefeitoNome} onChange={v=>setConfig(c=>({...c,prefeitoNome:v}))} placeholder="Nome completo" />
              <Input label="CPF do(a) Prefeito(a)" value={config.prefeitoCpf} onChange={v=>setConfig(c=>({...c,prefeitoCpf:v}))} placeholder="000.000.000-00" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Input label="Agente de Contratação" value={config.agenteContratacaoNome} onChange={v=>setConfig(c=>({...c,agenteContratacaoNome:v}))} placeholder="Nome completo" />
              <Input label="Matrícula do Agente" value={config.agenteContratacaoMatricula} onChange={v=>setConfig(c=>({...c,agenteContratacaoMatricula:v}))} placeholder="000000" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Input label="Procurador(a) Geral" value={config.procuradorNome} onChange={v=>setConfig(c=>({...c,procuradorNome:v}))} placeholder="Nome completo" />
              <Input label="OAB do(a) Procurador(a)" value={config.procuradorOab} onChange={v=>setConfig(c=>({...c,procuradorOab:v}))} placeholder="OAB-BA nº ..." />
            </div>
            <Input label="Secretário(a) de Finanças" value={config.secretarioFinancasNome} onChange={v=>setConfig(c=>({...c,secretarioFinancasNome:v}))} placeholder="Nome completo" />
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
              <Input label="Portaria de Designação do Agente" value={config.portariaAgente} onChange={v=>setConfig(c=>({...c,portariaAgente:v}))} placeholder="Portaria nº 011 de 06/01/2025" />
              <Input label="Decreto Municipal Regulamentador" value={config.decretoMunicipal} onChange={v=>setConfig(c=>({...c,decretoMunicipal:v}))} placeholder="Decreto Municipal nº 020/2024" />
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <Btn variant="outline" onClick={()=>setConfigModal(false)} color={C.sub}>Cancelar</Btn>
              <Btn color={SX.laranja} onClick={salvarConfig}>Salvar Configuração</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   RELATÓRIOS
══════════════════════════════════════════════════════════════ */
const esc = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const hojeStr = () => new Date().toLocaleDateString("pt-BR");

const BASE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:32px 40px;font-size:14px;line-height:1.5}
  .hdr{border-bottom:3px solid #1e3a8a;padding-bottom:14px;margin-bottom:24px}
  .hdr h1{font-size:20px;font-weight:700;color:#1e3a8a}
  .hdr .sub{font-size:12px;color:#666;margin-top:4px}
  .card{border:1px solid #ddd;border-radius:8px;padding:18px 22px;margin-bottom:18px;page-break-inside:avoid}
  .card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
  .card-num{font-size:16px;font-weight:700}
  .card-obj{font-size:13px;color:#555;margin-top:3px}
  .badge{font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600;white-space:nowrap}
  .sec{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#555;margin:14px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px}
  .g2{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:10px}
  .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px;margin-bottom:10px}
  .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 16px;margin-bottom:10px}
  .lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
  .val{font-size:13px;font-weight:500;color:#111}
  .val.big{font-size:16px;font-weight:700}
  .bar-bg{background:#eee;border-radius:4px;height:6px;margin-top:6px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
  th{padding:7px 10px;text-align:left;background:#f5f5f5;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #ddd}
  td{padding:7px 10px;border-bottom:1px solid #eee}
  .footer{margin-top:36px;font-size:11px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:10px}
  @media print{body{padding:16px 20px}}
`;

const buildRelatorioDoc = (titulo, corpo) =>
  `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${titulo}</title><style>${BASE_CSS}</style></head><body>${corpo}</body></html>`;

const gerarRelatorioAtas = (atas) => {
  const total = atas.reduce((s,a)=>s+a.valorTotal,0);
  const saldoTotal = atas.reduce((s,a)=>s+a.saldoDisponivel,0);
  let html = `<div class="hdr"><h1>Relatório — Atas de Registro de Preços</h1><div class="sub">Gerado em ${hojeStr()} &nbsp;·&nbsp; ${atas.length} ata(s) cadastrada(s) &nbsp;·&nbsp; Valor total: ${fmtBRL(total)} &nbsp;·&nbsp; Saldo disponível: ${fmtBRL(saldoTotal)}</div></div>`;
  if (!atas.length) { html += '<p style="color:#888">Nenhuma ata cadastrada.</p>'; }
  atas.forEach(a => {
    const pct = a.valorTotal>0?((a.valorTotal-a.saldoDisponivel)/a.valorTotal*100).toFixed(1):"0.0";
    const d = diasParaVencer(a.vigencia);
    const statusLabel = d>0?`Vigente · ${d} dias restantes`:d===0?"Vence hoje":"Vencida";
    const statusBg = d>0?"background:#dcfce7;color:#166534":d===0?"background:#fef9c3;color:#854d0e":"background:#fee2e2;color:#991b1b";
    const barColor = parseFloat(pct)>80?"#ef4444":"#1e3a8a";
    html += `<div class="card" style="border-left:4px solid #4f46e5">
      <div class="card-top">
        <div><div class="card-num" style="color:#4f46e5">${esc(a.numero)}</div><div class="card-obj">${esc(a.objeto)}</div></div>
        <span class="badge" style="${statusBg}">${statusLabel}</span>
      </div>
      <div class="sec">Dados do Fornecedor</div>
      <div class="g2">
        <div><div class="lbl">Razão Social</div><div class="val">${esc(a.fornecedor)}</div></div>
        <div><div class="lbl">CNPJ</div><div class="val">${esc(a.cnpj)||"—"}</div></div>
        ${a.endereco?`<div style="grid-column:1/-1"><div class="lbl">Endereço</div><div class="val">${esc(a.endereco)}</div></div>`:""}
        ${a.telefone?`<div><div class="lbl">Telefone</div><div class="val">${esc(a.telefone)}</div></div>`:""}
        ${a.email?`<div><div class="lbl">E-mail</div><div class="val">${esc(a.email)}</div></div>`:""}
      </div>
      <div class="sec">Dados Financeiros</div>
      <div class="g4">
        <div><div class="lbl">Valor Total</div><div class="val big">${fmtBRL(a.valorTotal)}</div></div>
        <div><div class="lbl">Saldo Disponível</div><div class="val big" style="color:#166534">${fmtBRL(a.saldoDisponivel)}</div></div>
        <div><div class="lbl">Utilizado</div><div class="val" style="color:#92400e">${pct}%</div></div>
        <div><div class="lbl">Vigência</div><div class="val">${fmtDate(a.vigencia)}</div></div>
      </div>
      <div class="bar-bg"><div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px"></div></div>
      ${a.itens?.length?`
      <div class="sec" style="margin-top:14px">Itens da Ata (${a.itens.length})</div>
      <table><thead><tr><th>Descrição</th><th>Unidade</th><th>Qtd Reg.</th><th>Qtd Util.</th><th>Vlr Unit.</th><th>Saldo Qtd</th></tr></thead><tbody>
      ${a.itens.map(it=>`<tr><td>${esc(it.descricao)}</td><td>${esc(it.unidade)}</td><td>${(it.qtdRegistrada||0).toLocaleString("pt-BR")}</td><td>${(it.qtdUtilizada||0).toLocaleString("pt-BR")}</td><td>${fmtBRL(it.valorUnit)}</td><td>${((it.qtdRegistrada||0)-(it.qtdUtilizada||0)).toLocaleString("pt-BR")}</td></tr>`).join("")}
      </tbody></table>`:""}</div>`;
  });
  html += `<div class="footer">LicitaGov — Sistema de Gestão de Licitações · Lei 14.133/2021 · ${hojeStr()}</div>`;
  return html;
};

const gerarRelatorioContratos = (contratos) => {
  const totalVigente = contratos.filter(c=>c.status==="Vigente").reduce((s,c)=>s+c.valor,0);
  let html = `<div class="hdr"><h1>Relatório — Contratos</h1><div class="sub">Gerado em ${hojeStr()} &nbsp;·&nbsp; ${contratos.length} contrato(s) &nbsp;·&nbsp; Valor total vigente: ${fmtBRL(totalVigente)}</div></div>`;
  if (!contratos.length) { html += '<p style="color:#888">Nenhum contrato cadastrado.</p>'; }
  contratos.forEach(c => {
    const d = diasParaVencer(c.fim);
    let status = c.status;
    if (d!==null && c.status!=="Encerrado") { if(d<0) status="Vencido"; else if(d<=30) status="A vencer"; else status="Vigente"; }
    const statusStyle = status==="Vigente"?"background:#dcfce7;color:#166534":status==="A vencer"?"background:#fef9c3;color:#854d0e":status==="Vencido"?"background:#fee2e2;color:#991b1b":"background:#f3f4f6;color:#374151";
    const borderColor = status==="Vigente"?"#166534":status==="A vencer"?"#854d0e":status==="Vencido"?"#991b1b":"#9ca3af";
    const diasInfo = d!==null?(d<0?`Venceu há ${Math.abs(d)} dias`:`${d} dias restantes`):"";
    html += `<div class="card" style="border-left:4px solid ${borderColor}">
      <div class="card-top">
        <div>
          <div class="card-num" style="color:#16a34a">${esc(c.numero)}</div>
          <div class="card-obj">${esc(c.objeto)}</div>
          ${c.processo?`<div style="font-size:12px;color:#888;margin-top:2px">Processo: ${esc(c.processo)}</div>`:""}
        </div>
        <span class="badge" style="${statusStyle}">${status}</span>
      </div>
      <div class="g2">
        <div><div class="lbl">Fornecedor</div><div class="val">${esc(c.fornecedor)}</div></div>
        <div><div class="lbl">CNPJ</div><div class="val">${esc(c.cnpj)||"—"}</div></div>
      </div>
      <div class="g3">
        <div><div class="lbl">Valor do Contrato</div><div class="val big">${fmtBRL(c.valor)}</div></div>
        <div><div class="lbl">Início</div><div class="val">${fmtDate(c.inicio)}</div></div>
        <div><div class="lbl">Fim / Vigência</div><div class="val" style="color:${d!==null&&d<30?"#991b1b":"#111"}">${fmtDate(c.fim)}${diasInfo?` <span style="font-size:11px;color:#666">(${diasInfo})</span>`:""}</div></div>
      </div>
    </div>`;
  });
  html += `<div class="footer">LicitaGov — Sistema de Gestão de Licitações · Lei 14.133/2021 · ${hojeStr()}</div>`;
  return html;
};

const gerarRelatorioInexigibilidades = (inexigibilidades) => {
  const total = inexigibilidades.reduce((s,i)=>s+(i.valor_total||0),0);
  let html = `<div class="hdr"><h1>Relatório — Inexigibilidade de Licitação</h1><div class="sub">Gerado em ${hojeStr()} &nbsp;·&nbsp; ${inexigibilidades.length} registro(s) &nbsp;·&nbsp; Valor total: ${fmtBRL(total)}</div></div>`;
  if (!inexigibilidades.length) { html += '<p style="color:#888">Nenhuma inexigibilidade cadastrada.</p>'; }
  const statusStyle = s => s==="Concluída"?"background:#dcfce7;color:#166534":s==="Cancelada"?"background:#fee2e2;color:#991b1b":"background:#eff6ff;color:#1d4ed8";
  const borderColor = s => s==="Concluída"?"#166534":s==="Cancelada"?"#991b1b":"#1d4ed8";
  inexigibilidades.forEach(it => {
    html += `<div class="card" style="border-left:4px solid ${borderColor(it.status)}">
      <div class="card-top">
        <div>
          <div class="card-num" style="color:#7c3aed">${esc(it.numero_processo||"—")}</div>
          <div class="card-obj">${esc(it.objeto)}</div>
          ${it.secretaria?`<div style="font-size:12px;color:#888;margin-top:2px">${esc(it.secretaria)}</div>`:""}
        </div>
        <span class="badge" style="${statusStyle(it.status)}">${esc(it.status||"Em andamento")}</span>
      </div>
      <div class="g2">
        <div><div class="lbl">Contratada</div><div class="val">${esc(it.contratada||"—")}</div></div>
        <div><div class="lbl">CNPJ</div><div class="val">${esc(it.cnpj)||"—"}</div></div>
      </div>
      <div class="g3">
        <div><div class="lbl">Valor Total</div><div class="val big">${fmtBRL(it.valor_total)}</div></div>
        <div><div class="lbl">Data de Ratificação</div><div class="val">${fmtDate(it.data_ratificacao)}</div></div>
        <div><div class="lbl">Vigência</div><div class="val">${fmtDate(it.vigencia)||"—"}</div></div>
      </div>
    </div>`;
  });
  html += `<div class="footer">LicitaGov — Sistema de Gestão de Licitações · Lei 14.133/2021 (Art. 74) · ${hojeStr()}</div>`;
  return html;
};

const gerarRelatorioDispensas = (dispensas) => {
  const total = dispensas.reduce((s,d)=>s+(d.valor_total||0),0);
  let html = `<div class="hdr"><h1>Relatório — Dispensas de Licitação</h1><div class="sub">Gerado em ${hojeStr()} &nbsp;·&nbsp; ${dispensas.length} registro(s) &nbsp;·&nbsp; Valor total: ${fmtBRL(total)}</div></div>`;
  if (!dispensas.length) { html += '<p style="color:#888">Nenhuma dispensa cadastrada.</p>'; }
  const statusStyle = s => s==="Concluída"?"background:#dcfce7;color:#166534":s==="Cancelada"?"background:#fee2e2;color:#991b1b":"background:#fffbeb;color:#92400e";
  const borderColor = s => s==="Concluída"?"#166534":s==="Cancelada"?"#991b1b":"#d97706";
  dispensas.forEach(it => {
    html += `<div class="card" style="border-left:4px solid ${borderColor(it.status)}">
      <div class="card-top">
        <div>
          <div class="card-num" style="color:#d97706">${esc(it.numero_processo||"—")}</div>
          <div class="card-obj">${esc(it.objeto)}</div>
          ${it.secretaria?`<div style="font-size:12px;color:#888;margin-top:2px">${esc(it.secretaria)}</div>`:""}
        </div>
        <span class="badge" style="${statusStyle(it.status)}">${esc(it.status||"Em andamento")}</span>
      </div>
      <div class="g2">
        <div><div class="lbl">Contratada</div><div class="val">${esc(it.contratada||"—")}</div></div>
        <div><div class="lbl">CNPJ</div><div class="val">${esc(it.cnpj)||"—"}</div></div>
      </div>
      <div class="g3">
        <div><div class="lbl">Valor Total</div><div class="val big">${fmtBRL(it.valor_total)}</div></div>
        <div><div class="lbl">Data de Ratificação</div><div class="val">${fmtDate(it.data_ratificacao)}</div></div>
        <div><div class="lbl">Vigência</div><div class="val">${fmtDate(it.vigencia)||"—"}</div></div>
      </div>
    </div>`;
  });
  html += `<div class="footer">LicitaGov — Sistema de Gestão de Licitações · Lei 14.133/2021 (Art. 75) · ${hojeStr()}</div>`;
  return html;
};

const gerarRelatorioProcessos = (processos) => {
  const faseColor = { "Em andamento":"#4f46e5","Publicado":"#0891b2","Homologado":"#166534","Planejamento":"#92400e","Revogado":"#991b1b","Suspenso":"#b45309","Encerrado":"#374151" };
  const valorTotal = processos.reduce((s,p)=>s+(p.valor||0),0);
  let html = `<div class="hdr"><h1>Relatório — Processos Licitatórios</h1><div class="sub">Gerado em ${hojeStr()} &nbsp;·&nbsp; ${processos.length} processo(s) &nbsp;·&nbsp; Valor estimado total: ${fmtBRL(valorTotal)}</div></div>`;
  if (!processos.length) { html += '<p style="color:#888">Nenhum processo cadastrado.</p>'; }
  processos.forEach(p => {
    const cor = faseColor[p.fase]||"#6b7280";
    html += `<div class="card" style="border-left:4px solid ${cor}">
      <div class="card-top">
        <div>
          <div class="card-num" style="color:#0891b2">${esc(p.numero)}</div>
          <div class="card-obj">${esc(p.objeto)}</div>
          ${p.orgao?`<div style="font-size:12px;color:#888;margin-top:2px">${esc(p.orgao)}</div>`:""}
        </div>
        <span class="badge" style="background:${cor}22;color:${cor}">${esc(p.fase)}</span>
      </div>
      <div class="g3">
        <div><div class="lbl">Modalidade</div><div class="val">${esc(p.modalidade)}</div></div>
        <div><div class="lbl">Valor Estimado</div><div class="val big">${fmtBRL(p.valor)}</div></div>
        <div><div class="lbl">Data de Abertura</div><div class="val">${fmtDate(p.abertura)}</div></div>
      </div>
    </div>`;
  });
  html += `<div class="footer">LicitaGov — Sistema de Gestão de Licitações · Lei 14.133/2021 · ${hojeStr()}</div>`;
  return html;
};

function RelAtas({ atas, onClose }) {
  const S = { page:{ fontFamily:"Inter,system-ui,sans-serif", color:"#111", background:"#fff", padding:"32px 40px", maxWidth:900, margin:"0 auto" }, titulo:{ fontSize:22, fontWeight:700, marginBottom:4 }, sub:{ fontSize:13, color:"#555", marginBottom:32 }, secTitle:{ fontSize:15, fontWeight:700, borderBottom:"2px solid #4f46e5", paddingBottom:6, marginBottom:14, color:"#4f46e5" }, label:{ fontSize:11, color:"#666", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }, val:{ fontSize:14, fontWeight:500, color:"#111" }, grid2:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 24px", marginBottom:10 }, grid4:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px 16px", marginBottom:12 }, th:{ padding:"8px 12px", fontSize:11, textAlign:"left", background:"#f0f0f0", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em" }, td:{ padding:"8px 12px", fontSize:13, borderBottom:"1px solid #eee" }, bar:{ background:"#eee", borderRadius:4, height:7, marginTop:4 } };
  return (
    <div style={{ position:"fixed", inset:0, background:"#fff", zIndex:200, overflowY:"auto" }}>
      <div style={{ background:"#4f46e5", padding:"14px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10 }}>
        <span style={{ color:"#fff", fontWeight:700, fontSize:15 }}>Relatório — Atas de Registro de Preços</span>
        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={()=>window.print()} color="#fff" size="sm" style={{ color:"#4f46e5", background:"#fff", border:"none" }}>🖨 Imprimir</Btn>
          <Btn onClick={onClose} color="#fff" variant="outline" size="sm" style={{ borderColor:"rgba(255,255,255,0.4)", color:"#fff" }}>✕ Fechar</Btn>
        </div>
      </div>
      <div style={S.page}>
        <div style={S.titulo}>Relatório de Atas de Registro de Preços</div>
        <div style={S.sub}>Gerado em {hoje()} · {atas.length} ata(s) cadastrada(s)</div>
        {atas.length === 0 && <div style={{ color:"#888", fontSize:14 }}>Nenhuma ata cadastrada.</div>}
        {atas.map((a, i) => {
          const pct = a.valorTotal > 0 ? ((a.valorTotal - a.saldoDisponivel) / a.valorTotal * 100).toFixed(1) : "0.0";
          const d = diasParaVencer(a.vigencia);
          return (
            <div key={a.id} style={{ border:"1px solid #ddd", borderRadius:8, padding:"20px 24px", marginBottom:24, pageBreakInside:"avoid" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:700, color:"#4f46e5" }}>{a.numero}</div>
                  <div style={{ fontSize:13, color:"#555", marginTop:2 }}>{a.objeto}</div>
                </div>
                <div style={{ fontSize:12, padding:"4px 10px", borderRadius:20, background: d > 0 ? "#dcfce7" : "#fee2e2", color: d > 0 ? "#166534" : "#991b1b", fontWeight:600 }}>
                  {d > 0 ? `Vigente · ${d}d restantes` : d === 0 ? "Vence hoje" : "Vencida"}
                </div>
              </div>

              <div style={{ ...S.secTitle }}>Dados do Fornecedor</div>
              <div style={S.grid2}>
                <div><div style={S.label}>Razão Social</div><div style={S.val}>{a.fornecedor}</div></div>
                <div><div style={S.label}>CNPJ</div><div style={S.val}>{a.cnpj || "—"}</div></div>
                {a.endereco && <div style={{ gridColumn:"1/-1" }}><div style={S.label}>Endereço</div><div style={S.val}>{a.endereco}</div></div>}
                {a.telefone && <div><div style={S.label}>Telefone</div><div style={S.val}>{a.telefone}</div></div>}
                {a.email && <div><div style={S.label}>E-mail</div><div style={S.val}>{a.email}</div></div>}
              </div>

              <div style={{ ...S.secTitle, marginTop:16 }}>Dados Financeiros</div>
              <div style={S.grid4}>
                <div><div style={S.label}>Valor Total</div><div style={{ ...S.val, color:"#111", fontWeight:700 }}>{fmtBRL(a.valorTotal)}</div></div>
                <div><div style={S.label}>Saldo Disponível</div><div style={{ ...S.val, color:"#166534", fontWeight:700 }}>{fmtBRL(a.saldoDisponivel)}</div></div>
                <div><div style={S.label}>Utilizado</div><div style={{ ...S.val, color:"#92400e" }}>{pct}%</div></div>
                <div><div style={S.label}>Vigência</div><div style={S.val}>{fmtDate(a.vigencia)}</div></div>
              </div>
              <div style={S.bar}><div style={{ width:`${pct}%`, height:"100%", background: parseFloat(pct) > 80 ? "#ef4444" : "#4f46e5", borderRadius:4 }} /></div>

              {a.itens?.length > 0 && (
                <div style={{ marginTop:16 }}>
                  <div style={S.secTitle}>Itens da Ata ({a.itens.length})</div>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr>{["Descrição","Unidade","Qtd Reg.","Qtd Util.","Vlr Unit.","Saldo Qtd"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>{a.itens.map(it=>(
                      <tr key={it.id}>
                        <td style={S.td}>{it.descricao}</td>
                        <td style={S.td}>{it.unidade}</td>
                        <td style={S.td}>{it.qtdRegistrada?.toLocaleString("pt-BR")}</td>
                        <td style={S.td}>{it.qtdUtilizada?.toLocaleString("pt-BR")}</td>
                        <td style={S.td}>{fmtBRL(it.valorUnit)}</td>
                        <td style={S.td}>{(it.qtdRegistrada - it.qtdUtilizada).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RelContratos({ contratos, onClose }) {
  const S = { page:{ fontFamily:"Inter,system-ui,sans-serif", color:"#111", background:"#fff", padding:"32px 40px", maxWidth:900, margin:"0 auto" }, titulo:{ fontSize:22, fontWeight:700, marginBottom:4 }, sub:{ fontSize:13, color:"#555", marginBottom:32 }, label:{ fontSize:11, color:"#666", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }, val:{ fontSize:14, fontWeight:500, color:"#111" }, grid2:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 24px", marginBottom:10 }, grid3:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px 16px", marginBottom:10 } };
  const statusColor = { "Vigente":["#dcfce7","#166534"], "A vencer":["#fef9c3","#854d0e"], "Vencido":["#fee2e2","#991b1b"], "Encerrado":["#f3f4f6","#374151"] };
  return (
    <div style={{ position:"fixed", inset:0, background:"#fff", zIndex:200, overflowY:"auto" }}>
      <div style={{ background:"#16a34a", padding:"14px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10 }}>
        <span style={{ color:"#fff", fontWeight:700, fontSize:15 }}>Relatório — Contratos</span>
        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={()=>window.print()} color="#fff" size="sm" style={{ color:"#16a34a", background:"#fff", border:"none" }}>🖨 Imprimir</Btn>
          <Btn onClick={onClose} color="#fff" variant="outline" size="sm" style={{ borderColor:"rgba(255,255,255,0.4)", color:"#fff" }}>✕ Fechar</Btn>
        </div>
      </div>
      <div style={S.page}>
        <div style={S.titulo}>Relatório de Contratos</div>
        <div style={S.sub}>Gerado em {hoje()} · {contratos.length} contrato(s) cadastrado(s) · Valor vigente total: {fmtBRL(contratos.filter(c=>c.status==="Vigente").reduce((a,c)=>a+c.valor,0))}</div>
        {contratos.length === 0 && <div style={{ color:"#888", fontSize:14 }}>Nenhum contrato cadastrado.</div>}
        {contratos.map(c => {
          const d = diasParaVencer(c.fim);
          let status = c.status;
          if (d !== null && c.status !== "Encerrado") { if (d < 0) status = "Vencido"; else if (d <= 30) status = "A vencer"; else status = "Vigente"; }
          const [bg, fg] = statusColor[status] || ["#f3f4f6","#374151"];
          return (
            <div key={c.id} style={{ border:"1px solid #ddd", borderRadius:8, padding:"20px 24px", marginBottom:20, pageBreakInside:"avoid", borderLeft:`4px solid ${fg}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:700, color:"#16a34a" }}>{c.numero}</div>
                  <div style={{ fontSize:13, color:"#555", marginTop:2 }}>{c.objeto}</div>
                  {c.processo && <div style={{ fontSize:12, color:"#888", marginTop:2 }}>Processo: {c.processo}</div>}
                </div>
                <div style={{ fontSize:12, padding:"4px 12px", borderRadius:20, background:bg, color:fg, fontWeight:600 }}>{status}</div>
              </div>
              <div style={S.grid2}>
                <div><div style={S.label}>Fornecedor</div><div style={S.val}>{c.fornecedor}</div></div>
                <div><div style={S.label}>CNPJ</div><div style={S.val}>{c.cnpj || "—"}</div></div>
              </div>
              <div style={S.grid3}>
                <div><div style={S.label}>Valor do Contrato</div><div style={{ ...S.val, fontSize:16, fontWeight:700 }}>{fmtBRL(c.valor)}</div></div>
                <div><div style={S.label}>Início</div><div style={S.val}>{fmtDate(c.inicio)}</div></div>
                <div><div style={S.label}>Fim / Vigência</div><div style={{ ...S.val, color: d !== null && d < 30 ? "#991b1b" : "#111" }}>{fmtDate(c.fim)}{d !== null && <span style={{ fontSize:12, marginLeft:6 }}>({d < 0 ? `venceu há ${Math.abs(d)}d` : `${d}d`})</span>}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LEXCORE — Análise de editais (Lei 14.133/2021) e geração de peças
══════════════════════════════════════════════════════════════ */

const RISCO_LABEL = { alto: "Risco Alto", medio: "Risco Médio", baixo: "Risco Baixo" };
const RISCO_COLOR = { alto: "#b91c1c", medio: "#b45309", baixo: "#15803d" };

function TabLexCore({ toast }) {
  const isMobile = useMobileCD();
  const [screen, setScreen] = useState({ name: "home" }); // home | novaAnalise | analise | novaPeca | peca | resposta

  const [analises, setAnalises] = useState([]);
  const [loadingAnalises, setLoadingAnalises] = useState(true);
  const [searchAnalises, setSearchAnalises] = useState("");

  const [pecasTodas, setPecasTodas] = useState([]);
  const [loadingPecas, setLoadingPecas] = useState(true);
  const [searchPecas, setSearchPecas] = useState("");

  const carregarAnalises = useCallback(async () => {
    setLoadingAnalises(true);
    const { data, error } = await sbListLexcoreAnalises();
    if (error) toast("Erro ao carregar análises: " + error.message, "error");
    setAnalises(data);
    setLoadingAnalises(false);
  }, [toast]);

  const carregarPecas = useCallback(async () => {
    setLoadingPecas(true);
    const [{ data: pecas, error: eP }, { data: respostas, error: eR }] = await Promise.all([
      sbListTodasPecas(), sbListRespostas(),
    ]);
    if (eP) toast("Erro ao carregar peças: " + eP.message, "error");
    if (eR) toast("Erro ao carregar respostas: " + eR.message, "error");
    const combinada = [
      ...(pecas || []).map(p => ({
        ...p, origem: "analise", titulo: labelTipoPeca(p.tipoPeca),
        referencia: p.nomeEdital ? `${p.nomeEdital}${p.numeroProcesso ? " · Processo " + p.numeroProcesso : ""}` : "Sem edital de origem",
      })),
      ...(respostas || []).map(r => ({
        ...r, origem: "pdf", titulo: labelTipoResposta(r.tipoResposta),
        referencia: r.nomeReferencia || "Sem edital/objeto informado",
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setPecasTodas(combinada);
    setLoadingPecas(false);
  }, [toast]);

  useEffect(() => { carregarAnalises(); carregarPecas(); }, [carregarAnalises, carregarPecas]);

  const deletarAnalise = async (id) => {
    if (!window.confirm("Excluir esta análise? Os pontos críticos e peças geradas serão perdidos.")) return;
    const { error } = await sbDeleteLexcoreAnalise(id);
    if (error) { toast("Erro ao excluir: " + error.message, "error"); return; }
    setAnalises(prev => prev.filter(a => a.id !== id));
    toast("Análise excluída");
  };

  const deletarPeca = async (item) => {
    if (!window.confirm("Excluir esta peça jurídica?")) return;
    const { error } = item.origem === "analise" ? await sbDeletePeca(item.id) : await sbDeleteResposta(item.id);
    if (error) { toast("Erro ao excluir: " + error.message, "error"); return; }
    setPecasTodas(prev => prev.filter(p => p.id !== item.id));
    toast("Peça excluída");
  };

  if (screen.name === "novaAnalise") {
    return (
      <LexcoreNova
        isMobile={isMobile}
        toast={toast}
        onCancel={() => setScreen({ name: "home" })}
        onCriada={(id) => { carregarAnalises(); setScreen({ name: "analise", id }); }}
      />
    );
  }

  if (screen.name === "analise") {
    return (
      <LexcoreAnalise
        analiseId={screen.id}
        isMobile={isMobile}
        toast={toast}
        onVoltar={() => { setScreen({ name: "home" }); carregarAnalises(); }}
        onAbrirPeca={(id) => setScreen({ name: "peca", id })}
        onIrGerarPeca={(analiseId) => setScreen({ name: "novaPeca", presetAnaliseId: analiseId })}
      />
    );
  }

  if (screen.name === "novaPeca") {
    return (
      <NovaPecaJuridica
        presetAnaliseId={screen.presetAnaliseId}
        toast={toast}
        onCancel={() => setScreen({ name: "home" })}
        onCriada={(id, origem) => { carregarPecas(); setScreen({ name: origem === "analise" ? "peca" : "resposta", id }); }}
      />
    );
  }

  if (screen.name === "peca") {
    return (
      <LexcorePeca
        pecaId={screen.id}
        toast={toast}
        onVoltar={() => { setScreen({ name: "home" }); carregarPecas(); }}
      />
    );
  }

  if (screen.name === "resposta") {
    return (
      <LexcoreRespostaDetalhe
        respostaId={screen.id}
        toast={toast}
        onVoltar={() => { setScreen({ name: "home" }); carregarPecas(); }}
      />
    );
  }

  const filteredAnalises = analises.filter(a => {
    const s = searchAnalises.toLowerCase();
    return (a.nomeEdital || "").toLowerCase().includes(s) || (a.numeroProcesso || "").toLowerCase().includes(s);
  });

  const filteredPecas = pecasTodas.filter(p => {
    const s = searchPecas.toLowerCase();
    return (p.titulo || "").toLowerCase().includes(s) || (p.referencia || "").toLowerCase().includes(s);
  });

  const statusInfo = (status) => ({
    processando: { label: "Processando", color: undefined },
    concluida: { label: "Concluída", color: "#15803d" },
    erro: { label: "Erro", color: "#b91c1c" },
  }[status] || { label: status, color: undefined });

  const CardHeader = ({ title, sub, onNovo, novoLabel }) => (
    <div style={{
      background: `linear-gradient(135deg, ${SX.preto} 0%, ${SX.pretoSoft} 100%)`,
      border: `1px solid ${SX.laranja}33`, borderRadius: "12px 12px 0 0",
      padding: "18px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12,
    }}>
      <div>
        <div style={{ fontSize:16, fontWeight:700, color:"#fff", fontFamily:"Inter,system-ui,sans-serif", display:"flex", alignItems:"center", gap:8 }}>
          <Icon name="lexcore" size={18} color={SX.laranja} />
          {title}
        </div>
        <div style={{ fontSize:12, color:SX.prata, marginTop:3 }}>{sub}</div>
      </div>
      <Btn color={SX.laranja} onClick={onNovo}>
        <Icon name="plus" size={14} /> {novoLabel}
      </Btn>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <div>
        <CardHeader
          title="LexCore Análise de Editais"
          sub="Analisa o edital frente à Lei 14.133/2021 e identifica cláusulas restritivas, ilegais, dúbias ou de risco."
          onNovo={() => setScreen({ name: "novaAnalise" })}
          novoLabel="Nova Análise"
        />
        <div style={{ border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 12px 12px", padding:16, background:C.bg }}>
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
            <input value={searchAnalises} onChange={e=>setSearchAnalises(e.target.value)} placeholder="Buscar por nome do edital ou processo..."
              style={{ flex:1, minWidth:150, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none" }}
              onFocus={e=>{ e.target.style.borderColor=SX.laranja; e.target.style.boxShadow=`0 0 0 3px ${SX.laranja}22`; }}
              onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
          </div>

          {loadingAnalises ? (
            <div style={{ padding:40, textAlign:"center", color:C.sub, fontSize:13 }}>Carregando análises...</div>
          ) : filteredAnalises.length === 0 ? (
            <EmptyState icon="lexcore" title="Nenhuma análise de edital" sub='Clique em "Nova Análise" para enviar um edital em PDF e identificar pontos críticos frente à Lei 14.133/2021' />
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {filteredAnalises.map(a => {
                const st = statusInfo(a.status);
                return (
                  <div key={a.id} onClick={() => setScreen({ name: "analise", id: a.id })} style={{
                    background:C.card, border:`1px solid ${C.border}`, borderLeft:`4px solid ${a.status==="erro"?C.red:SX.laranja}`,
                    borderRadius:12, padding:16, boxShadow:"0 1px 3px rgba(0,0,0,0.06)", cursor:"pointer",
                    display:"flex", flexDirection: isMobile ? "column" : "row", gap:10, alignItems: isMobile ? "flex-start" : "center", justifyContent:"space-between",
                  }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                        <span style={{ fontSize:14, fontWeight:700, color:SX.laranjaEsc, fontFamily:"Inter,system-ui,sans-serif" }}>{a.nomeEdital}</span>
                        <Badge label={st.label} color={st.color} />
                      </div>
                      <div style={{ fontSize:12, color:C.sub }}>{a.numeroProcesso ? `Processo ${a.numeroProcesso}` : "Sem número de processo"} · {fmtDate(a.createdAt)}</div>
                    </div>
                    <div style={{ display:"flex", gap:8 }} onClick={e=>e.stopPropagation()}>
                      <IconBtn name="trash" color={C.red} title="Excluir" onClick={() => deletarAnalise(a.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div>
        <CardHeader
          title="LexCore Peças Jurídicas"
          sub="Gera peças a partir dos pontos críticos de uma análise salva ou a partir de uma impugnação/recurso recebido."
          onNovo={() => setScreen({ name: "novaPeca" })}
          novoLabel="Nova Peça"
        />
        <div style={{ border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 12px 12px", padding:16, background:C.bg }}>
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
            <input value={searchPecas} onChange={e=>setSearchPecas(e.target.value)} placeholder="Buscar por tipo de peça ou edital/objeto..."
              style={{ flex:1, minWidth:150, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none" }}
              onFocus={e=>{ e.target.style.borderColor=SX.laranja; e.target.style.boxShadow=`0 0 0 3px ${SX.laranja}22`; }}
              onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
          </div>

          {loadingPecas ? (
            <div style={{ padding:40, textAlign:"center", color:C.sub, fontSize:13 }}>Carregando peças...</div>
          ) : filteredPecas.length === 0 ? (
            <EmptyState icon="lexcore" title="Nenhuma peça jurídica gerada" sub='Clique em "Nova Peça" para gerar a partir de uma análise salva ou de um PDF recebido' />
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {filteredPecas.map(p => (
                <div key={`${p.origem}-${p.id}`} onClick={() => setScreen({ name: p.origem === "analise" ? "peca" : "resposta", id: p.id })} style={{
                  background:C.card, border:`1px solid ${C.border}`, borderLeft:`4px solid ${SX.laranja}`,
                  borderRadius:12, padding:16, boxShadow:"0 1px 3px rgba(0,0,0,0.06)", cursor:"pointer",
                  display:"flex", flexDirection: isMobile ? "column" : "row", gap:10, alignItems: isMobile ? "flex-start" : "center", justifyContent:"space-between",
                }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ fontSize:14, fontWeight:700, color:SX.laranjaEsc, fontFamily:"Inter,system-ui,sans-serif" }}>{p.titulo}</span>
                      <Badge label={p.origem === "analise" ? "Análise" : "PDF Recebido"} color={p.origem === "analise" ? undefined : C.accent2} />
                      <Badge label={p.status === "finalizada" ? "Finalizada" : "Rascunho"} color={p.status === "finalizada" ? C.green : undefined} />
                    </div>
                    <div style={{ fontSize:12, color:C.sub }}>{p.referencia} · v{p.versao} · {fmtDate(p.createdAt)}</div>
                  </div>
                  <div style={{ display:"flex", gap:8 }} onClick={e=>e.stopPropagation()}>
                    <IconBtn name="trash" color={C.red} title="Excluir" onClick={() => deletarPeca(p)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LexcoreNova({ isMobile, toast, onCancel, onCriada }) {
  const [nomeEdital, setNomeEdital] = useState("");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [file, setFile] = useState(null);
  const [analisando, setAnalisando] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.type !== "application/pdf") { toast("Envie o edital em formato PDF", "error"); return; }
    if (f.size > 20*1024*1024) { toast("Arquivo muito grande (máx. 20 MB)", "warn"); return; }
    setFile(f);
  };

  const analisar = async () => {
    if (!nomeEdital.trim()) { toast("Informe o nome do edital", "error"); return; }
    if (!file) { toast("Selecione o PDF do edital", "error"); return; }
    setAnalisando(true);
    let analise = null;
    try {
      const { url: arquivoOriginalUrl, error: upErr } = await uploadEditalOriginal(file);
      if (upErr) throw upErr;

      const { data, error: createErr } = await sbCreateLexcoreAnalise({ nomeEdital: nomeEdital.trim(), numeroProcesso: numeroProcesso.trim(), arquivoOriginalUrl });
      if (createErr) throw createErr;
      analise = data;

      const fileData = await new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(file); });
      const b64 = fileData.split(",")[1];

      const res = await anthropicFetch(null, {
        method: "POST",
        headers: { "anthropic-version": "2023-06-01", "content-type": "application/json", "anthropic-beta": "pdfs-2024-09-25" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 8192, system: ANALISE_SYSTEM,
          messages: [{ role: "user", content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
            { type: "text", text: "Analise este edital de licitação e retorne o array JSON de pontos críticos, conforme instruções do sistema." },
          ] }],
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error?.message || `Erro HTTP ${res.status}`); }
      const json = await res.json();
      if (json.stop_reason === "max_tokens") throw new Error("Edital muito extenso para análise automática. Tente um arquivo menor.");
      const text = json.content?.[0]?.text || "";
      const pontos = parsePontosCriticosJSON(text);

      await sbInsertPontosCriticos(analise.id, pontos);
      await sbUpdateLexcoreAnalise(analise.id, { status: "concluida" });

      toast(`Análise concluída — ${pontos.length} ponto(s) crítico(s) identificado(s)`);
      onCriada(analise.id);
    } catch (err) {
      if (analise) await sbUpdateLexcoreAnalise(analise.id, { status: "erro", mensagemErro: err.message });
      toast("Erro na análise: " + err.message, "error");
    } finally {
      setAnalisando(false);
    }
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <IconBtn name="back" color={C.text} title="Voltar" onClick={onCancel} />
        <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:"Inter,system-ui,sans-serif" }}>Nova Análise de Edital</div>
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, maxWidth:640, display:"flex", flexDirection:"column", gap:14 }}>
        <Input label="Nome do Edital" value={nomeEdital} onChange={setNomeEdital} placeholder="Ex.: Pregão Eletrônico nº 012/2026 — Aquisição de material de expediente" required />
        <Input label="Número do Processo" value={numeroProcesso} onChange={setNumeroProcesso} placeholder="Ex.: 2026.001.0034" />

        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <label style={{ fontSize:12, color:C.sub, fontWeight:500 }}>Edital (PDF)</label>
          <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFile} style={{ display:"none" }} />
          <Btn variant="outline" color={SX.laranja} onClick={() => fileRef.current?.click()} style={{ alignSelf:"flex-start" }}>
            <Icon name="attach" size={14} /> {file ? file.name : "Selecionar PDF do edital"}
          </Btn>
        </div>

        <div style={{
          background:"#fff1e6", border:`1px solid ${SX.laranja}55`, borderRadius:8, padding:"12px 14px",
          display:"flex", gap:10, alignItems:"flex-start", fontSize:12.5, color:"#7c2d12", lineHeight:1.5,
        }}>
          <Icon name="warning" size={16} color={SX.laranjaEsc} />
          A IA lê o PDF diretamente e identifica cláusulas restritivas, ilegais, dúbias ou de risco frente à Lei nº 14.133/2021. A análise pode levar alguns segundos para editais extensos.
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="outline" color={C.sub} onClick={onCancel} disabled={analisando}>Cancelar</Btn>
          <Btn color={SX.laranja} onClick={analisar} disabled={analisando}>
            {analisando ? "Analisando edital..." : (<><Icon name="sparkle" size={14} /> Analisar Edital</>)}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function PontosCriticosList({ pontos, onToggle }) {
  const grupos = ["alto", "medio", "baixo"].map(nivel => ({
    nivel, itens: pontos.filter(p => p.nivelRisco === nivel),
  })).filter(g => g.itens.length > 0);

  return (
    <>
      {grupos.map(g => (
        <div key={g.nivel} style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:RISCO_COLOR[g.nivel], textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>
            {RISCO_LABEL[g.nivel]} ({g.itens.length})
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {g.itens.map(p => (
              <label key={p.id} style={{
                background:C.card, border:`1px solid ${p.selecionado ? SX.laranja : C.border}`,
                borderRadius:10, padding:14, display:"flex", gap:12, cursor:"pointer",
                boxShadow: p.selecionado ? `0 0 0 3px ${SX.laranja}1a` : "none",
              }}>
                <input type="checkbox" checked={p.selecionado} onChange={() => onToggle(p)} style={{ marginTop:3, flexShrink:0, width:16, height:16, accentColor:SX.laranja }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
                    <Badge label={labelTipoProblema(p.tipoProblema)} color={RISCO_COLOR[p.nivelRisco]} />
                    {p.artigoLei && <span style={{ fontSize:11.5, color:C.tertiary }}>{p.artigoLei}</span>}
                  </div>
                  <div style={{ fontSize:13.5, color:C.text, fontWeight:500, marginBottom:6, lineHeight:1.5 }}>{p.descricaoProblema}</div>
                  <div style={{ fontSize:12.5, color:C.sub, background:C.overlay, borderLeft:`3px solid ${C.border}`, padding:"6px 10px", borderRadius:4, marginBottom:6, fontStyle:"italic" }}>
                    "{p.trechoEdital}"
                  </div>
                  <div style={{ fontSize:12, color:C.sub }}>{p.fundamentacaoLegal}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function LexcoreAnalise({ analiseId, isMobile, toast, onVoltar, onAbrirPeca, onIrGerarPeca }) {
  const [analise, setAnalise] = useState(null);
  const [pontos, setPontos] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: a, error: eA }, { data: p, error: eP }, { data: pc, error: eC }] = await Promise.all([
      sbGetLexcoreAnalise(analiseId), sbListPontosCriticos(analiseId), sbListPecas(analiseId),
    ]);
    if (eA) toast("Erro ao carregar análise: " + eA.message, "error");
    if (eP) toast("Erro ao carregar pontos críticos: " + eP.message, "error");
    if (eC) toast("Erro ao carregar peças: " + eC.message, "error");
    setAnalise(a); setPontos(p); setPecas(pc);
    setLoading(false);
  }, [analiseId, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const togglePonto = async (ponto) => {
    const novoValor = !ponto.selecionado;
    setPontos(prev => prev.map(p => p.id === ponto.id ? { ...p, selecionado: novoValor } : p));
    const { error } = await sbSetPontoSelecionado(ponto.id, novoValor);
    if (error) toast("Erro ao salvar seleção: " + error.message, "error");
  };

  const selecionados = pontos.filter(p => p.selecionado);

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.sub, fontSize:13 }}>Carregando análise...</div>;
  if (!analise) return <EmptyState icon="lexcore" title="Análise não encontrada" sub="" />;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <IconBtn name="back" color={C.text} title="Voltar" onClick={onVoltar} />
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:"Inter,system-ui,sans-serif" }}>{analise.nomeEdital}</div>
          <div style={{ fontSize:12, color:C.sub }}>{analise.numeroProcesso ? `Processo ${analise.numeroProcesso}` : "Sem número de processo"}</div>
        </div>
      </div>

      {analise.status === "erro" && (
        <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"12px 14px", marginBottom:16, color:"#991b1b", fontSize:12.5 }}>
          Falha na análise: {analise.mensagemErro || "erro desconhecido"}
        </div>
      )}

      {pontos.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10, marginBottom:16 }}>
          <KpiCard label="Pontos Críticos" value={pontos.length} color={SX.laranja} />
          <KpiCard label="Risco Alto" value={pontos.filter(p=>p.nivelRisco==="alto").length} color={C.red} />
          <KpiCard label="Selecionados" value={selecionados.length} color={C.green} />
          <KpiCard label="Peças Geradas" value={pecas.length} color={C.accent2} />
        </div>
      )}

      {pontos.length === 0 && analise.status === "concluida" && (
        <EmptyState icon="check" title="Nenhum ponto crítico identificado" sub="A IA não encontrou cláusulas restritivas, ilegais, dúbias ou de risco neste edital." />
      )}

      <PontosCriticosList pontos={pontos} onToggle={togglePonto} />

      {pontos.length > 0 && (
        <div style={{
          position: isMobile ? "static" : "sticky", bottom: isMobile ? "auto" : 0,
          background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16,
          display:"flex", gap:12, alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", marginTop:8, boxShadow:"0 -2px 12px rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontSize:12.5, color:C.sub }}>{selecionados.length} ponto(s) selecionado(s) para gerar peça</div>
          <Btn color={SX.laranja} onClick={() => onIrGerarPeca(analiseId)} disabled={selecionados.length === 0}>
            <Icon name="sparkle" size={14} /> Gerar Peça Jurídica
          </Btn>
        </div>
      )}

      {pecas.length > 0 && (
        <div style={{ marginTop:24 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>Peças Geradas</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {pecas.map(p => (
              <div key={p.id} onClick={() => onAbrirPeca(p.id)} style={{
                background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 14px",
                display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", gap:10,
              }}>
                <div>
                  <span style={{ fontSize:13.5, fontWeight:600, color:C.text }}>{labelTipoPeca(p.tipoPeca)}</span>
                  <span style={{ fontSize:12, color:C.sub, marginLeft:8 }}>v{p.versao} · {fmtDate(p.createdAt)}</span>
                </div>
                <Badge label={p.status === "finalizada" ? "Finalizada" : "Rascunho"} color={p.status === "finalizada" ? C.green : undefined} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NovaPecaJuridica({ presetAnaliseId, toast, onCancel, onCriada }) {
  const [origem, setOrigem] = useState(presetAnaliseId ? "analise" : null); // null | analise | pdf

  if (origem === "analise") {
    return (
      <NovaPecaAPartirDeAnalise
        presetAnaliseId={presetAnaliseId}
        toast={toast}
        onCancel={presetAnaliseId ? onCancel : () => setOrigem(null)}
        onCriada={(id) => onCriada(id, "analise")}
      />
    );
  }

  if (origem === "pdf") {
    return (
      <LexcoreRespostaNova
        toast={toast}
        onCancel={() => setOrigem(null)}
        onCriada={(id) => onCriada(id, "pdf")}
      />
    );
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <IconBtn name="back" color={C.text} title="Voltar" onClick={onCancel} />
        <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:"Inter,system-ui,sans-serif" }}>Nova Peça Jurídica</div>
      </div>
      <div style={{ fontSize:13, color:C.sub, marginBottom:16 }}>Escolha a origem da peça a ser gerada:</div>
      <div style={{ display:"flex", flexDirection:"column", gap:12, maxWidth:640 }}>
        <button onClick={() => setOrigem("analise")} style={{
          textAlign:"left", background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:18,
          cursor:"pointer", fontFamily:"inherit", display:"flex", gap:14, alignItems:"flex-start",
        }}>
          <Icon name="lexcore" size={20} color={SX.laranja} />
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:4 }}>A partir de uma Análise de Edital salva</div>
            <div style={{ fontSize:12.5, color:C.sub, lineHeight:1.5 }}>Gera Impugnação, Razões de Recurso, Contrarrazões ou Petição com base nos pontos críticos já identificados numa análise.</div>
          </div>
        </button>
        <button onClick={() => setOrigem("pdf")} style={{
          textAlign:"left", background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:18,
          cursor:"pointer", fontFamily:"inherit", display:"flex", gap:14, alignItems:"flex-start",
        }}>
          <Icon name="attach" size={20} color={SX.laranja} />
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:4 }}>A partir de um PDF recebido</div>
            <div style={{ fontSize:12.5, color:C.sub, lineHeight:1.5 }}>Anexe uma impugnação ou recurso recebido de um licitante e gere a resposta em defesa do edital, independente de qualquer análise salva.</div>
          </div>
        </button>
      </div>
    </div>
  );
}

function NovaPecaAPartirDeAnalise({ presetAnaliseId, toast, onCancel, onCriada }) {
  const [analises, setAnalises] = useState([]);
  const [analiseId, setAnaliseId] = useState(presetAnaliseId || "");
  const [analise, setAnalise] = useState(null);
  const [pontos, setPontos] = useState([]);
  const [loadingPontos, setLoadingPontos] = useState(false);
  const [tipoPeca, setTipoPeca] = useState(TIPOS_PECA[0].value);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    if (presetAnaliseId) return;
    let ativo = true;
    sbListLexcoreAnalises().then(({ data, error }) => {
      if (!ativo) return;
      if (error) toast("Erro ao carregar análises: " + error.message, "error");
      const concluidas = (data || []).filter(a => a.status === "concluida");
      setAnalises(concluidas);
      setAnaliseId(prev => prev || concluidas[0]?.id || "");
    });
    return () => { ativo = false; };
  }, [presetAnaliseId, toast]);

  useEffect(() => {
    let ativo = true;
    if (!analiseId) { setAnalise(null); setPontos([]); return; }
    setLoadingPontos(true);
    Promise.all([sbGetLexcoreAnalise(analiseId), sbListPontosCriticos(analiseId)]).then(([{ data: a, error: eA }, { data: p, error: eP }]) => {
      if (!ativo) return;
      if (eA) toast("Erro ao carregar análise: " + eA.message, "error");
      if (eP) toast("Erro ao carregar pontos críticos: " + eP.message, "error");
      setAnalise(a); setPontos(p || []);
      setLoadingPontos(false);
    });
    return () => { ativo = false; };
  }, [analiseId, toast]);

  const togglePonto = async (ponto) => {
    const novoValor = !ponto.selecionado;
    setPontos(prev => prev.map(p => p.id === ponto.id ? { ...p, selecionado: novoValor } : p));
    const { error } = await sbSetPontoSelecionado(ponto.id, novoValor);
    if (error) toast("Erro ao salvar seleção: " + error.message, "error");
  };

  const selecionados = pontos.filter(p => p.selecionado);

  const gerar = async () => {
    if (!analiseId) { toast("Selecione uma análise de edital", "error"); return; }
    if (selecionados.length === 0) { toast("Selecione ao menos um ponto crítico", "error"); return; }
    setGerando(true);
    try {
      const label = labelTipoPeca(tipoPeca);
      const res = await anthropicFetch(null, {
        method: "POST",
        headers: { "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 4096,
          system: buildPecaSystem(label),
          messages: [{ role: "user", content: buildPecaUserPrompt({
            tipoPecaLabel: label, nomeEdital: analise.nomeEdital, numeroProcesso: analise.numeroProcesso, pontos: selecionados,
          }) }],
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error?.message || `Erro HTTP ${res.status}`); }
      const json = await res.json();
      if (json.stop_reason === "max_tokens") throw new Error("Peça muito extensa para gerar de uma vez. Reduza a quantidade de pontos selecionados.");
      const conteudo = json.content?.[0]?.text || "";
      if (!conteudo.trim()) throw new Error("IA não retornou conteúdo para a peça.");

      const { data: peca, error } = await sbCreatePeca({
        analiseId, tipoPeca, pontosCriticosIds: selecionados.map(p => p.id), conteudoGerado: conteudo,
      });
      if (error) throw error;
      toast("Peça gerada com sucesso!");
      onCriada(peca.id);
    } catch (err) {
      toast("Erro ao gerar peça: " + err.message, "error");
    } finally {
      setGerando(false);
    }
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <IconBtn name="back" color={C.text} title="Voltar" onClick={onCancel} />
        <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:"Inter,system-ui,sans-serif" }}>Nova Peça a partir de Análise</div>
      </div>

      {!presetAnaliseId && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, maxWidth:640, marginBottom:16 }}>
          {analises.length === 0 ? (
            <div style={{ fontSize:12.5, color:C.sub }}>Nenhuma análise concluída disponível. Finalize uma análise de edital primeiro, ou gere a peça a partir de um PDF recebido.</div>
          ) : (
            <Select label="Análise de Edital" value={analiseId} onChange={setAnaliseId}
              options={analises.map(a => ({ value:a.id, label:`${a.nomeEdital}${a.numeroProcesso?` — ${a.numeroProcesso}`:""}` }))} />
          )}
        </div>
      )}

      {loadingPontos ? (
        <div style={{ padding:40, textAlign:"center", color:C.sub, fontSize:13 }}>Carregando pontos críticos...</div>
      ) : analiseId && pontos.length === 0 ? (
        <EmptyState icon="check" title="Nenhum ponto crítico nesta análise" sub="Selecione outra análise ou gere a peça a partir de um PDF recebido." />
      ) : (
        <PontosCriticosList pontos={pontos} onToggle={togglePonto} />
      )}

      {pontos.length > 0 && (
        <div style={{
          background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16,
          display:"flex", gap:12, alignItems:"flex-end", flexWrap:"wrap", marginTop:8, boxShadow:"0 -2px 12px rgba(0,0,0,0.06)",
        }}>
          <Select label={`Gerar peça com ${selecionados.length} ponto(s) selecionado(s)`} value={tipoPeca} onChange={setTipoPeca} options={TIPOS_PECA} style={{ minWidth:220 }} />
          <Btn color={SX.laranja} onClick={gerar} disabled={gerando || selecionados.length === 0}>
            {gerando ? "Gerando peça..." : (<><Icon name="sparkle" size={14} /> Gerar Peça</>)}
          </Btn>
        </div>
      )}
    </div>
  );
}

function LexcorePeca({ pecaId, toast, onVoltar }) {
  const [peca, setPeca] = useState(null);
  const [conteudo, setConteudo] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let ativo = true;
    sbGetPeca(pecaId).then(({ data, error }) => {
      if (!ativo) return;
      if (error) toast("Erro ao carregar peça: " + error.message, "error");
      setPeca(data);
      setConteudo(data?.conteudoGerado || "");
      setLoading(false);
    });
    return () => { ativo = false; };
  }, [pecaId, toast]);

  const salvar = async () => {
    setSalvando(true);
    const { data, error } = await sbUpdatePeca(pecaId, { conteudoGerado: conteudo });
    setSalvando(false);
    if (error) { toast("Erro ao salvar: " + error.message, "error"); return; }
    setPeca(data);
    toast("Rascunho salvo");
  };

  const exportar = async () => {
    setExportando(true);
    try {
      await salvar();
      const { peca: atualizada, docxUrl } = await exportarPecaDocx({
        pecaId, tipoPeca: peca.tipoPeca, conteudoGerado: conteudo,
      });
      setPeca(atualizada);
      toast("Peça exportada em .docx");
      window.open(docxUrl, "_blank", "noopener");
    } catch (err) {
      toast("Erro ao exportar: " + err.message, "error");
    } finally {
      setExportando(false);
    }
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.sub, fontSize:13 }}>Carregando peça...</div>;
  if (!peca) return <EmptyState icon="lexcore" title="Peça não encontrada" sub="" />;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <IconBtn name="back" color={C.text} title="Voltar" onClick={onVoltar} />
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:"Inter,system-ui,sans-serif" }}>{labelTipoPeca(peca.tipoPeca)}</div>
          <div style={{ fontSize:12, color:C.sub }}>Versão {peca.versao} · <Badge label={peca.status === "finalizada" ? "Finalizada" : "Rascunho"} color={peca.status === "finalizada" ? C.green : undefined} /></div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="outline" color={SX.laranja} onClick={salvar} disabled={salvando || exportando}>{salvando ? "Salvando..." : "Salvar Rascunho"}</Btn>
          <Btn color={SX.laranja} onClick={exportar} disabled={exportando}>
            {exportando ? "Exportando..." : (<><Icon name="file" size={14} /> Exportar .docx</>)}
          </Btn>
        </div>
      </div>

      {peca.arquivoDocxUrl && (
        <div style={{ marginBottom:12 }}>
          <a href={peca.arquivoDocxUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:12.5, color:SX.laranjaEsc, textDecoration:"none", fontWeight:600 }}>
            <Icon name="externallink" size={12} /> Última versão exportada — abrir .docx
          </a>
        </div>
      )}

      <textarea value={conteudo} onChange={e => setConteudo(e.target.value)} rows={28}
        style={{
          width:"100%", boxSizing:"border-box", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8,
          padding:"16px 18px", color:C.text, fontSize:13.5, lineHeight:1.7, fontFamily:"'Times New Roman',serif",
          outline:"none", resize:"vertical",
        }}
        onFocus={e=>{ e.target.style.borderColor=SX.laranja; e.target.style.boxShadow=`0 0 0 3px ${SX.laranja}22`; }}
        onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }}
      />
    </div>
  );
}

function LexcoreRespostaNova({ toast, onCancel, onCriada }) {
  const [tipoResposta, setTipoResposta] = useState(TIPOS_RESPOSTA[0].value);
  const [nomeReferencia, setNomeReferencia] = useState("");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [file, setFile] = useState(null);
  const [gerando, setGerando] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.type !== "application/pdf") { toast("Envie o documento em formato PDF", "error"); return; }
    if (f.size > 20*1024*1024) { toast("Arquivo muito grande (máx. 20 MB)", "warn"); return; }
    setFile(f);
  };

  const gerar = async () => {
    if (!file) { toast("Selecione o PDF da impugnação ou do recurso recebido", "error"); return; }
    setGerando(true);
    try {
      const { url: arquivoOrigemUrl, error: upErr } = await uploadDocumentoRecebido(file);
      if (upErr) throw upErr;

      const label = labelTipoResposta(tipoResposta);
      const fileData = await new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(file); });
      const b64 = fileData.split(",")[1];

      const res = await anthropicFetch(null, {
        method: "POST",
        headers: { "anthropic-version": "2023-06-01", "content-type": "application/json", "anthropic-beta": "pdfs-2024-09-25" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 4096, system: buildRespostaSystem(label),
          messages: [{ role: "user", content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
            { type: "text", text: buildRespostaUserText({ tipoRespostaLabel: label, nomeReferencia: nomeReferencia.trim(), numeroProcesso: numeroProcesso.trim() }) },
          ] }],
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error?.message || `Erro HTTP ${res.status}`); }
      const json = await res.json();
      if (json.stop_reason === "max_tokens") throw new Error("Documento muito extenso para gerar a resposta de uma vez.");
      const conteudo = json.content?.[0]?.text || "";
      if (!conteudo.trim()) throw new Error("IA não retornou conteúdo para a resposta.");

      const { data: resposta, error } = await sbCreateResposta({
        tipoResposta, nomeReferencia: nomeReferencia.trim(), numeroProcesso: numeroProcesso.trim(),
        arquivoOrigemUrl, conteudoGerado: conteudo,
      });
      if (error) throw error;
      toast("Resposta gerada com sucesso!");
      onCriada(resposta.id);
    } catch (err) {
      toast("Erro ao gerar resposta: " + err.message, "error");
    } finally {
      setGerando(false);
    }
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <IconBtn name="back" color={C.text} title="Voltar" onClick={onCancel} />
        <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:"Inter,system-ui,sans-serif" }}>Nova Resposta a Impugnação/Recurso</div>
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, maxWidth:640, display:"flex", flexDirection:"column", gap:14 }}>
        <Select label="Tipo de resposta" value={tipoResposta} onChange={setTipoResposta} options={TIPOS_RESPOSTA} />
        <Input label="Edital/Objeto de referência (opcional)" value={nomeReferencia} onChange={setNomeReferencia} placeholder="Ex.: Pregão Eletrônico nº 012/2026 — Aquisição de material de expediente" />
        <Input label="Número do Processo (opcional)" value={numeroProcesso} onChange={setNumeroProcesso} placeholder="Ex.: 2026.001.0034" />

        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <label style={{ fontSize:12, color:C.sub, fontWeight:500 }}>Impugnação ou Recurso recebido (PDF)</label>
          <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFile} style={{ display:"none" }} />
          <Btn variant="outline" color={SX.laranja} onClick={() => fileRef.current?.click()} style={{ alignSelf:"flex-start" }}>
            <Icon name="attach" size={14} /> {file ? file.name : "Selecionar PDF recebido"}
          </Btn>
        </div>

        <div style={{
          background:"#fff1e6", border:`1px solid ${SX.laranja}55`, borderRadius:8, padding:"12px 14px",
          display:"flex", gap:10, alignItems:"flex-start", fontSize:12.5, color:"#7c2d12", lineHeight:1.5,
        }}>
          <Icon name="warning" size={16} color={SX.laranjaEsc} />
          A IA lê o PDF anexado diretamente e redige a resposta em nome do órgão licitante, defendendo o edital ou a decisão frente aos argumentos apresentados. Independente de qualquer análise de edital salva.
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="outline" color={C.sub} onClick={onCancel} disabled={gerando}>Cancelar</Btn>
          <Btn color={SX.laranja} onClick={gerar} disabled={gerando}>
            {gerando ? "Gerando resposta..." : (<><Icon name="sparkle" size={14} /> Gerar Resposta</>)}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function LexcoreRespostaDetalhe({ respostaId, toast, onVoltar }) {
  const [resposta, setResposta] = useState(null);
  const [conteudo, setConteudo] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let ativo = true;
    sbGetResposta(respostaId).then(({ data, error }) => {
      if (!ativo) return;
      if (error) toast("Erro ao carregar resposta: " + error.message, "error");
      setResposta(data);
      setConteudo(data?.conteudoGerado || "");
      setLoading(false);
    });
    return () => { ativo = false; };
  }, [respostaId, toast]);

  const salvar = async () => {
    setSalvando(true);
    const { data, error } = await sbUpdateResposta(respostaId, { conteudoGerado: conteudo });
    setSalvando(false);
    if (error) { toast("Erro ao salvar: " + error.message, "error"); return; }
    setResposta(data);
    toast("Rascunho salvo");
  };

  const exportar = async () => {
    setExportando(true);
    try {
      await salvar();
      const { resposta: atualizada, docxUrl } = await exportarRespostaDocx({
        respostaId, tipoResposta: resposta.tipoResposta, conteudoGerado: conteudo,
        nomeReferencia: resposta.nomeReferencia, numeroProcesso: resposta.numeroProcesso,
      });
      setResposta(atualizada);
      toast("Resposta exportada em .docx");
      window.open(docxUrl, "_blank", "noopener");
    } catch (err) {
      toast("Erro ao exportar: " + err.message, "error");
    } finally {
      setExportando(false);
    }
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.sub, fontSize:13 }}>Carregando resposta...</div>;
  if (!resposta) return <EmptyState icon="lexcore" title="Resposta não encontrada" sub="" />;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <IconBtn name="back" color={C.text} title="Voltar" onClick={onVoltar} />
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:"Inter,system-ui,sans-serif" }}>{labelTipoResposta(resposta.tipoResposta)}</div>
          <div style={{ fontSize:12, color:C.sub }}>{resposta.nomeReferencia || "Sem edital/objeto informado"} · <Badge label={resposta.status === "finalizada" ? "Finalizada" : "Rascunho"} color={resposta.status === "finalizada" ? C.green : undefined} /></div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="outline" color={SX.laranja} onClick={salvar} disabled={salvando || exportando}>{salvando ? "Salvando..." : "Salvar Rascunho"}</Btn>
          <Btn color={SX.laranja} onClick={exportar} disabled={exportando}>
            {exportando ? "Exportando..." : (<><Icon name="file" size={14} /> Exportar .docx</>)}
          </Btn>
        </div>
      </div>

      {resposta.arquivoDocxUrl && (
        <div style={{ marginBottom:12 }}>
          <a href={resposta.arquivoDocxUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:12.5, color:SX.laranjaEsc, textDecoration:"none", fontWeight:600 }}>
            <Icon name="externallink" size={12} /> Última versão exportada — abrir .docx
          </a>
        </div>
      )}

      <textarea value={conteudo} onChange={e => setConteudo(e.target.value)} rows={28}
        style={{
          width:"100%", boxSizing:"border-box", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8,
          padding:"16px 18px", color:C.text, fontSize:13.5, lineHeight:1.7, fontFamily:"'Times New Roman',serif",
          outline:"none", resize:"vertical",
        }}
        onFocus={e=>{ e.target.style.borderColor=SX.laranja; e.target.style.boxShadow=`0 0 0 3px ${SX.laranja}22`; }}
        onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }}
      />
    </div>
  );
}

function RelProcessos({ processos, onClose }) {
  const S = { page:{ fontFamily:"Inter,system-ui,sans-serif", color:"#111", background:"#fff", padding:"32px 40px", maxWidth:900, margin:"0 auto" }, titulo:{ fontSize:22, fontWeight:700, marginBottom:4 }, sub:{ fontSize:13, color:"#555", marginBottom:32 }, label:{ fontSize:11, color:"#666", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }, val:{ fontSize:14, fontWeight:500, color:"#111" }, grid3:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px 16px", marginBottom:10 } };
  const faseColor = { "Em andamento":"#4f46e5", "Publicado":"#0891b2", "Homologado":"#166534", "Planejamento":"#92400e", "Revogado":"#991b1b", "Suspenso":"#b45309", "Encerrado":"#374151" };
  return (
    <div style={{ position:"fixed", inset:0, background:"#fff", zIndex:200, overflowY:"auto" }}>
      <div style={{ background:"#0891b2", padding:"14px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10 }}>
        <span style={{ color:"#fff", fontWeight:700, fontSize:15 }}>Relatório — Processos Licitatórios</span>
        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={()=>window.print()} color="#fff" size="sm" style={{ color:"#0891b2", background:"#fff", border:"none" }}>🖨 Imprimir</Btn>
          <Btn onClick={onClose} color="#fff" variant="outline" size="sm" style={{ borderColor:"rgba(255,255,255,0.4)", color:"#fff" }}>✕ Fechar</Btn>
        </div>
      </div>
      <div style={S.page}>
        <div style={S.titulo}>Relatório de Processos Licitatórios</div>
        <div style={S.sub}>Gerado em {hoje()} · {processos.length} processo(s) cadastrado(s)</div>
        {processos.length === 0 && <div style={{ color:"#888", fontSize:14 }}>Nenhum processo cadastrado.</div>}
        {processos.map(p => (
          <div key={p.id} style={{ border:"1px solid #ddd", borderRadius:8, padding:"20px 24px", marginBottom:20, pageBreakInside:"avoid", borderLeft:`4px solid ${faseColor[p.fase]||"#94a3b8"}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:"#0891b2" }}>{p.numero}</div>
                <div style={{ fontSize:13, color:"#555", marginTop:2 }}>{p.objeto}</div>
                {p.orgao && <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{p.orgao}</div>}
              </div>
              <div style={{ fontSize:12, padding:"4px 12px", borderRadius:20, background:(faseColor[p.fase]||"#94a3b8")+"22", color:faseColor[p.fase]||"#374151", fontWeight:600 }}>{p.fase}</div>
            </div>
            <div style={S.grid3}>
              <div><div style={S.label}>Modalidade</div><div style={S.val}>{p.modalidade}</div></div>
              <div><div style={S.label}>Valor Estimado</div><div style={{ ...S.val, fontWeight:700 }}>{fmtBRL(p.valor)}</div></div>
              <div><div style={S.label}>Data de Abertura</div><div style={S.val}>{fmtDate(p.abertura)}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabRelatorios({ data }) {
  const { processos, atas, contratos, dispensas, inexigibilidades } = data;
  const [relatorio, setRelatorio] = useState(null); // { titulo, corpo }
  const iframeRef = useRef(null);
  useOverlayBack(!!relatorio, () => setRelatorio(null));

  const cards = [
    { icon:"atas",      color:C.accent2,  title:"Atas de Registro de Preços", desc:`${atas.length} ata(s) · Fornecedor, valores, saldo e itens`,              total:fmtBRL(atas.reduce((s,a)=>s+a.valorTotal,0)),                          label:"Valor total", gerar:()=>setRelatorio({ titulo:"Relatório — Atas de RP",      corpo:gerarRelatorioAtas(atas) }) },
    { icon:"dispensa",  color:"#f59e0b",  title:"Dispensas de Licitação",     desc:`${dispensas.length} registro(s) · Contratada, objeto e valor`,            total:fmtBRL(dispensas.reduce((s,d)=>s+(d.valor_total||0),0)),               label:"Valor total", gerar:()=>setRelatorio({ titulo:"Relatório — Dispensas",        corpo:gerarRelatorioDispensas(dispensas) }) },
    { icon:"inexigib",  color:C.purple,   title:"Inexigibilidade",             desc:`${inexigibilidades.length} registro(s) · Contratada, objeto e valor`,    total:fmtBRL(inexigibilidades.reduce((s,i)=>s+(i.valor_total||0),0)),       label:"Valor total", gerar:()=>setRelatorio({ titulo:"Relatório — Inexigibilidade", corpo:gerarRelatorioInexigibilidades(inexigibilidades) }) },
    { icon:"processos", color:C.accent,   title:"Processos Licitatórios",     desc:`${processos.length} processo(s) · Modalidade, fase e valor`,              total:processos.filter(p=>p.fase==="Em andamento").length+" em andamento",   label:"Situação",    gerar:()=>setRelatorio({ titulo:"Relatório — Processos",        corpo:gerarRelatorioProcessos(processos) }) },
    { icon:"contratos", color:C.green,    title:"Contratos",                  desc:`${contratos.length} contrato(s) · Vigência, fornecedor e valor`,          total:fmtBRL(contratos.filter(c=>c.status==="Vigente").reduce((s,c)=>s+c.valor,0)), label:"Valor vigente", gerar:()=>setRelatorio({ titulo:"Relatório — Contratos",       corpo:gerarRelatorioContratos(contratos) }) },
  ];

  if (relatorio) {
    return (
      <div style={{ position:"fixed", inset:0, background:"#fff", zIndex:200, display:"flex", flexDirection:"column" }}>
        <div style={{ background:C.accent, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, gap:10 }}>
          <button onClick={()=>setRelatorio(null)} style={{ background:"none", border:"1px solid rgba(0,0,0,0.35)", borderRadius:6, padding:"7px 14px", color:"#121212", cursor:"pointer", fontSize:13, fontFamily:"inherit", fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
            <Icon name="back" size={13} color="#121212" /> Voltar
          </button>
          <span style={{ color:"#121212", fontWeight:700, fontSize:14, flex:1, textAlign:"center" }}>{relatorio.titulo}</span>
          <Btn onClick={()=>iframeRef.current?.contentWindow?.print()} color="#121212" size="sm" style={{ color:"#fff", background:"#121212", border:"none" }}>🖨 Imprimir</Btn>
        </div>
        <iframe ref={iframeRef} title={relatorio.titulo} srcDoc={buildRelatorioDoc(relatorio.titulo, relatorio.corpo)} style={{ flex:1, border:"none", width:"100%" }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize:13, color:C.sub, marginBottom:20 }}>Selecione o relatório para visualizar e imprimir.</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:16 }}>
        {cards.map(r=>(
          <div key={r.title} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:22, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ color:r.color }}><Icon name={r.icon} size={22} strokeWidth={1.5} color={r.color} /></div>
            <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{r.title}</div>
            <div style={{ fontSize:12, color:C.sub, lineHeight:1.6 }}>{r.desc}</div>
            <div style={{ background:C.subtle, borderRadius:6, padding:"10px 14px" }}>
              <div style={{ fontSize:10, color:C.sub, textTransform:"uppercase", letterSpacing:"0.05em" }}>{r.label}</div>
              <div style={{ fontSize:16, fontWeight:700, color:r.color, marginTop:2 }}>{r.total}</div>
            </div>
            <Btn onClick={r.gerar} color={r.color} style={{ marginTop:4 }}>Gerar Relatório</Btn>
          </div>
        ))}
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

const EXTRACTION_SYSTEM = `Você é especialista em licitações públicas Lei 14.133/2021. O usuário enviou um documento público (contrato, ata de registro de preços ou processo licitatório) e quer cadastrá-lo no sistema. Analise o documento com atenção, identifique o tipo e extraia todos os campos disponíveis. Retorne APENAS JSON válido sem markdown, sem bloco de código, sem texto extra:
{"tipo":"contrato","dados":{"numero_contrato":"","objeto":"","fornecedor":"","cnpj":"","valor_total":"","dotacao_orcamentaria":"","data_assinatura":"","data_inicio_vigencia":"","data_fim_vigencia":"","secretaria":"","fiscal_contrato":""},"confianca":"alta","campos_nao_encontrados":[]}

Para contrato use tipo "contrato" e extraia: numero_contrato, objeto, fornecedor (razão social), cnpj, valor_total, dotacao_orcamentaria, data_assinatura (YYYY-MM-DD), data_inicio_vigencia (YYYY-MM-DD), data_fim_vigencia (YYYY-MM-DD), secretaria, fiscal_contrato.
Para ata de registro de preços use tipo "ata" e extraia: numero_ata, objeto, fornecedor, cnpj, itens (array de objetos com descricao, unidade, quantidade, valor_unitario), valor_total, data_assinatura (YYYY-MM-DD), data_vigencia (YYYY-MM-DD), orgao_gerenciador.
Para processo licitatório use tipo "processo" e extraia: numero_processo, objeto, modalidade, secretaria_solicitante, valor_estimado, data_abertura (YYYY-MM-DD), situacao.
Preencha campos_nao_encontrados com os nomes dos campos que não constam no documento. Confiança: alta se a maioria dos campos foi encontrada, media se metade, baixa se poucos.`;

const EXTRACTION_RE = /\b(lan[çc]a|cadastra|registra|inclui|insere|importa|salva)\b/i;

const VALOR_INSTRUCAO = `REGRA CRÍTICA PARA VALORES MONETÁRIOS: retorne SOMENTE dígitos inteiros, sem R$, sem pontos de milhar, sem vírgulas. Exemplos obrigatórios: "R$ 20.000,00" → 20000 | "R$ 1.500.000,00" → 1500000 | "R$ 9.800,50" → 9800 | "R$ 320.000,00" → 320000. NUNCA coloque pontos ou vírgulas no número — apenas dígitos.`;

const EXTRACTION_PROMPTS = {
  dispensa: `Você é especialista em licitações públicas Lei 14.133/2021. Analise este documento de DISPENSA DE LICITAÇÃO (arts. 74-76 da Lei 14.133/2021) e extraia todos os dados disponíveis. Retorne APENAS JSON válido sem markdown, sem bloco de código, sem texto extra:\n{"tipo":"dispensa","dados":{"numero_processo":"","objeto":"","contratada":"","cnpj":"","valor_total":0,"data_ratificacao":"","vigencia":"","secretaria":"","status":"Em andamento"},"confianca":"alta","campos_nao_encontrados":[]}\n${VALOR_INSTRUCAO}\nExtraia: numero_processo (número do processo ou da dispensa), objeto (descrição do objeto da contratação), contratada (razão social da empresa contratada), cnpj (CNPJ da empresa), valor_total (SOMENTE dígitos inteiros — veja regra acima), data_ratificacao (data da ratificação ou despacho em YYYY-MM-DD), vigencia (data de término da vigência em YYYY-MM-DD), secretaria (secretaria ou órgão solicitante/contratante). Liste em campos_nao_encontrados os que não constam no documento. Confiança: alta se maioria encontrada, media se metade, baixa se poucos.`,
  inexigibilidade: `Você é especialista em licitações públicas Lei 14.133/2021. Analise este documento de INEXIGIBILIDADE DE LICITAÇÃO (art. 74 e 79 da Lei 14.133/2021) e extraia todos os dados disponíveis. Retorne APENAS JSON válido sem markdown, sem bloco de código, sem texto extra:\n{"tipo":"inexigibilidade","dados":{"numero_processo":"","objeto":"","contratada":"","cnpj":"","valor_total":0,"data_ratificacao":"","vigencia":"","secretaria":"","status":"Em andamento"},"confianca":"alta","campos_nao_encontrados":[]}\n${VALOR_INSTRUCAO}\nExtraia: numero_processo, objeto, contratada (razão social), cnpj, valor_total (SOMENTE dígitos inteiros — veja regra acima), data_ratificacao (YYYY-MM-DD), vigencia (YYYY-MM-DD), secretaria. Liste em campos_nao_encontrados os que não constam. Confiança: alta se maioria encontrada, media se metade, baixa se poucos.`,
  ata: `Você é especialista em licitações públicas Lei 14.133/2021. Analise esta ATA DE REGISTRO DE PREÇOS (arts. 82-86 da Lei 14.133/2021) e extraia todos os dados. Retorne APENAS JSON válido sem markdown, sem bloco de código, sem texto extra:\n{"tipo":"ata","dados":{"numero_ata":"","objeto":"","fornecedor":"","cnpj":"","valor_total":0,"data_assinatura":"","data_vigencia":"","orgao_gerenciador":"","itens":[]},"confianca":"alta","campos_nao_encontrados":[]}\n${VALOR_INSTRUCAO}\nExtraia: numero_ata, objeto, fornecedor (razão social), cnpj, valor_total (SOMENTE dígitos inteiros — veja regra acima), data_assinatura (YYYY-MM-DD), data_vigencia (YYYY-MM-DD), orgao_gerenciador, itens (array com: descricao, unidade, quantidade, valor_unitario — valor_unitario também SOMENTE dígitos, ex: "R$ 5,80" → 5.80). Liste em campos_nao_encontrados os que não constam. Confiança: alta se maioria encontrada, media se metade, baixa se poucos.`,
  contrato: `Você é especialista em licitações públicas Lei 14.133/2021. Analise este CONTRATO ADMINISTRATIVO e extraia todos os dados disponíveis. Retorne APENAS JSON válido sem markdown, sem bloco de código, sem texto extra:\n{"tipo":"contrato","dados":{"numero_contrato":"","objeto":"","fornecedor":"","cnpj":"","valor_total":0,"dotacao_orcamentaria":"","data_assinatura":"","data_inicio_vigencia":"","data_fim_vigencia":"","secretaria":"","fiscal_contrato":""},"confianca":"alta","campos_nao_encontrados":[]}\n${VALOR_INSTRUCAO}\nExtraia: numero_contrato (número do contrato), objeto (descrição do objeto contratado), fornecedor (razão social da contratada), cnpj (CNPJ da contratada), valor_total (SOMENTE dígitos inteiros — veja regra acima), dotacao_orcamentaria, data_assinatura (YYYY-MM-DD), data_inicio_vigencia (YYYY-MM-DD), data_fim_vigencia (YYYY-MM-DD), secretaria (secretaria ou órgão contratante), fiscal_contrato (nome do fiscal). Liste em campos_nao_encontrados os que não constam. Confiança: alta se maioria encontrada, media se metade, baixa se poucos.`,
  processo: `Você é especialista em licitações públicas Lei 14.133/2021. Analise este PROCESSO LICITATÓRIO e extraia todos os dados disponíveis. Retorne APENAS JSON válido sem markdown, sem bloco de código, sem texto extra:\n{"tipo":"processo","dados":{"numero_processo":"","objeto":"","modalidade":"","secretaria_solicitante":"","valor_estimado":0,"data_abertura":"","situacao":""},"confianca":"alta","campos_nao_encontrados":[]}\n${VALOR_INSTRUCAO}\nExtraia: numero_processo (número do processo administrativo ou do edital), objeto (descrição do objeto licitado), modalidade (ex: Pregão Eletrônico, Pregão Presencial, Concorrência, Dispensa — conforme Lei 14.133/2021), secretaria_solicitante (secretaria ou órgão solicitante), valor_estimado (SOMENTE dígitos inteiros — veja regra acima), data_abertura (data de abertura das propostas em YYYY-MM-DD), situacao (fase atual: Planejamento, Em andamento, Homologado, Fracassado, Deserto, Cancelado). Liste em campos_nao_encontrados os que não constam. Confiança: alta se maioria encontrada, media se metade, baixa se poucos.`,
};

function TabClaude({ data, setProcessos, setAtas, setContratos, setDispensas, setInexigibilidades, toast }) {
  const [msgs, setMsgs] = useState([{ role:"assistant", content:"Olá. Sou o assistente LicitaGov com IA, especializado na Lei 14.133/2021. Posso responder dúvidas sobre modalidades licitatórias, atas de RP, contratos, pesquisa de preços e muito mais.\n\nUse os botões de extração rápida abaixo para enviar um PDF ou imagem de Dispensa, Inexigibilidade ou Ata de RP e cadastrar automaticamente no sistema." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [extractionCard, setExtractionCard] = useState(null);
  const [editableData, setEditableData] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const fileRefDispensa = useRef(null);
  const fileRefInexigib = useRef(null);
  const fileRefAta = useRef(null);
  const fileRefContrato = useRef(null);
  const fileRefProcesso = useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }); },[msgs, extractionCard]);

  const buildCtx = () => {
    const { processos, atas, contratos, cotacoes } = data;
    return `\n\nContexto atual do sistema LicitaGov do usuário:\n- ${processos.length} processos (${processos.filter(p=>p.fase==="Em andamento").length} em andamento)\n- ${atas.length} atas de registro de preços\n- ${contratos.filter(c=>c.status==="Vigente").length} contratos vigentes\n- ${cotacoes.length} pesquisas de preços realizadas`;
  };

  const buildDocBlock = (att) => {
    const b64 = att.data.split(",")[1];
    if (att.type === "application/pdf")
      return { type:"document", source:{ type:"base64", media_type:"application/pdf", data:b64 } };
    if (att.type.startsWith("image/"))
      return { type:"image", source:{ type:"base64", media_type:att.type, data:b64 } };
    return null;
  };

  const extractDocument = async (currentInput, currentAttachments) => {
    setExtracting(true);
    const displayMsg = { role:"user", content: currentInput.trim() || "(documento para extração)", attachmentNames: currentAttachments.map(a=>a.name) };
    setMsgs(prev=>[...prev, displayMsg]);
    setInput(""); setAttachments([]);

    const docBlocks = currentAttachments.map(buildDocBlock).filter(Boolean);
    const userContent = [
      ...docBlocks,
      { type:"text", text: currentInput.trim() || "Analise e extraia os dados deste documento." },
    ];

    const hasPdf = currentAttachments.some(a => a.type === "application/pdf");
    const headers = {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      ...(hasPdf ? { "anthropic-beta": "pdfs-2024-09-25" } : {}),
    };

    try {
      const res = await anthropicFetch(null, {
        method:"POST", headers,
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:8192, system:EXTRACTION_SYSTEM, messages:[{ role:"user", content:userContent }] }),
      });
      if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.error?.message || `Erro HTTP ${res.status}`); }
      const json = await res.json();
      if (json.stop_reason === "max_tokens") throw new Error("Documento muito extenso para extração automática. Tente um documento menor ou com menos itens.");
      const text = json.content?.[0]?.text || "";
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("IA não retornou JSON válido. Tente novamente.");
      const result = JSON.parse(m[0]);
      if (!result.tipo || !result.dados) throw new Error("Formato de resposta inválido.");
      setExtractionCard(result);
      setEditableData({ ...result.dados });
      const tipoLabel = { contrato:"contrato", ata:"ata de registro de preços", processo:"processo licitatório", dispensa:"dispensa de licitação", inexigibilidade:"inexigibilidade" }[result.tipo] || result.tipo;
      setMsgs(prev=>[...prev, { role:"assistant", content:`Documento identificado como ${tipoLabel}. Revise os dados extraídos abaixo e clique em "Confirmar e Salvar".` }]);
    } catch(err) {
      setMsgs(prev=>[...prev, { role:"assistant", content:`Erro na extração: ${err.message}` }]);
    } finally { setExtracting(false); }
  };

  const TIPO_LABELS = { dispensa:"Dispensa de Licitação", inexigibilidade:"Inexigibilidade", ata:"Ata de Registro de Preços" };

  const extractDocumentTipo = async (tipo, file) => {
    if (!file) return;
    setExtracting(true);
    setExtractionCard(null); setEditableData(null);
    const displayMsg = { role:"user", content:`(Extração de ${TIPO_LABELS[tipo]})`, attachmentNames:[file.name] };
    setMsgs(prev=>[...prev, displayMsg]);
    try {
      const fileData = await new Promise((res,rej) => { const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=rej; r.readAsDataURL(file); });
      const b64 = fileData.split(",")[1];
      const isPdf = file.type === "application/pdf";
      const docBlock = isPdf
        ? { type:"document", source:{ type:"base64", media_type:"application/pdf", data:b64 } }
        : { type:"image",    source:{ type:"base64", media_type:file.type,          data:b64 } };
      const headers = { "anthropic-version":"2023-06-01", "content-type":"application/json", ...(isPdf ? { "anthropic-beta":"pdfs-2024-09-25" } : {}) };
      const res = await anthropicFetch(null, {
        method:"POST", headers,
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:8192, system:EXTRACTION_PROMPTS[tipo], messages:[{ role:"user", content:[docBlock, { type:"text", text:"Extraia os dados deste documento conforme as instruções." }] }] }),
      });
      if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.error?.message || `Erro HTTP ${res.status}`); }
      const json = await res.json();
      if (json.stop_reason === "max_tokens") throw new Error("Documento muito extenso. Tente um arquivo menor.");
      const text = json.content?.[0]?.text || "";
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("IA não retornou JSON válido. Tente novamente.");
      const result = JSON.parse(m[0]);
      if (!result.tipo || !result.dados) throw new Error("Formato de resposta inválido.");
      setExtractionCard(result);
      setEditableData({ ...result.dados });
      setMsgs(prev=>[...prev, { role:"assistant", content:`${TIPO_LABELS[tipo]} identificada. Revise os dados extraídos abaixo e clique em "Confirmar e Salvar".` }]);
    } catch(err) {
      setMsgs(prev=>[...prev, { role:"assistant", content:`Erro na extração: ${err.message}` }]);
    } finally { setExtracting(false); }
  };

  const handleExtractFile = (tipo) => (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 20*1024*1024) { toast("Arquivo muito grande (máx. 20 MB)","warn"); return; }
    extractDocumentTipo(tipo, file);
  };

  const send = async () => {
    if ((!input.trim() && !attachments.length) || loading || extracting) return;
    if (attachments.length > 0 && EXTRACTION_RE.test(input)) {
      return extractDocument(input, attachments);
    }
    let userContent;
    if (attachments.length > 0) {
      const parts = attachments.map(buildDocBlock).filter(Boolean);
      parts.push({ type:"text", text: input.trim() || "Analise o conteúdo do arquivo anexado." });
      userContent = parts;
    } else { userContent = input.trim(); }
    const displayMsg = { role:"user", content: input.trim() || "(arquivo anexado)", attachmentNames: attachments.map(a=>a.name) };
    const apiHistory = [...msgs.filter(m=>typeof m.content==="string"), displayMsg].map(m=>({ role:m.role, content:m.content }));
    apiHistory[apiHistory.length-1].content = userContent;
    setMsgs(prev=>[...prev, displayMsg]);
    setInput(""); setAttachments([]); setLoading(true);
    const hasPdf = attachments.some(a => a.type === "application/pdf");
    try {
      const res = await anthropicFetch(null, {
        method:"POST",
        headers:{ "anthropic-version": "2023-06-01", "content-type": "application/json", ...(hasPdf ? { "anthropic-beta":"pdfs-2024-09-25" } : {}) },
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:2048, system:CLAUDE_SYSTEM+buildCtx(), messages:apiHistory }),
      });
      if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.error?.message || `Erro HTTP ${res.status}`); }
      const json = await res.json();
      setMsgs(prev=>[...prev, { role:"assistant", content:json.content?.[0]?.text || "Sem resposta." }]);
    } catch(err) {
      setMsgs(prev=>[...prev, { role:"assistant", content:`Erro: ${err.message}` }]);
    } finally { setLoading(false); }
  };

  const parseBRL = (v) => {
    if (!v && v !== 0) return 0;
    const s = String(v).trim().replace(/[R$\s]/g, "");
    if (!s) return 0;
    const hasComma = s.includes(","), hasDot = s.includes(".");
    if (hasComma && hasDot) {
      return s.lastIndexOf(",") > s.lastIndexOf(".")
        ? parseFloat(s.replace(/\./g,"").replace(",",".")) || 0  // BR: 20.000,50
        : parseFloat(s.replace(/,/g,"")) || 0;                   // US: 20,000.50
    }
    if (hasComma) {
      const parts = s.split(",");
      return (parts.length === 2 && parts[1].length <= 2)
        ? parseFloat(s.replace(",",".")) || 0   // BR decimal: 20000,50
        : parseFloat(s.replace(/,/g,"")) || 0;  // US thousands: 20,000
    }
    if (hasDot) {
      const parts = s.split(".");
      return (parts.length > 2 || (parts.length === 2 && parts[1].length === 3))
        ? parseFloat(s.replace(/\./g,"")) || 0  // BR/multiple thousands: 20.000 ou 20.000.000
        : parseFloat(s) || 0;                   // decimal normal: 20.50
    }
    return parseFloat(s) || 0;
  };

  const confirmarExtracao = () => {
    if (!extractionCard || !editableData) return;
    const { tipo } = extractionCard;
    if (tipo === "contrato") {
      const ctId = uid();
      const novoContrato = {
        id:ctId, status:"Vigente",
        numero: editableData.numero_contrato || "",
        objeto: editableData.objeto || "",
        fornecedor: editableData.fornecedor || "",
        cnpj: editableData.cnpj || "",
        valor: parseBRL(editableData.valor_total),
        inicio: editableData.data_inicio_vigencia || editableData.data_assinatura || "",
        fim: editableData.data_fim_vigencia || "",
        processo: "",
        dotacao: editableData.dotacao_orcamentaria || "",
        secretaria: editableData.secretaria || "",
        fiscal: editableData.fiscal_contrato || "",
      };
      setContratos(prev=>[novoContrato, ...prev]);
      toast("Contrato cadastrado com sucesso!");
      sbCreateContrato({ id:ctId, status:'Vigente', numero:novoContrato.numero, objeto:novoContrato.objeto, fornecedor:novoContrato.fornecedor, cnpj:novoContrato.cnpj||null, valor:novoContrato.valor, inicio:novoContrato.inicio||null, fim:novoContrato.fim||null, processo:null, link_drive:null })
        .then(({error})=>{ if(error) toast("Erro ao salvar contrato: "+error.message,"error"); });
    } else if (tipo === "ata") {
      const itens = (Array.isArray(editableData.itens) ? editableData.itens : []).map(it=>({
        id:uid(),
        descricao: it.descricao || "",
        unidade: it.unidade || "Un",
        qtdRegistrada: parseFloat(it.quantidade) || 0,
        qtdUtilizada: 0,
        valorUnit: parseBRL(it.valor_unitario),
      }));
      const vt = parseBRL(editableData.valor_total);
      const ataId = uid();
      const novaAta = {
        id:ataId,
        numero: editableData.numero_ata || "",
        objeto: editableData.objeto || "",
        fornecedor: editableData.fornecedor || "",
        cnpj: editableData.cnpj || "",
        vigencia: editableData.data_vigencia || "",
        valorTotal: vt,
        saldoDisponivel: vt,
        itens,
        orgaoGerenciador: editableData.orgao_gerenciador || "",
      };
      setAtas(prev=>[novaAta, ...prev]);
      toast("Ata de Registro de Preços cadastrada!");
      sbCreateAta({ id:ataId, numero:novaAta.numero, objeto:novaAta.objeto, fornecedor:novaAta.fornecedor, cnpj:novaAta.cnpj||null, vigencia:novaAta.vigencia||null, valor_total:vt, saldo_disponivel:vt, link_drive:null, endereco:null, telefone:null, email:null })
        .then(({error})=>{
          if(error) { toast("Erro ao salvar ata: "+error.message,"error"); return; }
          if(itens.length) Promise.all(itens.map(it=>sbCreateAtaItem(ataId,it))).then(rs=>{ const e=rs.find(r=>r.error); if(e) toast("Erro ao salvar itens: "+e.error.message,"error"); });
        });
    } else if (tipo === "processo") {
      const procId = uid();
      const novoProc = {
        id:procId,
        numero: editableData.numero_processo || "",
        objeto: editableData.objeto || "",
        modalidade: editableData.modalidade || "Pregão Eletrônico",
        fase: editableData.situacao || "Planejamento",
        valor: parseBRL(editableData.valor_estimado),
        abertura: editableData.data_abertura || "",
        orgao: editableData.secretaria_solicitante || "",
      };
      setProcessos(prev=>[novoProc, ...prev]);
      toast("Processo licitatório cadastrado!");
      sbCreateProcesso({ id:procId, numero:novoProc.numero, objeto:novoProc.objeto, modalidade:novoProc.modalidade, fase:novoProc.fase, valor:novoProc.valor, abertura:novoProc.abertura||null, orgao:novoProc.orgao||null })
        .then(({error})=>{ if(error) toast("Erro ao salvar processo: "+error.message,"error"); });
    }
    else if (tipo === "dispensa") {
      const dispId = uid();
      const novaDisp = {
        id:dispId,
        numero_processo: editableData.numero_processo || "",
        objeto:          editableData.objeto          || "",
        contratada:      editableData.contratada      || "",
        cnpj:            editableData.cnpj            || "",
        valor_total:     parseBRL(editableData.valor_total),
        data_ratificacao:editableData.data_ratificacao|| "",
        vigencia:        editableData.vigencia        || "",
        secretaria:      editableData.secretaria      || "",
        link_drive:      "",
        status:          editableData.status          || "Em andamento",
      };
      setDispensas(prev=>[novaDisp, ...prev]);
      toast("Dispensa cadastrada com sucesso!");
      sbCreateDispensa({ id:dispId, numero_processo:novaDisp.numero_processo, objeto:novaDisp.objeto, contratada:novaDisp.contratada, cnpj:novaDisp.cnpj||null, valor_total:novaDisp.valor_total, data_ratificacao:novaDisp.data_ratificacao||null, vigencia:novaDisp.vigencia||null, secretaria:novaDisp.secretaria||null, link_drive:null, status:novaDisp.status })
        .then(({error})=>{ if(error) toast("Erro ao salvar dispensa: "+error.message,"error"); });
    } else if (tipo === "inexigibilidade") {
      const inexId = uid();
      const novaInex = {
        id:inexId,
        numero_processo: editableData.numero_processo || "",
        objeto:          editableData.objeto          || "",
        contratada:      editableData.contratada      || "",
        cnpj:            editableData.cnpj            || "",
        valor_total:     parseBRL(editableData.valor_total),
        data_ratificacao:editableData.data_ratificacao|| "",
        vigencia:        editableData.vigencia        || "",
        secretaria:      editableData.secretaria      || "",
        link_drive:      "",
        status:          editableData.status          || "Em andamento",
      };
      setInexigibilidades(prev=>[novaInex, ...prev]);
      toast("Inexigibilidade cadastrada com sucesso!");
      sbCreateInexigibilidade({ id:inexId, numero_processo:novaInex.numero_processo, objeto:novaInex.objeto, contratada:novaInex.contratada, cnpj:novaInex.cnpj||null, valor_total:novaInex.valor_total, data_ratificacao:novaInex.data_ratificacao||null, vigencia:novaInex.vigencia||null, secretaria:novaInex.secretaria||null, link_drive:null, status:novaInex.status })
        .then(({error})=>{ if(error) toast("Erro ao salvar inexigibilidade: "+error.message,"error"); });
    }
    const modulo = { contrato:"Contratos", ata:"Ata de RP", processo:"Processos", dispensa:"Dispensas", inexigibilidade:"Inexigibilidade" }[tipo] || tipo;
    setMsgs(prev=>[...prev, { role:"assistant", content:`Salvo com sucesso! Acesse o módulo ${modulo} para visualizar e editar.` }]);
    setExtractionCard(null);
    setEditableData(null);
  };

  const handleFile = (e) => {
    Array.from(e.target.files).forEach(file => {
      if (file.size > 20*1024*1024) { toast("Arquivo muito grande (máx. 20 MB)","warn"); return; }
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

  /* ── Card de confirmação de extração ── */
  const ExtractionCard = () => {
    if (!extractionCard || !editableData) return null;
    const { tipo, campos_nao_encontrados=[], confianca } = extractionCard;
    const confiancaColor = confianca==="alta" ? C.green : confianca==="media" ? C.gold : C.red;
    const tipoLabel = { contrato:"Contrato", ata:"Ata de Registro de Preços", processo:"Processo Licitatório", dispensa:"Dispensa de Licitação", inexigibilidade:"Inexigibilidade" }[tipo] || tipo;
    const tipoColor = { dispensa:"#f59e0b", inexigibilidade:"#C0C0C0", ata:C.green, contrato:C.accent, processo:C.accent2 }[tipo] || C.accent;

    const FIELDS = {
      contrato: [
        { key:"numero_contrato",     label:"Número do Contrato" },
        { key:"objeto",              label:"Objeto" },
        { key:"fornecedor",          label:"Contratada" },
        { key:"cnpj",                label:"CNPJ" },
        { key:"valor_total",         label:"Valor Total (R$)" },
        { key:"dotacao_orcamentaria",label:"Dotação Orçamentária" },
        { key:"data_assinatura",     label:"Data de Assinatura" },
        { key:"data_inicio_vigencia",label:"Início da Vigência" },
        { key:"data_fim_vigencia",   label:"Fim da Vigência" },
        { key:"secretaria",          label:"Secretaria" },
        { key:"fiscal_contrato",     label:"Fiscal do Contrato" },
      ],
      ata: [
        { key:"numero_ata",       label:"Número da Ata" },
        { key:"objeto",           label:"Objeto" },
        { key:"fornecedor",       label:"Fornecedor" },
        { key:"cnpj",             label:"CNPJ" },
        { key:"valor_total",      label:"Valor Total (R$)" },
        { key:"data_assinatura",  label:"Data de Assinatura" },
        { key:"data_vigencia",    label:"Vigência" },
        { key:"orgao_gerenciador",label:"Órgão Gerenciador" },
      ],
      processo: [
        { key:"numero_processo",       label:"Número do Processo" },
        { key:"objeto",                label:"Objeto" },
        { key:"modalidade",            label:"Modalidade" },
        { key:"secretaria_solicitante",label:"Secretaria Solicitante" },
        { key:"valor_estimado",        label:"Valor Estimado (R$)" },
        { key:"data_abertura",         label:"Data de Abertura" },
        { key:"situacao",              label:"Situação/Fase" },
      ],
      dispensa: [
        { key:"numero_processo", label:"Número do Processo" },
        { key:"objeto",          label:"Objeto" },
        { key:"contratada",      label:"Contratada (Razão Social)" },
        { key:"cnpj",            label:"CNPJ" },
        { key:"valor_total",     label:"Valor Total (R$)" },
        { key:"data_ratificacao",label:"Data de Ratificação" },
        { key:"vigencia",        label:"Vigência (Fim)" },
        { key:"secretaria",      label:"Secretaria" },
      ],
      inexigibilidade: [
        { key:"numero_processo", label:"Número do Processo" },
        { key:"objeto",          label:"Objeto" },
        { key:"contratada",      label:"Contratada (Razão Social)" },
        { key:"cnpj",            label:"CNPJ" },
        { key:"valor_total",     label:"Valor Total (R$)" },
        { key:"data_ratificacao",label:"Data de Ratificação" },
        { key:"vigencia",        label:"Vigência (Fim)" },
        { key:"secretaria",      label:"Secretaria" },
      ],
    };
    const fields = FIELDS[tipo] || [];

    return (
      <div style={{ background:C.card, border:`2px solid ${tipoColor}44`, borderRadius:10, padding:20, boxShadow:`0 4px 16px ${tipoColor}18`, animation:"fadeUp 0.25s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, fontFamily:"Inter,system-ui,sans-serif", color:C.text, display:"flex", alignItems:"center", gap:7 }}>
              <Icon name="sparkle" size={14} color={tipoColor} />
              Dados Extraídos — {tipoLabel}
            </div>
            <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>Revise e edite os campos antes de salvar</div>
          </div>
          <span style={{ fontSize:11, fontWeight:600, color:confiancaColor, background:confiancaColor+"15", border:`1px solid ${confiancaColor}44`, borderRadius:4, padding:"3px 9px" }}>
            Confiança {confianca}
          </span>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:8, marginBottom:14 }}>
          {fields.map(f => {
            const val = String(editableData[f.key] ?? "");
            const faltando = campos_nao_encontrados.includes(f.key);
            return (
              <div key={f.key} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:11, fontWeight:500, color: faltando ? C.amber : C.sub }}>
                  {f.label}{faltando && <span style={{ marginLeft:4, fontSize:10 }}>⚠ não encontrado</span>}
                </label>
                <input value={val} onChange={e=>setEditableData(d=>({...d,[f.key]:e.target.value}))}
                  style={{ background: faltando?"rgba(180,83,9,0.05)":C.surface, border:`1px solid ${faltando?C.amber+"88":C.border}`, borderRadius:5, padding:"7px 10px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none", transition:"border-color 0.12s, box-shadow 0.12s" }}
                  onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 2px ${C.accentSubtle}`; }}
                  onBlur={e=>{ e.target.style.borderColor=faltando?C.amber+"88":C.border; e.target.style.boxShadow="none"; }} />
              </div>
            );
          })}
        </div>

        {tipo==="ata" && Array.isArray(editableData.itens) && editableData.itens.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:600, color:C.sub, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>
              Itens da Ata ({editableData.itens.length})
            </div>
            <div style={{ background:C.overlay, borderRadius:6, border:`1px solid ${C.border}`, overflow:"hidden" }}>
              {editableData.itens.map((it,idx)=>(
                <div key={idx} style={{ display:"flex", gap:10, padding:"8px 12px", borderBottom:idx<editableData.itens.length-1?`1px solid ${C.border}`:"none", flexWrap:"wrap", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:C.accent, fontWeight:700, minWidth:18 }}>{idx+1}.</span>
                  <span style={{ fontSize:13, color:C.text, flex:1, minWidth:120 }}>{it.descricao}</span>
                  <span style={{ fontSize:12, color:C.sub }}>{it.unidade}</span>
                  <span style={{ fontSize:12, color:C.accent2, fontWeight:600 }}>Qtd: {it.quantidade}</span>
                  <span style={{ fontSize:12, color:C.green, fontWeight:600 }}>{it.valor_unitario ? `R$ ${it.valor_unitario}` : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="outline" color={C.sub} size="sm" onClick={()=>{ setExtractionCard(null); setEditableData(null); }}>Cancelar</Btn>
          <Btn color={C.accent} size="sm" onClick={confirmarExtracao} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <Icon name="check" size={13} color="#fff" /> Confirmar e Salvar
          </Btn>
        </div>
      </div>
    );
  };

  const busy = loading || extracting;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"13px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize:14, fontWeight:600, fontFamily:"Inter,system-ui,sans-serif", color:C.text, display:"flex", alignItems:"center", gap:8 }}>
          <Icon name="claude" size={15} color={C.accent} />
          Assistente IA — Lei 14.133/2021
        </div>
        <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>claude-sonnet-4-6 · Suporte a PDF, imagens e extração automática de documentos</div>
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:16, minHeight:300, maxHeight:460, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        {msgs.map((m,i)=><MsgBubble key={i} m={m} />)}
        {busy && (
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ width:28, height:28, borderRadius:6, background:C.accentSubtle, display:"flex", alignItems:"center", justifyContent:"center", color:C.accent }}>
              <Icon name="claude" size={13} strokeWidth={1.6} />
            </div>
            <div style={{ background:C.overlay, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 14px", color:C.sub, fontSize:13 }}>
              {extracting ? "Analisando documento" : "Consultando Lei 14.133/2021"}<span style={{ display:"inline-block", animation:"dots 1.2s steps(3,end) infinite" }}>...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {extractionCard && <ExtractionCard />}

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"11px 14px", display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:600, color:C.sub, textTransform:"uppercase", letterSpacing:"0.06em" }}>Extração Rápida de Documentos (PDF, JPG, PNG)</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input type="file" ref={fileRefDispensa} onChange={handleExtractFile("dispensa")} accept="application/pdf,image/png,image/jpeg,image/jpg" style={{ display:"none" }} />
          <input type="file" ref={fileRefInexigib} onChange={handleExtractFile("inexigibilidade")} accept="application/pdf,image/png,image/jpeg,image/jpg" style={{ display:"none" }} />
          <input type="file" ref={fileRefAta} onChange={handleExtractFile("ata")} accept="application/pdf,image/png,image/jpeg,image/jpg" style={{ display:"none" }} />
          <input type="file" ref={fileRefContrato} onChange={handleExtractFile("contrato")} accept="application/pdf,image/png,image/jpeg,image/jpg" style={{ display:"none" }} />
          <input type="file" ref={fileRefProcesso} onChange={handleExtractFile("processo")} accept="application/pdf,image/png,image/jpeg,image/jpg" style={{ display:"none" }} />
          <Btn onClick={()=>fileRefDispensa.current?.click()} disabled={busy} color="#f59e0b" size="sm" style={{ display:"flex", alignItems:"center", gap:5 }}>
            <Icon name="file" size={12} color="#fff" /> 📄 Extrato de Dispensa
          </Btn>
          <Btn onClick={()=>fileRefInexigib.current?.click()} disabled={busy} color="#C0C0C0" size="sm" style={{ display:"flex", alignItems:"center", gap:5 }}>
            <Icon name="file" size={12} color="#fff" /> 📄 Extrato de Inexigibilidade
          </Btn>
          <Btn onClick={()=>fileRefAta.current?.click()} disabled={busy} color={C.green} size="sm" style={{ display:"flex", alignItems:"center", gap:5 }}>
            <Icon name="file" size={12} color="#fff" /> 📄 Extrato de Ata de RP
          </Btn>
          <Btn onClick={()=>fileRefContrato.current?.click()} disabled={busy} color={C.accent} size="sm" style={{ display:"flex", alignItems:"center", gap:5 }}>
            <Icon name="file" size={12} color="#fff" /> 📄 Extrato de Contrato
          </Btn>
          <Btn onClick={()=>fileRefProcesso.current?.click()} disabled={busy} color={C.accent2} size="sm" style={{ display:"flex", alignItems:"center", gap:5 }}>
            <Icon name="file" size={12} color="#fff" /> 📄 Extrato de Processo Licitatório
          </Btn>
        </div>
        <div style={{ fontSize:11, color:C.tertiary }}>Clique no botão, selecione o documento e a IA extrai e preenche automaticamente.</div>
      </div>

      {msgs.length <= 1 && !extractionCard && (
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
        <div style={{ background:C.card, border:`2px solid ${C.accentBorder}`, borderRadius:8, padding:"10px 14px", display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {attachments.map(att=>(
                <div key={att.id} style={{ display:"flex", alignItems:"center", gap:5, background:C.overlay, border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 10px", fontSize:12 }}>
                  <Icon name={att.type==="application/pdf"?"file":att.type.startsWith("image/")?"image":"file"} size={12} color={att.type==="application/pdf"?C.red:C.accent} />
                  <span style={{ color:C.sub, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{att.name}</span>
                  <button onClick={()=>setAttachments(p=>p.filter(a=>a.id!==att.id))} style={{ background:"none", border:"none", cursor:"pointer", color:C.tertiary, padding:0, display:"flex" }}>
                    <Icon name="close" size={11} />
                  </button>
                </div>
              ))}
            </div>
            <Btn onClick={()=>extractDocument(input, attachments)} disabled={busy} color={C.accent} size="sm" style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
              <Icon name="sparkle" size={13} color="#fff" /> Extrair e Cadastrar
            </Btn>
          </div>
          <div style={{ fontSize:11, color:C.sub }}>Clique em <strong>Extrair e Cadastrar</strong> para a IA ler o documento e preencher os campos automaticamente.</div>
        </div>
      )}

      <div style={{ display:"flex", gap:8 }}>
        <input type="file" ref={fileRef} onChange={handleFile} accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" multiple style={{display:"none"}} />
        <button onClick={()=>fileRef.current?.click()} title="Anexar PDF ou imagem (máx. 20 MB)" style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:7, padding:"0 13px", color:C.sub, cursor:"pointer", display:"flex", alignItems:"center", transition:"all 0.12s", flexShrink:0 }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.accent; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.sub; }}>
          <Icon name="attach" size={16} />
        </button>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); } }}
          placeholder="Pergunte sobre licitações, Lei 14.133, contratos, RP..."
          style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:7, padding:"11px 14px", color:C.text, fontSize:14, fontFamily:"inherit", outline:"none", transition:"border-color 0.14s, box-shadow 0.14s" }}
          onFocus={e=>{ e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentSubtle}`; }}
          onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
        <Btn onClick={send} disabled={busy||(!input.trim()&&!attachments.length)} color={C.accent} style={{ padding:"0 16px", display:"flex", alignItems:"center", gap:5 }}>
          <Icon name="send" size={14} color="#fff" />
        </Btn>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   APP ROOT
══════════════════════════════════════════════════════════════ */
const TABS = [
  { id:"dashboard",      icon:"dashboard",  label:"Dashboard",        short:"Início" },
  { id:"processos",      icon:"processos",  label:"Processos",        short:"Proc." },
  { id:"atas",           icon:"atas",       label:"Ata de RP",        short:"Atas" },
  { id:"contratos",      icon:"contratos",  label:"Contratos",        short:"Contr." },
  { id:"dispensas",      icon:"dispensa",   label:"Dispensas",        short:"Disp." },
  { id:"agentedispensas",icon:"sparkle",    label:"Agente de Dispensas", short:"Agente" },
  { id:"lexcore",        icon:"lexcore",    label:"LexCore",          short:"LexCore" },
  { id:"inexigibilidades",icon:"inexigib",  label:"Inexigibilidade",  short:"Inex." },
  { id:"cotacoes",       icon:"cotacoes",    label:"Cotações",         short:"Cot." },
  { id:"relatorios",     icon:"relatorios",  label:"Relatórios",       short:"Relat." },
  { id:"claude",         icon:"claude",      label:"IA Claude",        short:"IA" },
];

/* ── AUTHED APP — renderizado dentro do AuthProvider ────────── */
function AuthedApp({ signOut, data, setProcessos, setAtas, setContratos, setCotacoes, setDispensas, setInexigibilidades, showToast, toast, isMobile, sideOpen, setSideOpen, tab, setTab, deferredPrompt, installPWA, session }) {
  const { isSuperAdmin, profileLoading, role, prefeitura, municipio, nome } = useAuth();
  const [impersonating, setImpersonating] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("licitagov_impersonate")); } catch { return null; }
  });

  if (profileLoading) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,system-ui,sans-serif" }}>
        <GlobalStyles />
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, color:C.sub }}>
          <div style={{ width:28, height:28, border:`3px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
          <span style={{ fontSize:13 }}>Verificando permissões...</span>
        </div>
      </div>
    );
  }

  if (isSuperAdmin && !impersonating) {
    return (
      <AdminPanel
        signOut={signOut}
        session={session}
        onImpersonate={(pref) => {
          const d = { id: pref.id, nome: pref.prefeitura_nome };
          sessionStorage.setItem("licitagov_impersonate", JSON.stringify(d));
          setImpersonating(d);
        }}
      />
    );
  }

  const { processos, atas, contratos, cotacoes, dispensas, inexigibilidades } = data;
  const curTab = TABS.find(t=>t.id===tab);
  const userEmail = session?.user?.email || "Usuário";

  const stopImpersonating = () => {
    sessionStorage.removeItem("licitagov_impersonate");
    setImpersonating(null);
  };

  return (
    <div style={{ background:C.bg, fontFamily:"Inter,system-ui,sans-serif", color:C.text, height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <GlobalStyles />
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Impersonation banner */}
      {impersonating && (
        <div style={{ background:"#3a3a3a", color:"#E0E0E0", padding:"6px 20px", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <span>Visualizando como: <strong>{impersonating.nome}</strong></span>
          <button onClick={stopImpersonating} style={{ background:"rgba(255,255,255,0.12)", border:"none", color:"#E0E0E0", borderRadius:4, padding:"3px 12px", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:600 }}>
            ✕ Sair
          </button>
        </div>
      )}

      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>
        {/* Mobile overlay */}
        {isMobile && sideOpen && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.50)", zIndex:25, backdropFilter:"blur(2px)", WebkitBackdropFilter:"blur(2px)" }}
            onClick={() => setSideOpen(false)} />
        )}

        {/* Sidebar */}
        {(!isMobile || sideOpen) && (
          <Sidebar
            TABS={TABS}
            tab={tab}
            setTab={setTab}
            setSideOpen={setSideOpen}
            deferredPrompt={deferredPrompt}
            installPWA={installPWA}
            prefeitura={prefeitura}
            municipio={municipio}
          />
        )}

        {/* Main content */}
        <div style={{ marginLeft: isMobile ? 0 : 240, flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
          <Topbar
            isMobile={isMobile}
            curTab={curTab}
            userEmail={userEmail}
            signOut={signOut}
            setSideOpen={setSideOpen}
            deferredPrompt={deferredPrompt}
            installPWA={installPWA}
            role={role}
            prefeitura={prefeitura}
            nome={nome}
            impersonating={impersonating}
          />

          {isMobile && (
            <div style={{ padding:"12px 16px 0", fontSize:16, fontWeight:700, fontFamily:"Inter,system-ui,sans-serif", color:C.text }}>
              {curTab?.label}
            </div>
          )}

          <div style={{ flex:1, overflowY:"auto", padding: isMobile ? "12px 16px" : "24px 28px", paddingBottom: isMobile ? 82 : 24 }}>
            <div style={{ maxWidth:1200 }}>
              {tab==="dashboard"  && <TabDashboard data={data} onViewProcessos={() => setTab("processos")} />}
              {tab==="processos"  && <TabProcessos processos={processos} setProcessos={setProcessos} toast={showToast} />}
              {tab==="atas"       && <TabAtas atas={atas} setAtas={setAtas} toast={showToast} />}
              {tab==="contratos"  && <TabContratos contratos={contratos} setContratos={setContratos} toast={showToast} />}
              {tab==="dispensas"       && <TabContratacaoDireta tipo="Dispensa"       color="#f59e0b" items={dispensas}        setItems={setDispensas}        toast={showToast} />}
              {tab==="agentedispensas" && <TabAgenteDispensas toast={showToast} />}
              {tab==="lexcore" && <TabLexCore toast={showToast} />}
              {tab==="inexigibilidades" && <TabContratacaoDireta tipo="Inexigibilidade" color="#C0C0C0" items={inexigibilidades} setItems={setInexigibilidades} toast={showToast} />}
              {tab==="cotacoes"   && <TabCotacoes cotacoes={cotacoes} setCotacoes={setCotacoes} toast={showToast} />}
              {tab==="relatorios" && <TabRelatorios data={data} />}
              {tab==="claude"     && <TabClaude data={data} setProcessos={setProcessos} setAtas={setAtas} setContratos={setContratos} setDispensas={setDispensas} setInexigibilidades={setInexigibilidades} toast={showToast} />}
            </div>
          </div>
        </div>

        {/* Mobile bottom nav */}
        {isMobile && (
          <div className="no-print" style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:20, background:"#1a1a1a", borderTop:"1px solid #333333", display:"flex", justifyContent:"space-around", alignItems:"center", padding:"5px 0", paddingBottom:"max(5px, env(safe-area-inset-bottom))" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"5px 8px", border:"none", background:"transparent", borderRadius:6, color: tab===t.id ? "#FF7A00" : "#9a9a9a", fontSize:9, fontWeight: tab===t.id ? 700 : 400, cursor:"pointer", fontFamily:"inherit", minWidth:40 }}>
                <Icon name={t.icon} size={18} strokeWidth={tab===t.id ? 2 : 1.6} color="currentColor" />
                {t.short}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [supabaseReady, setSupabaseReady] = useState(isSupabaseReady());
  const [tab, setTab] = useState("dashboard");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sideOpen, setSideOpen] = useState(false);
  const [toast, setToast_] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  useOverlayBack(isMobile && sideOpen, () => setSideOpen(false));
  // Detect recovery link immediately from URL hash — before any async Supabase operations
  const [recoveryMode, setRecoveryMode] = useState(
    () => window.location.hash.includes('type=recovery')
  );

  // Auth bootstrap
  useEffect(() => {
    if (!supabaseReady) { setSession(null); return; }
    const sb = getSupabase();
    if (!sb) { setSession(null); return; }
    // Subscribe BEFORE getSession so PASSWORD_RECOVERY event is never missed
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setSession(s);
      } else if (event === "SIGNED_OUT") {
        setRecoveryMode(false);
        setSession(null);
      } else {
        // SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED — never reset recoveryMode here,
        // because Supabase fires SIGNED_IN right after PASSWORD_RECOVERY for the same session
        setSession(s ?? null);
      }
    });
    // Skip getSession for recovery URLs — the session comes via PASSWORD_RECOVERY event
    if (!window.location.hash.includes('type=recovery')) {
      sb.auth.getSession().then(({ data }) => setSession(data?.session ?? null));
    }
    return () => subscription.unsubscribe();
  }, [supabaseReady]);

  const [appData, setAppData] = useState(SEED);
  const [dataLoading, setDataLoading] = useState(true);
  const { processos, atas, contratos, cotacoes, dispensas, inexigibilidades } = appData;
  // O Supabase gera um objeto `session` novo (mesma referência não é preservada)
  // toda vez que renova o token em segundo plano (TOKEN_REFRESHED), o que acontece
  // sozinho sempre que a aba volta a ficar visível. Sem este guard, o efeito abaixo
  // reexecutava a cada volta de foco, forçando dataLoading=true de novo — isso
  // desmontava o AuthedApp inteiro (tela cheia "Carregando dados...") e fechava/zerava
  // qualquer modal ou formulário aberto (ex.: Configurações Institucionais do Agente
  // de Dispensas). Mesma classe de bug já corrigida em AuthContext.jsx (profileLoading).
  const loadedDataUserIdRef = useRef(null);

  const setProcessos        = useCallback(fn=>setAppData(prev=>({ ...prev, processos:       typeof fn==="function"?fn(prev.processos):fn })), []);
  const setAtas             = useCallback(fn=>setAppData(prev=>({ ...prev, atas:            typeof fn==="function"?fn(prev.atas):fn })), []);
  const setContratos        = useCallback(fn=>setAppData(prev=>({ ...prev, contratos:       typeof fn==="function"?fn(prev.contratos):fn })), []);
  const setCotacoes         = useCallback(fn=>setAppData(prev=>({ ...prev, cotacoes:        typeof fn==="function"?fn(prev.cotacoes):fn })), []);
  const setDispensas        = useCallback(fn=>setAppData(prev=>({ ...prev, dispensas:       typeof fn==="function"?fn(prev.dispensas||[]):fn })), []);
  const setInexigibilidades = useCallback(fn=>setAppData(prev=>({ ...prev, inexigibilidades:typeof fn==="function"?fn(prev.inexigibilidades||[]):fn })), []);

  const showToast = useCallback((msg, type="success") => {
    setToast_({ msg, type });
    setTimeout(()=>setToast_(null), 3500);
  }, []);

  useEffect(() => {
    const userId = session?.user?.id || null;
    if (!userId) { setDataLoading(false); loadedDataUserIdRef.current = null; return; }
    if (loadedDataUserIdRef.current === userId) return; // refresh de token em segundo plano — dados já carregados
    setDataLoading(true);
    loadAllData()
      .then(data => { setAppData(data); setDataLoading(false); loadedDataUserIdRef.current = userId; })
      .catch(err => {
        console.error('[LicitaGov] Erro ao carregar dados:', err);
        showToast('Erro ao carregar dados do servidor: ' + (err.message || 'verifique a conexão'), 'error');
        setDataLoading(false);
      });
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps


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

  const signOut = async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setSession(null);
  };

  // Gates: setup → recovery → login → app
  if (!supabaseReady) {
    return <SetupScreen onReady={()=>setSupabaseReady(true)} />;
  }
  if (recoveryMode) {
    return <SetPasswordScreen onDone={()=>{ setRecoveryMode(false); setSession(null); }} />;
  }
  if (session === undefined) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,system-ui,sans-serif" }}>
        <GlobalStyles />
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, color:C.sub }}>
          <div style={{ width:28, height:28, border:`3px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
          <span style={{ fontSize:13 }}>Carregando...</span>
        </div>
      </div>
    );
  }
  if (!session) {
    return <LoginScreen onLogin={(s)=>setSession(s)} />;
  }

  if (dataLoading) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,system-ui,sans-serif" }}>
        <GlobalStyles />
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, color:C.sub }}>
          <div style={{ width:28, height:28, border:`3px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
          <span style={{ fontSize:13 }}>Carregando dados...</span>
        </div>
      </div>
    );
  }

  const data = { processos, atas, contratos, cotacoes, dispensas, inexigibilidades };

  return (
    <AuthProvider session={session}>
      <AuthedApp
        signOut={signOut}
        data={data}
        setProcessos={setProcessos}
        setAtas={setAtas}
        setContratos={setContratos}
        setCotacoes={setCotacoes}
        setDispensas={setDispensas}
        setInexigibilidades={setInexigibilidades}
        showToast={showToast}
        toast={toast}
        isMobile={isMobile}
        sideOpen={sideOpen}
        setSideOpen={setSideOpen}
        tab={tab}
        setTab={setTab}
        deferredPrompt={deferredPrompt}
        installPWA={installPWA}
        session={session}
      />
    </AuthProvider>
  );
}
