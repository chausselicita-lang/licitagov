import Icon from "./Icon.jsx";
import { fmtBRL, diasParaVencer } from "../lib/utils.js";

const K = {
  card:    "#ffffff",
  border:  "#e4e8ef",
  text:    "#111827",
  sub:     "#6b7280",
  accent:  "#1d4ed8",
  accentL: "#eff6ff",
  teal:    "#0891b2",
  tealL:   "#ecfeff",
  green:   "#15803d",
  greenL:  "#f0fdf4",
  gold:    "#b45309",
  goldL:   "#fffbeb",
  red:     "#b91c1c",
  redL:    "#fef2f2",
};

function KpiCard({ label, value, sub, icon, accent, accentLt }) {
  const c  = accent   || K.accent;
  const cl = accentLt || K.accentL;
  return (
    <div style={{
      background: K.card,
      border:`1px solid ${K.border}`,
      borderRadius:12, padding:"16px 20px",
      boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <span style={{ fontSize:13, color:K.sub, fontWeight:600 }}>{label}</span>
        <span style={{
          width:36, height:36, borderRadius:10,
          background: cl, color:c,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}>
          <Icon name={icon} size={16} color="currentColor" />
        </span>
      </div>
      <div style={{ fontSize:28, fontWeight:800, color:K.text, lineHeight:1.1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:12, color:K.sub, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

export default function KPICards({ processos, atas, contratos, cotacoes }) {
  const vencendo30 = contratos.filter(c => {
    const d = diasParaVencer(c.fim);
    return d !== null && d >= 0 && d <= 30 && c.status !== "Encerrado";
  });
  const atasVigentes   = atas.filter(a => (diasParaVencer(a.vigencia) ?? 1) > 0).length;
  const valorContratos = contratos.filter(c => c.status === "Vigente").reduce((acc, c) => acc + c.valor, 0);

  const kpis = [
    {
      label:"Processos Ativos",
      value: processos.filter(p => p.fase !== "Encerrado").length,
      sub:`${processos.length} total`,
      icon:"processos",
      accent:  K.accent,
      accentLt: K.accentL,
    },
    {
      label:"Atas Vigentes",
      value: atasVigentes,
      sub:"Registro de Preços",
      icon:"atas",
      accent:  K.teal,
      accentLt: K.tealL,
    },
    {
      label:"Contratos Vigentes",
      value: contratos.filter(c => c.status === "Vigente").length,
      sub: fmtBRL(valorContratos),
      icon:"contratos",
      accent:  K.green,
      accentLt: K.greenL,
    },
    {
      label:"Cotações",
      value: cotacoes.length,
      sub:"Pesquisas de preço",
      icon:"cotacoes",
      accent:  K.gold,
      accentLt: K.goldL,
    },
    {
      label:"A Vencer (30d)",
      value: vencendo30.length,
      sub:"Contratos",
      icon:"warning",
      accent:  vencendo30.length > 0 ? K.red : K.green,
      accentLt: vencendo30.length > 0 ? K.redL : K.greenL,
    },
  ];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:14 }}>
      {kpis.map(k => <KpiCard key={k.label} {...k} />)}
    </div>
  );
}
