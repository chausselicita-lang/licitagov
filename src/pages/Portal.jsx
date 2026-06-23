import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// Cliente isolado — sem persistSession para garantir role anon no portal público
const portalClient = createClient(
  "https://xqlrfsrjvqmucchzpapk.supabase.co",
  "sb_publishable_4t3DTecH3GAtG6t-Q2UZ3w_Mwuyemgc",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const C = {
  bg:"#f0f2f5", surface:"#fff", border:"#e4e8ef", borderStrong:"#cbd5e1",
  accent:"#1d4ed8", accentSubtle:"#eff6ff",
  text:"#111827", sub:"#6b7280",
  red:"#b91c1c", green:"#15803d", gold:"#d97706", purple:"#7c3aed",
};
const fmtBRL  = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
const fmtDate = d => d ? new Date(d+"T00:00:00").toLocaleDateString("pt-BR") : "—";
const hoje    = () => new Date().toISOString().slice(0,10);

const BADGE_MAP = {
  "Publicado":    {bg:"#eff6ff",fg:"#1d4ed8"},
  "Homologado":   {bg:"#f0fdf4",fg:"#15803d"},
  "Planejamento": {bg:"#fffbeb",fg:"#b45309"},
  "Revogado":     {bg:"#fef2f2",fg:"#b91c1c"},
  "Suspenso":     {bg:"#fffbeb",fg:"#b45309"},
  "Vigente":      {bg:"#f0fdf4",fg:"#15803d"},
  "A vencer":     {bg:"#fffbeb",fg:"#b45309"},
  "Encerrado":    {bg:"#f3f4f6",fg:"#6b7280"},
  "Vencido":      {bg:"#fef2f2",fg:"#b91c1c"},
  "Em andamento": {bg:"#eff6ff",fg:"#1d4ed8"},
  "Concluída":    {bg:"#f0fdf4",fg:"#15803d"},
  "Cancelada":    {bg:"#fef2f2",fg:"#b91c1c"},
  "Finalizada":   {bg:"#f0fdf4",fg:"#15803d"},
  "Em coleta":    {bg:"#eff6ff",fg:"#1d4ed8"},
};

function Badge({ label }) {
  const s = BADGE_MAP[label] || {bg:"#f3f4f6",fg:"#6b7280"};
  return (
    <span style={{background:s.bg,color:s.fg,borderRadius:999,padding:"3px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:4}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:"currentColor"}}/>
      {label||"—"}
    </span>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.42)",backdropFilter:"blur(3px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,border:`1px solid ${C.borderStrong}`,borderRadius:14,padding:"28px 32px",width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,0.22)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            {subtitle&&<div style={{fontSize:11,color:C.sub,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>{subtitle}</div>}
            <div style={{fontSize:18,fontWeight:700,color:C.text,lineHeight:1.3}}>{title}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.sub,fontSize:22,lineHeight:1,padding:"2px 6px",borderRadius:4,marginLeft:12}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:13}}>{children}</div>
        <div style={{marginTop:22,textAlign:"center"}}>
          <button onClick={onClose} style={{background:C.accent,color:"#fff",border:"none",borderRadius:8,padding:"9px 28px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

function MRow({ label, value }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:2,borderBottom:`1px solid ${C.border}`,paddingBottom:10}}>
      <span style={{fontSize:11,color:C.sub,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</span>
      <span style={{fontSize:14,color:C.text}}>{value||"—"}</span>
    </div>
  );
}

function FilterBar({ busca, setBusca, filtro, setFiltro, opcoes, placeholder="Buscar..." }) {
  return (
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
      <div style={{flex:1,minWidth:200,position:"relative"}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder={placeholder}
          style={{width:"100%",padding:"8px 12px 8px 30px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",background:C.surface,color:C.text,boxSizing:"border-box"}}/>
      </div>
      {opcoes&&(
        <select value={filtro} onChange={e=>setFiltro(e.target.value)}
          style={{padding:"8px 12px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",background:C.surface,color:C.text,minWidth:160}}>
          {opcoes.map(o=><option key={o}>{o}</option>)}
        </select>
      )}
    </div>
  );
}

function Count({ total, filtrado }) {
  return <div style={{fontSize:12,color:C.sub,marginBottom:10}}>{filtrado===total?`${total} registro${total!==1?"s":""}`:`${filtrado} de ${total} registros`}</div>;
}

function Tabela({ cols, rows, onRow }) {
  if (!rows.length) return (
    <div style={{textAlign:"center",padding:"48px 24px",color:C.sub,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10}}>
      <div style={{fontSize:32,marginBottom:10,opacity:0.25}}>📋</div>
      <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>Nenhum registro encontrado</div>
      <div style={{fontSize:13}}>Tente ajustar os filtros de busca.</div>
    </div>
  );
  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"#f8fafc"}}>
              {cols.map(c=><th key={c.label} style={{padding:"11px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={r.id||i} onClick={()=>onRow&&onRow(r)}
                style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":"#fafbfc",cursor:onRow?"pointer":"default",transition:"background 0.1s"}}
                onMouseEnter={e=>{if(onRow)e.currentTarget.style.background=C.accentSubtle}}
                onMouseLeave={e=>{e.currentTarget.style.background=i%2===0?"#fff":"#fafbfc"}}>
                {cols.map(c=><td key={c.label} style={{padding:"12px 14px",...(c.style||{})}}>{c.render(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileCards({ rows, render, onRow }) {
  if (!rows.length) return (
    <div style={{textAlign:"center",padding:"40px 24px",color:C.sub,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10}}>
      <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>Nenhum registro encontrado</div>
    </div>
  );
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {rows.map((r,i)=>(
        <div key={r.id||i} onClick={()=>onRow&&onRow(r)}
          style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",cursor:onRow?"pointer":"default"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.09)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
          {render(r)}
        </div>
      ))}
    </div>
  );
}

/* ── Dashboard ───────────────────────────────────────────────── */
function TabDashboard({ data }) {
  const { processos, dispensas, inexigibilidades, atas, contratos } = data;
  const hj = hoje();
  const atasVig  = atas.filter(a=>a.vigencia&&a.vigencia>=hj).length;
  const contVig  = contratos.filter(c=>c.status==="Vigente"||(c.fim&&c.fim>=hj)).length;
  const total    = [...processos.map(p=>p.valor||0),...dispensas.map(d=>d.valor_total||0),...inexigibilidades.map(i=>i.valor_total||0),...contratos.map(c=>c.valor||0),...atas.map(a=>a.valor_total||0)].reduce((s,v)=>s+Number(v),0);

  const kpis=[
    {label:"Processos Licitatórios", value:processos.length,       color:C.accent,  icon:"📋"},
    {label:"Dispensas (Art. 75)",    value:dispensas.length,       color:"#f59e0b", icon:"⚡"},
    {label:"Inexigibilidades",       value:inexigibilidades.length, color:C.purple,  icon:"🛡️"},
    {label:"Atas de RP Vigentes",    value:atasVig,                color:C.green,   icon:"📑"},
    {label:"Contratos Vigentes",     value:contVig,                color:"#0891b2", icon:"📃"},
    {label:"Valor Total Empenhado",  value:fmtBRL(total),          color:C.red,     icon:"💰", wide:true},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{fontSize:13,color:C.sub}}>Dados públicos em tempo real conforme Lei 14.133/2021.</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14}}>
        {kpis.map(k=>(
          <div key={k.label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"18px 20px",display:"flex",flexDirection:"column",gap:8,gridColumn:k.wide?"span 2":"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:C.sub,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",lineHeight:1.4}}>{k.label}</span>
              <span style={{fontSize:22}}>{k.icon}</span>
            </div>
            <div style={{fontSize:k.wide?18:28,fontWeight:800,color:C.text,lineHeight:1}}>{k.value}</div>
            <div style={{height:3,background:`${k.color}22`,borderRadius:2}}>
              <div style={{height:"100%",background:k.color,borderRadius:2,width:"60%"}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Processos ───────────────────────────────────────────────── */
function TabProcessos({ processos, isMobile }) {
  const [busca,setBusca]=useState(""); const [filtro,setFiltro]=useState("Todas"); const [modal,setModal]=useState(null);
  const rows=useMemo(()=>processos.filter(p=>{
    const q=busca.toLowerCase();
    return(!q||(p.numero||"").toLowerCase().includes(q)||(p.objeto||"").toLowerCase().includes(q))&&(filtro==="Todas"||p.fase===filtro);
  }),[processos,busca,filtro]);
  const FASES=["Todas","Planejamento","Publicado","Homologado","Revogado","Suspenso"];
  const cols=[
    {label:"Número",    render:r=><span style={{fontWeight:600,color:C.accent,whiteSpace:"nowrap"}}>{r.numero||"—"}</span>},
    {label:"Objeto",    render:r=><div style={{maxWidth:280,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.objeto||"—"}</div>},
    {label:"Modalidade",render:r=><span style={{color:C.sub,whiteSpace:"nowrap"}}>{r.modalidade||"—"}</span>},
    {label:"Fase",      render:r=><Badge label={r.fase}/>},
    {label:"Valor",     render:r=><span style={{whiteSpace:"nowrap"}}>{r.valor?fmtBRL(r.valor):"—"}</span>},
    {label:"Abertura",  render:r=><span style={{color:C.sub,whiteSpace:"nowrap"}}>{fmtDate(r.abertura)}</span>},
  ];
  return (
    <div>
      {modal&&<Modal title={modal.numero||"Processo"} subtitle="Processo Licitatório" onClose={()=>setModal(null)}>
        <MRow label="Objeto"     value={modal.objeto}/><MRow label="Modalidade" value={modal.modalidade}/>
        <MRow label="Fase"       value={<Badge label={modal.fase}/>}/><MRow label="Valor" value={modal.valor?fmtBRL(modal.valor):null}/>
        <MRow label="Abertura"   value={fmtDate(modal.abertura)}/><MRow label="Órgão" value={modal.orgao}/>
      </Modal>}
      <FilterBar busca={busca} setBusca={setBusca} filtro={filtro} setFiltro={setFiltro} opcoes={FASES} placeholder="Buscar por número ou objeto..."/>
      <Count total={processos.length} filtrado={rows.length}/>
      {isMobile
        ?<MobileCards rows={rows} onRow={setModal} render={r=><>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontWeight:700,color:C.accent,fontSize:12}}>{r.numero||"—"}</span><Badge label={r.fase}/></div>
            <div style={{fontSize:13,fontWeight:500,marginBottom:3}}>{r.objeto||"—"}</div>
            <div style={{fontSize:12,color:C.sub}}>{r.modalidade||"—"} · {r.valor?fmtBRL(r.valor):"—"}</div>
          </>}/>
        :<Tabela cols={cols} rows={rows} onRow={setModal}/>}
    </div>
  );
}

/* ── Dispensas ───────────────────────────────────────────────── */
function TabDispensas({ dispensas, isMobile }) {
  const [busca,setBusca]=useState(""); const [filtro,setFiltro]=useState("Todos"); const [modal,setModal]=useState(null);
  const rows=useMemo(()=>dispensas.filter(d=>{
    const q=busca.toLowerCase();
    return(!q||(d.numero_processo||"").toLowerCase().includes(q)||(d.objeto||"").toLowerCase().includes(q)||(d.contratada||"").toLowerCase().includes(q))&&(filtro==="Todos"||d.status===filtro);
  }),[dispensas,busca,filtro]);
  const STATUS=["Todos","Em andamento","Concluída","Cancelada"];
  const cols=[
    {label:"Número",    render:r=><span style={{fontWeight:600,color:C.accent,whiteSpace:"nowrap"}}>{r.numero_processo||"—"}</span>},
    {label:"Objeto",    render:r=><div style={{maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.objeto||"—"}</div>},
    {label:"Contratada",render:r=><span>{r.contratada||"—"}</span>},
    {label:"CNPJ",      render:r=><span style={{color:C.sub,fontSize:12,whiteSpace:"nowrap"}}>{r.cnpj||"—"}</span>},
    {label:"Valor",     render:r=><span style={{whiteSpace:"nowrap"}}>{r.valor_total?fmtBRL(r.valor_total):"—"}</span>},
    {label:"Data",      render:r=><span style={{color:C.sub,whiteSpace:"nowrap"}}>{fmtDate(r.data_ratificacao)}</span>},
    {label:"Status",    render:r=><Badge label={r.status}/>},
  ];
  return (
    <div>
      {modal&&<Modal title={modal.numero_processo||"Dispensa"} subtitle="Dispensa — Art. 75" onClose={()=>setModal(null)}>
        <MRow label="Objeto" value={modal.objeto}/><MRow label="Contratada" value={modal.contratada}/>
        <MRow label="CNPJ" value={modal.cnpj}/><MRow label="Valor Total" value={modal.valor_total?fmtBRL(modal.valor_total):null}/>
        <MRow label="Data Ratificação" value={fmtDate(modal.data_ratificacao)}/><MRow label="Vigência" value={fmtDate(modal.vigencia)}/>
        <MRow label="Secretaria" value={modal.secretaria}/><MRow label="Status" value={<Badge label={modal.status}/>}/>
      </Modal>}
      <FilterBar busca={busca} setBusca={setBusca} filtro={filtro} setFiltro={setFiltro} opcoes={STATUS} placeholder="Buscar por número, objeto ou contratada..."/>
      <Count total={dispensas.length} filtrado={rows.length}/>
      {isMobile
        ?<MobileCards rows={rows} onRow={setModal} render={r=><>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontWeight:700,color:C.accent,fontSize:12}}>{r.numero_processo||"—"}</span><Badge label={r.status}/></div>
            <div style={{fontSize:13,fontWeight:500,marginBottom:3}}>{r.objeto||"—"}</div>
            <div style={{fontSize:12,color:C.sub}}>{r.contratada||"—"} · {r.valor_total?fmtBRL(r.valor_total):"—"}</div>
          </>}/>
        :<Tabela cols={cols} rows={rows} onRow={setModal}/>}
    </div>
  );
}

/* ── Inexigibilidades ────────────────────────────────────────── */
function TabInexig({ inexigibilidades, isMobile }) {
  const [busca,setBusca]=useState(""); const [filtro,setFiltro]=useState("Todos"); const [modal,setModal]=useState(null);
  const rows=useMemo(()=>inexigibilidades.filter(d=>{
    const q=busca.toLowerCase();
    return(!q||(d.numero_processo||"").toLowerCase().includes(q)||(d.objeto||"").toLowerCase().includes(q)||(d.contratada||"").toLowerCase().includes(q))&&(filtro==="Todos"||d.status===filtro);
  }),[inexigibilidades,busca,filtro]);
  const STATUS=["Todos","Em andamento","Concluída","Cancelada"];
  const cols=[
    {label:"Número",    render:r=><span style={{fontWeight:600,color:C.accent,whiteSpace:"nowrap"}}>{r.numero_processo||"—"}</span>},
    {label:"Objeto",    render:r=><div style={{maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.objeto||"—"}</div>},
    {label:"Contratada",render:r=><span>{r.contratada||"—"}</span>},
    {label:"CNPJ",      render:r=><span style={{color:C.sub,fontSize:12,whiteSpace:"nowrap"}}>{r.cnpj||"—"}</span>},
    {label:"Valor",     render:r=><span style={{whiteSpace:"nowrap"}}>{r.valor_total?fmtBRL(r.valor_total):"—"}</span>},
    {label:"Data",      render:r=><span style={{color:C.sub,whiteSpace:"nowrap"}}>{fmtDate(r.data_ratificacao)}</span>},
    {label:"Status",    render:r=><Badge label={r.status}/>},
  ];
  return (
    <div>
      {modal&&<Modal title={modal.numero_processo||"Inexigibilidade"} subtitle="Inexigibilidade — Art. 74" onClose={()=>setModal(null)}>
        <MRow label="Objeto" value={modal.objeto}/><MRow label="Contratada" value={modal.contratada}/>
        <MRow label="CNPJ" value={modal.cnpj}/><MRow label="Valor Total" value={modal.valor_total?fmtBRL(modal.valor_total):null}/>
        <MRow label="Data Ratificação" value={fmtDate(modal.data_ratificacao)}/><MRow label="Vigência" value={fmtDate(modal.vigencia)}/>
        <MRow label="Secretaria" value={modal.secretaria}/><MRow label="Status" value={<Badge label={modal.status}/>}/>
      </Modal>}
      <FilterBar busca={busca} setBusca={setBusca} filtro={filtro} setFiltro={setFiltro} opcoes={STATUS} placeholder="Buscar por número, objeto ou contratada..."/>
      <Count total={inexigibilidades.length} filtrado={rows.length}/>
      {isMobile
        ?<MobileCards rows={rows} onRow={setModal} render={r=><>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontWeight:700,color:C.accent,fontSize:12}}>{r.numero_processo||"—"}</span><Badge label={r.status}/></div>
            <div style={{fontSize:13,fontWeight:500,marginBottom:3}}>{r.objeto||"—"}</div>
            <div style={{fontSize:12,color:C.sub}}>{r.contratada||"—"} · {r.valor_total?fmtBRL(r.valor_total):"—"}</div>
          </>}/>
        :<Tabela cols={cols} rows={rows} onRow={setModal}/>}
    </div>
  );
}

/* ── Atas de RP ──────────────────────────────────────────────── */
function TabAtas({ atas, isMobile }) {
  const [busca,setBusca]=useState(""); const [modal,setModal]=useState(null);
  const hj=hoje();
  const rows=useMemo(()=>atas.filter(a=>{
    const q=busca.toLowerCase();
    return !q||(a.numero||"").toLowerCase().includes(q)||(a.objeto||"").toLowerCase().includes(q)||(a.fornecedor||"").toLowerCase().includes(q);
  }),[atas,busca]);
  const vigEl=a=>a.vigencia?<span style={{color:a.vigencia>=hj?C.green:C.red,fontWeight:500}}>{fmtDate(a.vigencia)}</span>:<span style={{color:C.sub}}>—</span>;
  const cols=[
    {label:"Número",    render:r=><span style={{fontWeight:600,color:C.accent,whiteSpace:"nowrap"}}>{r.numero||"—"}</span>},
    {label:"Objeto",    render:r=><div style={{maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.objeto||"—"}</div>},
    {label:"Fornecedor",render:r=><span>{r.fornecedor||"—"}</span>},
    {label:"Valor Total",render:r=><span style={{whiteSpace:"nowrap"}}>{r.valor_total?fmtBRL(r.valor_total):"—"}</span>},
    {label:"Saldo",     render:r=><span style={{color:C.green,whiteSpace:"nowrap"}}>{r.saldo_disponivel?fmtBRL(r.saldo_disponivel):"—"}</span>},
    {label:"Vigência",  render:vigEl},
  ];
  return (
    <div>
      {modal&&<Modal title={modal.numero||"Ata de RP"} subtitle="Ata de Registro de Preços" onClose={()=>setModal(null)}>
        <MRow label="Objeto" value={modal.objeto}/><MRow label="Fornecedor" value={modal.fornecedor}/>
        <MRow label="CNPJ" value={modal.cnpj}/><MRow label="Valor Total" value={modal.valor_total?fmtBRL(modal.valor_total):null}/>
        <MRow label="Saldo Disponível" value={modal.saldo_disponivel?fmtBRL(modal.saldo_disponivel):null}/>
        <MRow label="Assinatura" value={fmtDate(modal.data_assinatura)}/><MRow label="Vigência" value={fmtDate(modal.vigencia)}/>
        <MRow label="N° Processo" value={modal.numero_processo}/>
      </Modal>}
      <FilterBar busca={busca} setBusca={setBusca} placeholder="Buscar por número, objeto ou fornecedor..."/>
      <Count total={atas.length} filtrado={rows.length}/>
      {isMobile
        ?<MobileCards rows={rows} onRow={setModal} render={r=><>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontWeight:700,color:C.accent,fontSize:12}}>{r.numero||"—"}</span>
              <span style={{fontSize:12,color:r.vigencia&&r.vigencia>=hj?C.green:C.red,fontWeight:500}}>{fmtDate(r.vigencia)}</span>
            </div>
            <div style={{fontSize:13,fontWeight:500,marginBottom:3}}>{r.objeto||"—"}</div>
            <div style={{fontSize:12,color:C.sub}}>{r.fornecedor||"—"} · {r.valor_total?fmtBRL(r.valor_total):"—"}</div>
          </>}/>
        :<Tabela cols={cols} rows={rows} onRow={setModal}/>}
    </div>
  );
}

/* ── Contratos ───────────────────────────────────────────────── */
function TabContratos({ contratos, isMobile }) {
  const [busca,setBusca]=useState(""); const [filtro,setFiltro]=useState("Todos"); const [modal,setModal]=useState(null);
  const rows=useMemo(()=>contratos.filter(c=>{
    const q=busca.toLowerCase();
    return(!q||(c.numero||"").toLowerCase().includes(q)||(c.objeto||"").toLowerCase().includes(q)||(c.fornecedor||"").toLowerCase().includes(q))&&(filtro==="Todos"||c.status===filtro);
  }),[contratos,busca,filtro]);
  const STATUS=["Todos","Vigente","A vencer","Encerrado","Vencido"];
  const cols=[
    {label:"Número",   render:r=><span style={{fontWeight:600,color:C.accent,whiteSpace:"nowrap"}}>{r.numero||"—"}</span>},
    {label:"Objeto",   render:r=><div style={{maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.objeto||"—"}</div>},
    {label:"Contratada",render:r=><span>{r.fornecedor||"—"}</span>},
    {label:"Valor",    render:r=><span style={{whiteSpace:"nowrap"}}>{r.valor?fmtBRL(r.valor):"—"}</span>},
    {label:"Início",   render:r=><span style={{color:C.sub,whiteSpace:"nowrap"}}>{fmtDate(r.inicio)}</span>},
    {label:"Fim",      render:r=><span style={{color:C.sub,whiteSpace:"nowrap"}}>{fmtDate(r.fim)}</span>},
    {label:"Status",   render:r=><Badge label={r.status}/>},
  ];
  return (
    <div>
      {modal&&<Modal title={modal.numero||"Contrato"} subtitle="Contrato" onClose={()=>setModal(null)}>
        <MRow label="Objeto" value={modal.objeto}/><MRow label="Contratada" value={modal.fornecedor}/>
        <MRow label="CNPJ" value={modal.cnpj}/><MRow label="Valor" value={modal.valor?fmtBRL(modal.valor):null}/>
        <MRow label="Início" value={fmtDate(modal.inicio)}/><MRow label="Fim" value={fmtDate(modal.fim)}/>
        <MRow label="Status" value={<Badge label={modal.status}/>}/><MRow label="N° Processo" value={modal.processo}/>
      </Modal>}
      <FilterBar busca={busca} setBusca={setBusca} filtro={filtro} setFiltro={setFiltro} opcoes={STATUS} placeholder="Buscar por número, objeto ou contratada..."/>
      <Count total={contratos.length} filtrado={rows.length}/>
      {isMobile
        ?<MobileCards rows={rows} onRow={setModal} render={r=><>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontWeight:700,color:C.accent,fontSize:12}}>{r.numero||"—"}</span><Badge label={r.status}/></div>
            <div style={{fontSize:13,fontWeight:500,marginBottom:3}}>{r.objeto||"—"}</div>
            <div style={{fontSize:12,color:C.sub}}>{r.fornecedor||"—"} · {r.valor?fmtBRL(r.valor):"—"}</div>
          </>}/>
        :<Tabela cols={cols} rows={rows} onRow={setModal}/>}
    </div>
  );
}

/* ── Órgãos ──────────────────────────────────────────────────── */
function TabOrgaos({ orgaos, processos, isMobile }) {
  const [busca,setBusca]=useState("");
  const rows=useMemo(()=>orgaos.filter(o=>{
    const q=busca.toLowerCase();
    return !q||(o.nome||"").toLowerCase().includes(q)||(o.responsavel||"").toLowerCase().includes(q);
  }),[orgaos,busca]);
  const countProc=nome=>processos.filter(p=>(p.orgao||"").toLowerCase()===(nome||"").toLowerCase()).length;

  if (!orgaos.length) return (
    <div style={{textAlign:"center",padding:"60px 24px",color:C.sub,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10}}>
      <div style={{fontSize:40,marginBottom:12,opacity:0.25}}>🏛️</div>
      <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:6}}>Nenhum órgão cadastrado</div>
      <div style={{fontSize:13}}>Os órgãos são cadastrados pelo administrador do sistema.</div>
    </div>
  );

  return (
    <div>
      <FilterBar busca={busca} setBusca={setBusca} placeholder="Buscar por nome ou responsável..."/>
      <Count total={orgaos.length} filtrado={rows.length}/>
      {isMobile
        ?<div style={{display:"flex",flexDirection:"column",gap:10}}>
            {rows.map((o,i)=>(
              <div key={o.id||i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:3}}>{o.nome||"—"}</div>
                <div style={{fontSize:12,color:C.sub,marginBottom:8}}>{o.responsavel||"Sem responsável"}</div>
                <span style={{background:C.accentSubtle,color:C.accent,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:600}}>{countProc(o.nome)} processo{countProc(o.nome)!==1?"s":""}</span>
              </div>
            ))}
          </div>
        :<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"#f8fafc"}}>
                  {["Órgão / Secretaria","Responsável","Processos Vinculados"].map(h=><th key={h} style={{padding:"11px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((o,i)=>(
                  <tr key={o.id||i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":"#fafbfc"}}>
                    <td style={{padding:"13px 16px",fontWeight:600,color:C.text}}>{o.nome||"—"}</td>
                    <td style={{padding:"13px 16px",color:C.sub}}>{o.responsavel||"—"}</td>
                    <td style={{padding:"13px 16px"}}>
                      <span style={{background:C.accentSubtle,color:C.accent,borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:600}}>{countProc(o.nome)} processo{countProc(o.nome)!==1?"s":""}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PORTAL PRINCIPAL
════════════════════════════════════════════════════════════════ */
const PORTAL_TABS=[
  {id:"dashboard",        label:"Início"},
  {id:"processos",        label:"Processos"},
  {id:"dispensas",        label:"Dispensas"},
  {id:"inexigibilidades", label:"Inexigibilidades"},
  {id:"atas",             label:"Atas de RP"},
  {id:"contratos",        label:"Contratos"},
  {id:"orgaos",           label:"Órgãos"},
];
const SEED={processos:[],dispensas:[],inexigibilidades:[],atas:[],contratos:[],orgaos:[]};

export default function Portal() {
  const [tab,setTab]       = useState("dashboard");
  const [data,setData]     = useState(SEED);
  const [loading,setLoad]  = useState(true);
  const [erro,setErro]     = useState(null);
  const [isMobile]         = useState(()=>window.innerWidth<768);

  useEffect(()=>{
    Promise.all([
      portalClient.from("processos").select("*").order("created_at",{ascending:false}),
      portalClient.from("dispensas").select("*").order("created_at",{ascending:false}),
      portalClient.from("inexigibilidades").select("*").order("created_at",{ascending:false}),
      portalClient.from("atas").select("*").order("created_at",{ascending:false}),
      portalClient.from("contratos").select("*").order("created_at",{ascending:false}),
      portalClient.from("orgaos").select("*").order("nome",{ascending:true}),
    ]).then(([p,d,i,a,c,o])=>{
      const firstErr = [p,d,i,a,c,o].find(r=>r.error)?.error;
      if (firstErr) { setErro(firstErr.message); setLoad(false); return; }
      setData({processos:p.data||[],dispensas:d.data||[],inexigibilidades:i.data||[],atas:a.data||[],contratos:c.data||[],orgaos:o.data||[]});
      setLoad(false);
    }).catch(e=>{ setErro(e?.message||"Erro ao carregar dados"); setLoad(false); });
  },[]);

  const curTab=PORTAL_TABS.find(t=>t.id===tab);

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"'Inter',system-ui,sans-serif",color:C.text}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:#f1f5f9} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}`}</style>

      {/* HEADER */}
      <header style={{background:C.surface,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:50,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
        <div style={{padding:isMobile?"0 14px":"0 32px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <div style={{width:32,height:32,background:C.accent,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:C.text,letterSpacing:-0.3}}>Gov<span style={{color:C.accent}}>Core</span></div>
              {!isMobile&&<div style={{fontSize:10,color:C.sub,marginTop:1}}>Lei 14.133/2021</div>}
            </div>
          </div>
          {!isMobile&&(
            <div style={{textAlign:"center",flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>Portal de Transparência</div>
              <div style={{fontSize:11,color:C.sub,marginTop:1}}>Acesso público · Dados em tempo real</div>
            </div>
          )}
          <span style={{background:C.accentSubtle,color:C.accent,border:`1px solid ${C.accent}22`,borderRadius:6,padding:"4px 12px",fontSize:11,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>
            {isMobile?"PÚBLICO":"PORTAL PÚBLICO"}
          </span>
        </div>

        {/* ABAS */}
        <div style={{borderTop:`1px solid ${C.border}`,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <div style={{display:"flex",padding:isMobile?"0 8px":"0 24px",minWidth:"max-content"}}>
            {PORTAL_TABS.map(t=>{
              const active=tab===t.id;
              return(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{padding:isMobile?"10px 14px":"11px 18px",border:"none",borderBottom:`2px solid ${active?C.accent:"transparent"}`,background:"none",color:active?C.accent:C.sub,fontSize:isMobile?12:13,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.14s"}}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main style={{flex:1,maxWidth:1200,width:"100%",margin:"0 auto",padding:isMobile?"16px":"28px 32px"}}>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:isMobile?18:22,fontWeight:800,color:C.text,marginBottom:4}}>{curTab?.label}</div>
          {tab!=="dashboard"&&<div style={{fontSize:13,color:C.sub}}>Clique em qualquer registro para ver os detalhes.</div>}
        </div>

        {loading?(
          <div style={{textAlign:"center",padding:"80px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:14,color:C.sub}}>
            <div style={{width:32,height:32,border:`3px solid ${C.border}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
            <span style={{fontSize:13}}>Carregando dados...</span>
          </div>
        ):erro?(
          <div style={{textAlign:"center",padding:"80px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
            <div style={{fontSize:32,opacity:0.3}}>⚠️</div>
            <div style={{fontSize:15,fontWeight:700,color:C.red}}>Erro ao carregar dados</div>
            <div style={{fontSize:13,color:C.sub,maxWidth:480}}>{erro}</div>
            <button onClick={()=>window.location.reload()} style={{marginTop:8,background:C.accent,color:"#fff",border:"none",borderRadius:8,padding:"9px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Tentar novamente</button>
          </div>
        ):(
          <>
            {tab==="dashboard"        &&<TabDashboard data={data}/>}
            {tab==="processos"        &&<TabProcessos processos={data.processos} isMobile={isMobile}/>}
            {tab==="dispensas"        &&<TabDispensas dispensas={data.dispensas} isMobile={isMobile}/>}
            {tab==="inexigibilidades" &&<TabInexig inexigibilidades={data.inexigibilidades} isMobile={isMobile}/>}
            {tab==="atas"             &&<TabAtas atas={data.atas} isMobile={isMobile}/>}
            {tab==="contratos"        &&<TabContratos contratos={data.contratos} isMobile={isMobile}/>}
            {tab==="orgaos"           &&<TabOrgaos orgaos={data.orgaos} processos={data.processos} isMobile={isMobile}/>}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{borderTop:`1px solid ${C.border}`,padding:"16px 32px",textAlign:"center",fontSize:12,color:C.sub,background:C.surface}}>
        Portal de Transparência · <strong style={{color:C.accent}}>GovCore</strong> · Lei 14.133/2021 — Dados públicos atualizados em tempo real.
      </footer>
    </div>
  );
}
