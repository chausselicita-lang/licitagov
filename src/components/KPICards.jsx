import Icon from "./Icon.jsx";
import { fmtBRL, diasParaVencer } from "../lib/utils.js";

const K = {
  card:   "#1c1d21",
  border: "rgba(255,255,255,0.07)",
  text:   "#e8e9ed",
  sub:    "#8a8d96",
  accent: "#4f7ef7",
  green:  "#4ade80",
  teal:   "#22d3ee",
  gold:   "#e2c14d",
  red:    "#f15b5b",
};

function KpiCard({ label, value, sub, icon, accent }) {
  const c = accent || K.accent;
  return (
    <div
      style={{
        background: K.card,
        border:`1px solid ${K.border}`,
        borderRadius:12, padding:16,
        boxShadow:"0 1px 4px rgba(0,0,0,0.15)",
        transition:"border-color 0.14s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor=`${c}44`}
      onMouseLeave={e => e.currentTarget.style.borderColor=K.border}
    >
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <span style={{ fontSize:12, color:K.sub, fontWeight:500 }}>{label}</span>
        <span style={{
          width:32, height:32, borderRadius:8,
          background:`${c}18`, color:c,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}>
          <Icon name={icon} size={15} color="currentColor" />
        </span>
      </div>
      <div style={{ fontSize:24, fontWeight:700, color:K.text, fontFamily:"'Syne',sans-serif", lineHeight:1.1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:12, color:K.sub, marginTop:5 }}>{sub}</div>}
    </div>
  );
}

export default function KPICards({ processos, atas, contratos, cotacoes }) {
  const vencendo30 = contratos.filter(c => {
    const d = diasParaVencer(c.fim);
    return d !== null && d >= 0 && d <= 30 && c.status !== "Encerrado";
  });
  const atasVigentes = atas.filter(a => (diasParaVencer(a.vigencia) ?? 1) > 0).length;
  const valorContratos = contratos.filter(c => c.status === "Vigente").reduce((acc, c) => acc + c.valor, 0);

  const kpis = [
    {
      label:"Processos Ativos",
      value: processos.filter(p => p.fase !== "Encerrado").length,
      sub:`${processos.length} total`,
      icon:"processos",
      accent: K.accent,
    },
    {
      label:"Atas Vigentes",
      value: atasVigentes,
      sub:"Registro de Preços",
      icon:"atas",
      accent: K.teal,
    },
    {
      label:"Contratos Vigentes",
      value: contratos.filter(c => c.status === "Vigente").length,
      sub: fmtBRL(valorContratos),
      icon:"contratos",
      accent: K.green,
    },
    {
      label:"Cotações",
      value: cotacoes.length,
      sub:"Pesquisas de preço",
      icon:"cotacoes",
      accent: K.gold,
    },
    {
      label:"A Vencer (30d)",
      value: vencendo30.length,
      sub:"Contratos",
      icon:"warning",
      accent: vencendo30.length > 0 ? K.red : K.green,
    },
  ];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:12 }}>
      {kpis.map(k => <KpiCard key={k.label} {...k} />)}
    </div>
  );
}
