import { useState, useMemo, useCallback, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════
   LICITAGOV — Sistema de Gestão de Licitações Públicas
   Lei 14.133/2021 · Dark Premium · Clériston
═══════════════════════════════════════════════════════════════ */

const C = {
  bg:      "#080b14",
  surface: "#0e1120",
  card:    "#131728",
  border:  "#1e2440",
  accent:  "#4f7cff",
  accent2: "#00d4aa",
  gold:    "#f5a623",
  red:     "#f04e4e",
  green:   "#22c55e",
  amber:   "#f59e0b",
  purple:  "#8b5cf6",
  text:    "#f0f2ff",
  sub:     "#5a6490",
  subL:    "#8892b0",
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

/* ── SEED DATA ─────────────────────────────────────────────── */
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
    { id:"c2", numero:"CT 002/2025", objeto:"Manutenção de veículos", fornecedor:"Auto Center Norte", cnpj:"55.666.777/0001-88", valor:85000, inicio:"2025-01-15", fim:"2025-07-15", status:"A vencer", processo:"—" },
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
        { id:"it1", descricao:"Papel A4 75g/m² — Resma 500fls", unidade:"Resma", qtd:200,
          valores:{ f1:22.50, f2:21.00, f3:23.80 } },
        { id:"it2", descricao:"Papel A4 90g/m² — Resma 500fls", unidade:"Resma", qtd:50,
          valores:{ f1:28.00, f2:26.50, f3:29.00 } },
      ]
    },
  ],
};

/* ── COMPONENTES BASE ──────────────────────────────────────── */

function Badge({ label, color }) {
  const map = {
    "Vigente":"#22c55e","A vencer":"#f59e0b","Encerrado":"#5a6490","Vencido":"#f04e4e",
    "Homologado":"#22c55e","Em andamento":"#4f7cff","Publicado":"#00d4aa",
    "Planejamento":"#f59e0b","Revogado":"#f04e4e","Suspenso":"#8b5cf6",
    "Finalizada":"#22c55e","Em coleta":"#4f7cff","Rascunho":"#5a6490",
  };
  const c = color || map[label] || C.subL;
  return (
    <span style={{
      background:c+"22", color:c, border:`1px solid ${c}44`,
      borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700, letterSpacing:0.3,
    }}>{label}</span>
  );
}

function Btn({ children, onClick, color=C.accent, variant="solid", size="md", disabled=false, style:sx={} }) {
  const [hov,setHov]=useState(false);
  const pad = size==="sm" ? "6px 12px" : size==="lg" ? "12px 28px" : "8px 18px";
  const fs  = size==="sm" ? 12 : size==="lg" ? 15 : 13;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background: variant==="solid" ? (hov?color+"dd":color) : (hov?color+"18":"transparent"),
        color: variant==="solid" ? "#fff" : color,
        border: `1px solid ${color}${variant==="solid"?"":"55"}`,
        borderRadius:10, padding:pad, fontSize:fs, fontWeight:700,
        cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.5:1,
        transition:"all 0.15s", fontFamily:"inherit", ...sx,
      }}>{children}</button>
  );
}

function Input({ label, value, onChange, type="text", placeholder="", required=false, style:sx={} }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5, ...sx }}>
      {label && <label style={{ fontSize:12, color:C.subL, fontWeight:600 }}>{label}{required&&<span style={{color:C.red}}> *</span>}</label>}
      <input value={value} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder}
        style={{
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:9,
          padding:"9px 12px", color:C.text, fontSize:13, fontFamily:"inherit",
          outline:"none",
        }}
        onFocus={e=>e.target.style.borderColor=C.accent}
        onBlur={e=>e.target.style.borderColor=C.border}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, style:sx={} }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5, ...sx }}>
      {label && <label style={{ fontSize:12, color:C.subL, fontWeight:600 }}>{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:9,
          padding:"9px 12px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none",
        }}>
        {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
    </div>
  );
}

function Modal({ title, onClose, children, wide=false }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:100,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:C.card, border:`1px solid ${C.border}`, borderRadius:18,
        padding:24, width:"100%", maxWidth:wide?780:500,
        maxHeight:"90vh", overflowY:"auto",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontSize:17, fontWeight:800, fontFamily:"'Syne',sans-serif", color:C.text }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.sub, fontSize:22, cursor:"pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ msg, type, onClose }) {
  const c = type==="error"?C.red:type==="warn"?C.amber:C.green;
  return (
    <div style={{
      position:"fixed", top:20, right:20, zIndex:200,
      background:c, color:"#fff", borderRadius:12,
      padding:"12px 20px", fontSize:13, fontWeight:700,
      boxShadow:`0 4px 20px ${c}55`, maxWidth:320,
      animation:"slideIn 0.25s ease",
    }}>{msg}</div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 24px", color:C.sub }}>
      <div style={{ fontSize:44, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:15, fontWeight:700, color:C.subL, marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:13 }}>{sub}</div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color=C.accent }) {
  return (
    <div style={{
      background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
      padding:"18px 20px", display:"flex", alignItems:"center", gap:16,
    }}>
      <div style={{
        width:48, height:48, borderRadius:14, background:color+"22",
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize:12, color:C.sub, fontWeight:600, marginBottom:4 }}>{label}</div>
        <div style={{ fontSize:24, fontWeight:800, color:C.text, fontFamily:"'Syne',sans-serif", lineHeight:1 }}>{value}</div>
        {sub && <div style={{ fontSize:11, color:color, marginTop:4, fontWeight:600 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ABA: DASHBOARD
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
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12, marginBottom:24 }}>
        <KpiCard icon="📋" label="Processos Ativos" value={processos.filter(p=>p.fase!=="Encerrado").length} sub={`${processos.length} total`} color={C.accent} />
        <KpiCard icon="📜" label="Atas Vigentes" value={atasVigentes} sub="Registro de Preços" color={C.accent2} />
        <KpiCard icon="📄" label="Contratos Vigentes" value={contratos.filter(c=>c.status==="Vigente").length} sub={fmtBRL(valorContratos)} color={C.green} />
        <KpiCard icon="💰" label="Cotações" value={cotacoes.length} sub="Pesquisas de preço" color={C.gold} />
        <KpiCard icon="⚠️" label="Contratos a Vencer" value={vencendo.length} sub="Próximos 30 dias" color={vencendo.length>0?C.red:C.green} />
      </div>

      {/* Processos recentes */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:800, fontFamily:"'Syne',sans-serif", marginBottom:14 }}>Processos Recentes</div>
        {processos.slice(0,4).map(p=>(
          <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{p.numero} — {p.objeto}</div>
              <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>{p.modalidade} · {p.orgao}</div>
            </div>
            <Badge label={p.fase} />
            <div style={{ fontSize:13, fontWeight:700, color:C.accent, minWidth:90, textAlign:"right" }}>{fmtBRL(p.valor)}</div>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {vencendo.length > 0 && (
        <div style={{ background:C.red+"11", border:`1px solid ${C.red}33`, borderRadius:16, padding:20 }}>
          <div style={{ fontSize:14, fontWeight:800, color:C.red, marginBottom:12 }}>⚠️ Contratos a vencer em 30 dias</div>
          {vencendo.map(c=>(
            <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.red}22` }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>{c.numero} — {c.objeto}</div>
                <div style={{ fontSize:11, color:C.sub }}>{c.fornecedor}</div>
              </div>
              <div style={{ fontSize:12, color:C.red, fontWeight:700 }}>Vence em {diasParaVencer(c.fim)}d · {fmtDate(c.fim)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ABA: PROCESSOS
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
    toast("Processo cadastrado com sucesso!","success");
  };

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar processo..."
          style={{ flex:1, minWidth:200, background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 14px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none" }} />
        <Select value={filtroFase} onChange={setFiltroFase} options={fases} />
        <Btn onClick={()=>setModal(true)}>+ Novo Processo</Btn>
      </div>

      {filtered.length===0 ? <EmptyState icon="📋" title="Nenhum processo encontrado" sub="Cadastre um novo processo para começar" /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(p=>(
            <div key={p.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:800, color:C.accent, fontFamily:"'Syne',sans-serif" }}>{p.numero}</span>
                    <Badge label={p.fase} />
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:4 }}>{p.objeto}</div>
                  <div style={{ fontSize:12, color:C.sub }}>{p.modalidade} · {p.orgao} · Abertura: {fmtDate(p.abertura)}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:18, fontWeight:800, color:C.accent2, fontFamily:"'Syne',sans-serif" }}>{fmtBRL(p.valor)}</div>
                  <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>Valor estimado</div>
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
   ABA: ATA DE REGISTRO DE PREÇOS
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
    toast("Ata registrada com sucesso!","success");
  };

  if (ataAtiva) {
    const ata = atas.find(a=>a.id===ataAtiva);
    const pctUsado = ata ? ((ata.valorTotal - ata.saldoDisponivel)/ata.valorTotal*100).toFixed(1) : 0;
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <Btn variant="outline" onClick={()=>setAtaAtiva(null)} color={C.sub} size="sm">← Voltar</Btn>
          <div>
            <div style={{ fontSize:17, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>{ata?.numero}</div>
            <div style={{ fontSize:12, color:C.sub }}>{ata?.objeto}</div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12, marginBottom:20 }}>
          <KpiCard icon="🏢" label="Fornecedor" value={ata?.fornecedor?.split(" ").slice(0,2).join(" ")} color={C.accent} />
          <KpiCard icon="💰" label="Valor Total" value={fmtBRL(ata?.valorTotal)} color={C.accent2} />
          <KpiCard icon="📊" label="Saldo Disponível" value={fmtBRL(ata?.saldoDisponivel)} sub={`${(100-parseFloat(pctUsado)).toFixed(1)}% disponível`} color={C.green} />
          <KpiCard icon="📅" label="Vigência" value={fmtDate(ata?.vigencia)} sub={`${diasParaVencer(ata?.vigencia)} dias`} color={diasParaVencer(ata?.vigencia)<30?C.red:C.amber} />
        </div>
        {/* Barra de uso */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:700 }}>Utilização da Ata</span>
            <span style={{ fontSize:13, color:C.accent, fontWeight:700 }}>{pctUsado}% utilizado</span>
          </div>
          <div style={{ background:C.border, borderRadius:4, height:8, overflow:"hidden" }}>
            <div style={{ width:`${pctUsado}%`, height:"100%", background:`linear-gradient(90deg,${C.accent},${C.accent2})`, borderRadius:4, transition:"width 0.6s" }} />
          </div>
        </div>
        {/* Itens */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, fontSize:14, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>Itens da Ata</div>
          {(!ata?.itens?.length) ? <EmptyState icon="📦" title="Sem itens cadastrados" sub="" /> : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:C.surface }}>
                  {["Descrição","Unidade","Qtd Reg.","Qtd Util.","Vlr Unit.","Saldo Qtd"].map(h=>(
                    <th key={h} style={{ padding:"10px 14px", fontSize:11, color:C.sub, fontWeight:700, textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ata.itens.map((it,i)=>{
                  const saldo = it.qtdRegistrada - it.qtdUtilizada;
                  const pct = (it.qtdUtilizada/it.qtdRegistrada*100).toFixed(0);
                  return (
                    <tr key={it.id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2?C.surface+"55":"transparent" }}>
                      <td style={{ padding:"12px 14px", fontSize:13, fontWeight:600 }}>{it.descricao}</td>
                      <td style={{ padding:"12px 14px", fontSize:12, color:C.sub }}>{it.unidade}</td>
                      <td style={{ padding:"12px 14px", fontSize:13 }}>{it.qtdRegistrada.toLocaleString("pt-BR")}</td>
                      <td style={{ padding:"12px 14px", fontSize:13, color:C.amber }}>{it.qtdUtilizada.toLocaleString("pt-BR")} <span style={{fontSize:10,color:C.sub}}>({pct}%)</span></td>
                      <td style={{ padding:"12px 14px", fontSize:13, color:C.accent2, fontWeight:700 }}>{fmtBRL(it.valorUnit)}</td>
                      <td style={{ padding:"12px 14px", fontSize:13, color:saldo<it.qtdRegistrada*0.1?C.red:C.green, fontWeight:700 }}>{saldo.toLocaleString("pt-BR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <Btn onClick={()=>setModal(true)}>+ Nova Ata de RP</Btn>
      </div>
      {atas.length===0 ? <EmptyState icon="📜" title="Nenhuma Ata cadastrada" sub="Registre uma Ata de Registro de Preços" /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {atas.map(a=>{
            const d = diasParaVencer(a.vigencia);
            const pct = ((a.valorTotal-a.saldoDisponivel)/a.valorTotal*100).toFixed(0);
            return (
              <div key={a.id} onClick={()=>setAtaAtiva(a.id)}
                style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px", cursor:"pointer", transition:"border-color 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4 }}>
                      <span style={{ fontSize:15, fontWeight:800, color:C.accent2, fontFamily:"'Syne',sans-serif" }}>{a.numero}</span>
                      <Badge label={d>0?"Vigente":d===0?"Vence hoje":"Vencida"} />
                    </div>
                    <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:4 }}>{a.objeto}</div>
                    <div style={{ fontSize:12, color:C.sub }}>{a.fornecedor} · CNPJ {a.cnpj} · Vigência: {fmtDate(a.vigencia)}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:17, fontWeight:800, color:C.green, fontFamily:"'Syne',sans-serif" }}>{fmtBRL(a.saldoDisponivel)}</div>
                    <div style={{ fontSize:11, color:C.sub }}>saldo disponível</div>
                    <div style={{ fontSize:11, color:C.amber, marginTop:2 }}>{pct}% utilizado</div>
                  </div>
                </div>
                <div style={{ marginTop:10, background:C.border, borderRadius:4, height:4, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${C.accent2},${C.accent})` }} />
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
   ABA: CONTRATOS
══════════════════════════════════════════════════════════════ */
function TabContratos({ contratos, setContratos, toast }) {
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [form, setForm] = useState({ numero:"", objeto:"", fornecedor:"", cnpj:"", valor:"", inicio:"", fim:"", processo:"" });

  const statusOptions = ["Todos","Vigente","A vencer","Encerrado","Vencido"];

  const filtered = contratos.filter(c=>{
    const ok = filtro==="Todos" || c.status===filtro;
    const s = search.toLowerCase();
    return ok && (c.numero.toLowerCase().includes(s)||c.objeto.toLowerCase().includes(s)||c.fornecedor.toLowerCase().includes(s));
  }).map(c=>{
    const d = diasParaVencer(c.fim);
    let status = c.status;
    if (d !== null) {
      if (d < 0) status = "Vencido";
      else if (d <= 30) status = "A vencer";
      else if (d > 30 && c.status !== "Encerrado") status = "Vigente";
    }
    return { ...c, status, diasRestantes: d };
  });

  const salvar = () => {
    if (!form.numero||!form.objeto||!form.fornecedor) { toast("Preencha os campos obrigatórios","error"); return; }
    setContratos(prev=>[{ id:uid(), ...form, valor:parseFloat(form.valor)||0, status:"Vigente" }, ...prev]);
    setModal(false);
    setForm({ numero:"", objeto:"", fornecedor:"", cnpj:"", valor:"", inicio:"", fim:"", processo:"" });
    toast("Contrato cadastrado!","success");
  };

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar contrato..."
          style={{ flex:1, minWidth:200, background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 14px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none" }} />
        <Select value={filtro} onChange={setFiltro} options={statusOptions} />
        <Btn onClick={()=>setModal(true)}>+ Novo Contrato</Btn>
      </div>

      {filtered.length===0 ? <EmptyState icon="📄" title="Nenhum contrato encontrado" sub="Cadastre contratos para acompanhar sua vigência" /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(c=>(
            <div key={c.id} style={{ background:C.card, border:`1px solid ${c.status==="A vencer"?C.amber:c.status==="Vencido"?C.red:C.border}`, borderRadius:14, padding:"16px 18px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:800, color:C.accent, fontFamily:"'Syne',sans-serif" }}>{c.numero}</span>
                    <Badge label={c.status} />
                    {c.processo && <span style={{ fontSize:11, color:C.sub }}>Proc. {c.processo}</span>}
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:4 }}>{c.objeto}</div>
                  <div style={{ fontSize:12, color:C.sub }}>{c.fornecedor} · CNPJ {c.cnpj}</div>
                  <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>
                    {fmtDate(c.inicio)} → {fmtDate(c.fim)}
                    {c.diasRestantes !== null && c.status !== "Encerrado" && (
                      <span style={{ marginLeft:8, color:c.status==="A vencer"?C.amber:c.status==="Vencido"?C.red:C.green, fontWeight:700 }}>
                        {c.diasRestantes < 0 ? `Venceu há ${Math.abs(c.diasRestantes)}d` : `${c.diasRestantes}d restantes`}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:18, fontWeight:800, color:C.accent2, fontFamily:"'Syne',sans-serif" }}>{fmtBRL(c.valor)}</div>
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
   ABA: COTAÇÕES DE PREÇOS
══════════════════════════════════════════════════════════════ */
function TabCotacoes({ cotacoes, setCotacoes, toast }) {
  const [modal, setModal] = useState(false); // "nova" | "detalhe" | null
  const [cotAtiva, setCotAtiva] = useState(null);
  const [step, setStep] = useState(1);

  // Formulário nova cotação
  const [form, setForm] = useState({ numero:"", objeto:"", processo:"" });
  const [fornecedores, setFornecedores] = useState([
    { id:"f1", razao:"", cnpj:"" },
    { id:"f2", razao:"", cnpj:"" },
    { id:"f3", razao:"", cnpj:"" },
  ]);
  const [itens, setItens] = useState([
    { id:"it1", descricao:"", unidade:"", qtd:"", valores:{} },
  ]);

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
    const nova = { id:uid(), ...form, status:"Finalizada", dataCriacao:hoje(), fornecedores:fornsValidos, itens:itensValidos };
    setCotacoes(p=>[nova,...p]);
    setModal(null);
    resetForm();
    toast("Cotação finalizada e mapa de preços gerado!","success");
  };

  // ── Detalhe da cotação ──
  if (cotAtiva) {
    const cot = cotacoes.find(c=>c.id===cotAtiva);
    if (!cot) { setCotAtiva(null); return null; }

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <Btn variant="outline" onClick={()=>setCotAtiva(null)} color={C.sub} size="sm">← Voltar</Btn>
          <div>
            <div style={{ fontSize:17, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>{cot.numero}</div>
            <div style={{ fontSize:12, color:C.sub }}>{cot.objeto} · {fmtDate(cot.dataCriacao)}</div>
          </div>
          <div style={{ marginLeft:"auto" }}>
            <Badge label={cot.status} />
          </div>
        </div>

        {/* Fornecedores consultados */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:800, marginBottom:10, fontFamily:"'Syne',sans-serif" }}>Fornecedores Consultados</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {cot.fornecedores.map((f,i)=>(
              <div key={f.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", flex:1, minWidth:150 }}>
                <div style={{ fontSize:11, color:C.accent, fontWeight:700, marginBottom:2 }}>Fornecedor {i+1}</div>
                <div style={{ fontSize:13, fontWeight:700 }}>{f.razao}</div>
                <div style={{ fontSize:11, color:C.sub }}>{f.cnpj}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mapa de Preços */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden", marginBottom:14 }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:14, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>Mapa de Preços</span>
            <span style={{ fontSize:11, color:C.subL }}>Mediana calculada conforme Lei 14.133/2021</span>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
              <thead>
                <tr style={{ background:C.surface }}>
                  <th style={{ padding:"10px 14px", fontSize:11, color:C.sub, fontWeight:700, textAlign:"left" }}>Item</th>
                  <th style={{ padding:"10px 14px", fontSize:11, color:C.sub, fontWeight:700, textAlign:"center" }}>Un.</th>
                  <th style={{ padding:"10px 14px", fontSize:11, color:C.sub, fontWeight:700, textAlign:"center" }}>Qtd</th>
                  {cot.fornecedores.map((f,i)=>(
                    <th key={f.id} style={{ padding:"10px 14px", fontSize:11, color:C.accent, fontWeight:700, textAlign:"right" }}>F{i+1}</th>
                  ))}
                  <th style={{ padding:"10px 14px", fontSize:11, color:C.gold, fontWeight:800, textAlign:"right", background:C.gold+"11" }}>MEDIANA</th>
                  <th style={{ padding:"10px 14px", fontSize:11, color:C.accent2, fontWeight:800, textAlign:"right" }}>TOTAL REF.</th>
                </tr>
              </thead>
              <tbody>
                {cot.itens.map((it,i)=>{
                  const vals = cot.fornecedores.map(f=>it.valores[f.id]||0).filter(v=>v>0);
                  const mediana = calcMediana(vals);
                  const qtd = parseFloat(it.qtd)||0;
                  const totalRef = mediana * qtd;
                  return (
                    <tr key={it.id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2?C.surface+"55":"transparent" }}>
                      <td style={{ padding:"12px 14px", fontSize:13, fontWeight:600, maxWidth:200 }}>{it.descricao}</td>
                      <td style={{ padding:"12px 14px", fontSize:12, color:C.sub, textAlign:"center" }}>{it.unidade}</td>
                      <td style={{ padding:"12px 14px", fontSize:13, textAlign:"center" }}>{qtd.toLocaleString("pt-BR")}</td>
                      {cot.fornecedores.map(f=>{
                        const v = it.valores[f.id]||0;
                        const isMin = v>0 && v===Math.min(...vals);
                        return (
                          <td key={f.id} style={{ padding:"12px 14px", fontSize:13, textAlign:"right", color:isMin?C.green:C.text, fontWeight:isMin?700:400 }}>
                            {v>0?fmtBRL(v):<span style={{color:C.sub}}>—</span>}
                          </td>
                        );
                      })}
                      <td style={{ padding:"12px 14px", fontSize:14, fontWeight:800, color:C.gold, textAlign:"right", background:C.gold+"0a" }}>
                        {fmtBRL(mediana)}
                      </td>
                      <td style={{ padding:"12px 14px", fontSize:13, fontWeight:700, color:C.accent2, textAlign:"right" }}>
                        {fmtBRL(totalRef)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:C.accent+"11", borderTop:`2px solid ${C.accent}44` }}>
                  <td colSpan={3+cot.fornecedores.length} style={{ padding:"12px 14px", fontSize:13, fontWeight:800, color:C.accent }}>
                    VALOR TOTAL DE REFERÊNCIA (soma das medianas × quantidades)
                  </td>
                  <td style={{ padding:"12px 14px", fontSize:15, fontWeight:800, color:C.accent2, textAlign:"right" }}>
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
          <Btn color={C.gold} onClick={()=>toast("Exportação PDF em breve!","warn")}>📄 Exportar Mapa de Preços PDF</Btn>
        </div>
      </div>
    );
  }

  // ── Lista de cotações ──
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <Btn onClick={()=>{ resetForm(); setModal("nova"); }} color={C.gold}>+ Nova Pesquisa de Preços</Btn>
      </div>

      {cotacoes.length===0 ? <EmptyState icon="💰" title="Nenhuma cotação cadastrada" sub="Crie uma pesquisa de preços conforme Lei 14.133/2021" /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {cotacoes.map(c=>(
            <div key={c.id} onClick={()=>setCotAtiva(c.id)}
              style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px", cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                <div>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:800, color:C.gold, fontFamily:"'Syne',sans-serif" }}>{c.numero}</span>
                    <Badge label={c.status} />
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:4 }}>{c.objeto}</div>
                  <div style={{ fontSize:12, color:C.sub }}>
                    {c.fornecedores.length} fornecedores · {c.itens.length} itens · {fmtDate(c.dataCriacao)}
                    {c.processo && ` · Proc. ${c.processo}`}
                  </div>
                </div>
                <div style={{ fontSize:12, color:C.gold, fontWeight:700, alignSelf:"center" }}>Ver mapa →</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Cotação — Wizard 3 steps */}
      {modal==="nova" && (
        <Modal title={`Nova Pesquisa de Preços — Etapa ${step}/3`} onClose={()=>setModal(null)} wide>
          {/* Steps indicator */}
          <div style={{ display:"flex", gap:0, marginBottom:20 }}>
            {["Identificação","Fornecedores","Itens e Preços"].map((s,i)=>(
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{
                  width:28, height:28, borderRadius:14,
                  background:step>i+1?C.green:step===i+1?C.gold:C.border,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, fontWeight:800, color:step>=i+1?"#fff":C.sub,
                  transition:"all 0.2s",
                }}>{step>i+1?"✓":i+1}</div>
                <span style={{ fontSize:10, color:step===i+1?C.gold:C.sub, fontWeight:600 }}>{s}</span>
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
                <Btn onClick={()=>{ if(!form.numero||!form.objeto){toast("Preencha os campos","error");return;} setStep(2); }} color={C.gold}>Próximo →</Btn>
              </div>
            </div>
          )}

          {step===2 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ fontSize:12, color:C.subL, background:C.accent+"11", borderRadius:8, padding:"8px 12px", marginBottom:4 }}>
                ℹ️ Lei 14.133/2021 recomenda no mínimo 3 fornecedores para pesquisa de preços.
              </div>
              {fornecedores.map((f,i)=>(
                <div key={f.id} style={{ background:C.surface, borderRadius:12, padding:12, display:"flex", gap:10, alignItems:"flex-end" }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:C.accent+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:C.accent, flexShrink:0 }}>{i+1}</div>
                  <Input style={{flex:2}} label={i===0?"Razão Social":""} value={f.razao} onChange={v=>updForn(f.id,"razao",v)} placeholder="Razão social / nome" />
                  <Input style={{flex:1}} label={i===0?"CNPJ/CPF":""} value={f.cnpj} onChange={v=>updForn(f.id,"cnpj",v)} placeholder="00.000.000/0001-00" />
                  {fornecedores.length>2 && <Btn variant="outline" color={C.red} size="sm" onClick={()=>remFornecedor(f.id)}>✕</Btn>}
                </div>
              ))}
              <Btn variant="outline" color={C.accent} size="sm" onClick={addFornecedor}>+ Adicionar Fornecedor</Btn>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                <Btn variant="outline" color={C.sub} onClick={()=>setStep(1)}>← Anterior</Btn>
                <Btn onClick={()=>{ const v=fornecedores.filter(f=>f.razao.trim()); if(v.length<2){toast("Mínimo 2 fornecedores","error");return;} setStep(3); }} color={C.gold}>Próximo →</Btn>
              </div>
            </div>
          )}

          {step===3 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {itens.map((it,i)=>(
                <div key={it.id} style={{ background:C.surface, borderRadius:12, padding:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                    <span style={{ fontSize:11, fontWeight:800, color:C.gold, background:C.gold+"22", padding:"2px 8px", borderRadius:6 }}>ITEM {i+1}</span>
                    {itens.length>1 && <Btn variant="outline" color={C.red} size="sm" onClick={()=>remItem(it.id)}>✕</Btn>}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10, marginBottom:10 }}>
                    <Input label="Descrição" value={it.descricao} onChange={v=>updItem(it.id,"descricao",v)} placeholder="Descrição completa do item" />
                    <Input label="Unidade" value={it.unidade} onChange={v=>updItem(it.id,"unidade",v)} placeholder="Un, Kg, L..." />
                    <Input label="Quantidade" value={it.qtd} onChange={v=>updItem(it.id,"qtd",v)} type="number" placeholder="0" />
                  </div>
                  <div style={{ fontSize:11, color:C.subL, marginBottom:6, fontWeight:700 }}>Preços por fornecedor:</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:8 }}>
                    {fornecedores.filter(f=>f.razao.trim()).map((f,fi)=>(
                      <Input key={f.id}
                        label={`F${fi+1}: ${f.razao.split(" ")[0]}`}
                        value={it.valores[f.id]||""}
                        onChange={v=>updValor(it.id,f.id,v)}
                        type="number" placeholder="0,00"
                      />
                    ))}
                  </div>
                  {/* Preview mediana em tempo real */}
                  {(() => {
                    const vals = fornecedores.filter(f=>f.razao.trim()).map(f=>parseFloat(it.valores[f.id])||0).filter(v=>v>0);
                    if (!vals.length) return null;
                    const med = calcMediana(vals);
                    return (
                      <div style={{ marginTop:10, background:C.gold+"11", borderRadius:8, padding:"6px 12px", display:"flex", gap:10 }}>
                        <span style={{ fontSize:12, color:C.gold, fontWeight:700 }}>Mediana: {fmtBRL(med)}</span>
                        {parseFloat(it.qtd)>0 && <span style={{ fontSize:12, color:C.accent2 }}>Total ref: {fmtBRL(med*parseFloat(it.qtd))}</span>}
                      </div>
                    );
                  })()}
                </div>
              ))}
              <Btn variant="outline" color={C.gold} size="sm" onClick={addItem}>+ Adicionar Item</Btn>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                <Btn variant="outline" color={C.sub} onClick={()=>setStep(2)}>← Anterior</Btn>
                <Btn onClick={salvarCotacao} color={C.gold}>✓ Finalizar Pesquisa</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ABA: RELATÓRIOS
══════════════════════════════════════════════════════════════ */
function TabRelatorios({ data }) {
  const { processos, contratos, cotacoes, atas } = data;
  const reports = [
    { icon:"📋", title:"Processos por Modalidade", color:C.accent, desc:"Distribuição e valores por tipo de licitação" },
    { icon:"📄", title:"Contratos a Vencer", color:C.amber, desc:"Contratos nos próximos 30, 60 e 90 dias" },
    { icon:"📜", title:"Saldo de Atas de RP", color:C.accent2, desc:"Utilização e saldo por fornecedor/item" },
    { icon:"💰", title:"Mapa de Preços Consolidado", color:C.gold, desc:"Medianas por categoria de objeto" },
    { icon:"📊", title:"Relatório Gerencial", color:C.purple, desc:"Visão geral de todos os processos e contratos" },
  ];

  const byModalidade = processos.reduce((acc,p)=>{
    acc[p.modalidade]=(acc[p.modalidade]||0)+1; return acc;
  },{});

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12, marginBottom:24 }}>
        {reports.map(r=>(
          <div key={r.title} style={{
            background:C.card, border:`1px solid ${C.border}`, borderRadius:14,
            padding:18, cursor:"pointer", transition:"border-color 0.15s",
          }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=r.color}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{ fontSize:28, marginBottom:10 }}>{r.icon}</div>
            <div style={{ fontSize:14, fontWeight:800, color:r.color, fontFamily:"'Syne',sans-serif", marginBottom:4 }}>{r.title}</div>
            <div style={{ fontSize:12, color:C.sub, marginBottom:12 }}>{r.desc}</div>
            <Btn color={r.color} variant="outline" size="sm">Gerar Relatório</Btn>
          </div>
        ))}
      </div>

      {/* Gráfico por modalidade */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
        <div style={{ fontSize:14, fontWeight:800, fontFamily:"'Syne',sans-serif", marginBottom:16 }}>Processos por Modalidade</div>
        {Object.entries(byModalidade).map(([mod,qtd])=>(
          <div key={mod} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:13, fontWeight:600 }}>{mod}</span>
              <span style={{ fontSize:13, color:C.accent, fontWeight:700 }}>{qtd}</span>
            </div>
            <div style={{ background:C.border, borderRadius:4, height:6, overflow:"hidden" }}>
              <div style={{ width:`${(qtd/processos.length)*100}%`, height:"100%", background:`linear-gradient(90deg,${C.accent},${C.accent2})`, borderRadius:4 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Resumo */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10 }}>
        <KpiCard icon="💼" label="Valor total contratos" value={fmtBRL(contratos.filter(c=>c.status==="Vigente").reduce((a,c)=>a+c.valor,0))} color={C.green} />
        <KpiCard icon="🔖" label="Atas ativas" value={atas.filter(a=>diasParaVencer(a.vigencia)>0).length} color={C.accent2} />
        <KpiCard icon="📝" label="Cotações realizadas" value={cotacoes.length} color={C.gold} />
        <KpiCard icon="⚡" label="Processos ativos" value={processos.filter(p=>!["Revogado","Suspenso"].includes(p.fase)).length} color={C.accent} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ABA: ASSISTENTE IA
══════════════════════════════════════════════════════════════ */
const PROXY_URL = import.meta.env.VITE_ANTHROPIC_PROXY ||
  "https://zigghtvlmftgjlohuhla.supabase.co/functions/v1/anthropic-proxy";

const IA_SYSTEM = `Você é um assistente especializado em licitações públicas e contratações governamentais no Brasil, com foco na Lei 14.133/2021 (Nova Lei de Licitações).
Você auxilia pregoeiros, agentes de contratação e gestores municipais com:
- Interpretação e aplicação da Lei 14.133/2021
- Modalidades licitatórias: pregão eletrônico, concorrência, diálogo competitivo, manifestação de interesse, pré-qualificação, credenciamento, dispensa e inexigibilidade
- Elaboração de editais, termos de referência e projetos básicos
- Gestão de atas de registro de preços
- Contratos administrativos e aditivos
- Pesquisa de preços e estimativas de custo
- Penalidades, recursos e impugnações
- Práticas de compliance e governança em contratações públicas
Responda de forma objetiva, cite artigos da lei quando relevante, e forneça exemplos práticos.`;

const IA_SUGESTOES = [
  "Qual a diferença entre pregão e concorrência na 14.133?",
  "Como fazer uma pesquisa de preços válida?",
  "Quando usar dispensa de licitação?",
  "O que é uma Ata de Registro de Preços?",
];

function TabIA({ toast }) {
  const LS_KEY = "licitagov_anthropic_key";
  const [apiKey,      setApiKey]      = useState(() => localStorage.getItem(LS_KEY) || "");
  const [keyInput,    setKeyInput]    = useState("");
  const [showCfg,     setShowCfg]     = useState(!localStorage.getItem(LS_KEY));
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [image,       setImage]       = useState(null);
  const bottomRef = useRef(null);
  const fileRef   = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const saveKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    localStorage.setItem(LS_KEY, k);
    setApiKey(k);
    setKeyInput("");
    setShowCfg(false);
    toast("Chave API salva no navegador", "success");
  };

  const clearKey = () => {
    localStorage.removeItem(LS_KEY);
    setApiKey("");
    setShowCfg(true);
  };

  const handleFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Apenas imagens são suportadas", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => setImage({ data: reader.result.split(",")[1], mediaType: file.type });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const send = async () => {
    if (!input.trim() && !image) return;
    if (!apiKey) { setShowCfg(true); toast("Configure sua chave API Anthropic primeiro", "warn"); return; }

    const userContent = [];
    if (image) userContent.push({ type:"image", source:{ type:"base64", media_type:image.mediaType, data:image.data } });
    if (input.trim()) userContent.push({ type:"text", text:input.trim() });

    const history = [...messages, { role:"user", content:userContent }];
    setMessages(history);
    setInput("");
    setImage(null);
    setLoading(true);

    try {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: IA_SYSTEM,
          messages: history,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      const text = data.content?.[0]?.text || "";
      setMessages(prev => [...prev, { role:"assistant", content:[{ type:"text", text }] }]);
    } catch (err) {
      toast(`Erro: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 130px)" }}>
      {/* Cabeçalho */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>Assistente IA — Lei 14.133/2021</div>
          <div style={{ fontSize:12, color:C.sub }}>Claude · Especialista em licitações públicas</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {messages.length>0 && (
            <Btn variant="outline" color={C.sub} size="sm" onClick={()=>setMessages([])}>Limpar chat</Btn>
          )}
          <Btn variant="outline" color={apiKey?C.green:C.amber} size="sm" onClick={()=>setShowCfg(v=>!v)}>
            {apiKey ? `Chave ···${apiKey.slice(-4)}` : "Configurar chave"}
          </Btn>
        </div>
      </div>

      {/* Config chave */}
      {showCfg && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:6, color:C.accent }}>Chave API Anthropic</div>
          <div style={{ fontSize:12, color:C.sub, marginBottom:10 }}>
            Obtenha em <span style={{ color:C.accent }}>console.anthropic.com → API Keys</span>.
            Salva apenas no seu navegador — nunca enviada a servidores externos.
          </div>
          {apiKey ? (
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <div style={{ flex:1, background:C.surface, borderRadius:8, padding:"8px 12px", fontSize:13, color:C.green, fontWeight:700 }}>
                ✓ Chave ativa (sk-ant-···{apiKey.slice(-6)})
              </div>
              <Btn variant="outline" color={C.red} size="sm" onClick={clearKey}>Remover</Btn>
              <Btn variant="outline" color={C.sub} size="sm" onClick={()=>setShowCfg(false)}>Fechar</Btn>
            </div>
          ) : (
            <div style={{ display:"flex", gap:10 }}>
              <input type="password" placeholder="sk-ant-api03-..."
                value={keyInput} onChange={e=>setKeyInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&saveKey()}
                style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", fontSize:13, color:C.text, outline:"none", fontFamily:"inherit" }}
              />
              <Btn onClick={saveKey} color={C.accent} size="sm">Salvar</Btn>
            </div>
          )}
        </div>
      )}

      {/* Mensagens */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, paddingRight:4 }}>
        {messages.length===0 && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:20 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:10 }}>⚖️</div>
              <div style={{ fontSize:16, fontWeight:800, fontFamily:"'Syne',sans-serif", color:C.subL, marginBottom:4 }}>Pergunte sobre licitações</div>
              <div style={{ fontSize:12, color:C.sub }}>Especialista em Lei 14.133/2021</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxWidth:560 }}>
              {IA_SUGESTOES.map(s=>(
                <div key={s} onClick={()=>setInput(s)} style={{
                  background:C.card, border:`1px solid ${C.border}`, borderRadius:10,
                  padding:"10px 14px", fontSize:12, color:C.subL, cursor:"pointer", transition:"border-color 0.15s",
                }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
                >{s}</div>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role==="user";
          const textPart = msg.content.find(c=>c.type==="text");
          const imgPart  = msg.content.find(c=>c.type==="image");
          return (
            <div key={i} style={{ display:"flex", justifyContent:isUser?"flex-end":"flex-start" }}>
              <div style={{
                maxWidth:"82%",
                background:isUser ? C.accent+"1a" : C.card,
                border:`1px solid ${isUser ? C.accent+"44" : C.border}`,
                borderRadius:isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding:"12px 16px",
              }}>
                {!isUser && <div style={{ fontSize:11, color:C.accent, fontWeight:700, marginBottom:6, letterSpacing:0.5 }}>ASSISTENTE IA</div>}
                {imgPart && (
                  <img src={`data:${imgPart.source.media_type};base64,${imgPart.source.data}`}
                    alt="anexo" style={{ maxWidth:"100%", borderRadius:8, marginBottom:textPart?8:0 }} />
                )}
                {textPart && (
                  <div style={{ fontSize:13, lineHeight:1.75, whiteSpace:"pre-wrap", color:C.text }}>
                    {textPart.text}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display:"flex", justifyContent:"flex-start" }}>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px 16px 16px 4px", padding:"12px 16px" }}>
              <div style={{ fontSize:11, color:C.accent, fontWeight:700, marginBottom:8, letterSpacing:0.5 }}>ASSISTENTE IA</div>
              <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                {[0,1,2].map(j=>(
                  <div key={j} style={{
                    width:7, height:7, borderRadius:"50%", background:C.accent,
                    animation:`iaDot 1.2s ${j*0.4}s ease-in-out infinite`,
                  }}/>
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:12, marginTop:12 }}>
        {image && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, padding:"6px 10px", background:C.accent+"11", borderRadius:8 }}>
            <span style={{ fontSize:12, color:C.accent, fontWeight:600 }}>📎 Imagem anexada</span>
            <button onClick={()=>setImage(null)} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:14, lineHeight:1, marginLeft:"auto" }}>✕</button>
          </div>
        )}
        <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); } }}
            placeholder="Pergunte sobre licitações, Lei 14.133/2021, contratos... (Enter para enviar, Shift+Enter nova linha)"
            rows={2}
            style={{
              flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
              padding:"10px 12px", fontSize:13, color:C.text, resize:"none", outline:"none",
              fontFamily:"inherit", lineHeight:1.6,
            }}
          />
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFile}/>
          <Btn variant="outline" color={C.sub} size="sm" onClick={()=>fileRef.current?.click()} style={{ alignSelf:"center", padding:"7px 10px" }}>📎</Btn>
          <Btn onClick={send} disabled={loading||(!input.trim()&&!image)} color={C.accent} size="sm" style={{ alignSelf:"center" }}>
            {loading ? "···" : "Enviar"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   APP ROOT
══════════════════════════════════════════════════════════════ */
export default function LicitaGov() {
  const [tab, setTab] = useState("dashboard");
  const [processos, setProcessos] = useState(SEED.processos);
  const [atas, setAtas] = useState(SEED.atas);
  const [contratos, setContratos] = useState(SEED.contratos);
  const [cotacoes, setCotacoes] = useState(SEED.cotacoes);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const TABS = [
    { id:"dashboard", icon:"🏛️", label:"Dashboard" },
    { id:"processos", icon:"📋", label:"Processos" },
    { id:"atas",      icon:"📜", label:"Ata de RP" },
    { id:"contratos", icon:"📄", label:"Contratos" },
    { id:"cotacoes",  icon:"💰", label:"Cotações" },
    { id:"relatorios",icon:"📊", label:"Relatórios" },
    { id:"ia",        icon:"🤖", label:"IA" },
  ];

  const data = { processos, atas, contratos, cotacoes };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans',sans-serif", color:C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;} ::-webkit-scrollbar{width:6px;} ::-webkit-scrollbar-track{background:#0e1120;} ::-webkit-scrollbar-thumb{background:#1e2440;border-radius:3px;}
        button,input,select{font-family:inherit;} input::placeholder{color:#3a4060;}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
        @keyframes iaDot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      {/* ── SIDEBAR ── */}
      <div style={{
        position:"fixed", left:0, top:0, bottom:0, width:220,
        background:C.surface, borderRight:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column", zIndex:10,
      }}>
        {/* Logo */}
        <div style={{ padding:"24px 20px 20px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:40, height:40, borderRadius:12,
              background:`linear-gradient(135deg,${C.accent},${C.accent2})`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
            }}>⚖️</div>
            <div>
              <div style={{ fontSize:17, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>
                <span style={{ color:C.accent }}>Licita</span>
                <span style={{ color:C.accent2 }}>Gov</span>
              </div>
              <div style={{ fontSize:10, color:C.sub, fontWeight:600 }}>Lei 14.133/2021</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"12px 10px", display:"flex", flexDirection:"column", gap:2 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"10px 12px", borderRadius:10, border:"none",
              background:tab===t.id?C.accent+"22":"transparent",
              borderLeft:tab===t.id?`3px solid ${C.accent}`:"3px solid transparent",
              color:tab===t.id?C.accent:C.subL,
              fontSize:13, fontWeight:tab===t.id?700:500,
              cursor:"pointer", transition:"all 0.15s", textAlign:"left",
            }}>
              <span style={{ fontSize:16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding:"16px 20px", borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, color:C.sub, lineHeight:1.5 }}>
            <div style={{ fontWeight:700, color:C.subL, marginBottom:2 }}>Prefeitura Municipal</div>
            Módulo de Licitações
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ marginLeft:220, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
        {/* Topbar */}
        <div style={{
          background:C.surface, borderBottom:`1px solid ${C.border}`,
          padding:"16px 28px", display:"flex", justifyContent:"space-between", alignItems:"center",
          position:"sticky", top:0, zIndex:9,
        }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>
              {TABS.find(t=>t.id===tab)?.icon} {TABS.find(t=>t.id===tab)?.label}
            </div>
            <div style={{ fontSize:12, color:C.sub, marginTop:1 }}>
              {new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              background:C.card, border:`1px solid ${C.border}`, borderRadius:10,
              padding:"8px 14px", fontSize:12, color:C.subL, fontWeight:600,
            }}>
              👤 Pregoeiro Municipal
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, padding:28, maxWidth:1200 }}>
          {tab==="dashboard"  && <TabDashboard data={data} />}
          {tab==="processos"  && <TabProcessos processos={processos} setProcessos={setProcessos} toast={showToast} />}
          {tab==="atas"       && <TabAtas atas={atas} setAtas={setAtas} toast={showToast} />}
          {tab==="contratos"  && <TabContratos contratos={contratos} setContratos={setContratos} toast={showToast} />}
          {tab==="cotacoes"   && <TabCotacoes cotacoes={cotacoes} setCotacoes={setCotacoes} toast={showToast} />}
          {tab==="relatorios" && <TabRelatorios data={data} />}
          {tab==="ia"         && <TabIA toast={showToast} />}
        </div>
      </div>
    </div>
  );
}
