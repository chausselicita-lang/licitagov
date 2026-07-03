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
  purple:  "#8b5cf6",
  purpleL: "#ede9fe",
};

function KpiCard({ label, value, sub, icon, accent, accentLt, wide }) {
  const c  = accent   || K.accent;
  const cl = accentLt || K.accentL;

  if (wide) {
    return (
      <div style={{
        background: K.card,
        border:`1px solid ${K.border}`,
        borderRadius:10, padding:"11px 14px",
        boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
        gridColumn:"span 2",
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
      }}>
        <div>
          <div style={{ fontSize:19, fontWeight:800, color:K.text, lineHeight:1.1 }}>{value}</div>
          {sub && <div style={{ fontSize:11, color:K.sub, marginTop:3 }}>{sub}</div>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12, fontWeight:600, color:c }}>{label}</div>
            <div style={{ fontSize:11, color:K.sub }}>Próximos 30 dias</div>
          </div>
          <span style={{
            width:32, height:32, borderRadius:8,
            background: cl, color:c,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>
            <Icon name={icon} size={15} color="currentColor" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: K.card,
      border:`1px solid ${K.border}`,
      borderRadius:10, padding:"11px 14px",
      boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:12, color:K.sub, fontWeight:600 }}>{label}</span>
        <span style={{
          width:28, height:28, borderRadius:8,
          background: cl, color:c,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}>
          <Icon name={icon} size={13} color="currentColor" />
        </span>
      </div>
      <div style={{ fontSize:19, fontWeight:800, color:K.text, lineHeight:1.2, wordBreak:"break-word" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11, color:K.sub, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

export default function KPICards({ processos, atas, contratos, inexigibilidades }) {
  const vencendo30 = contratos.filter(c => {
    const d = diasParaVencer(c.fim);
    return d !== null && d >= 0 && d <= 30 && c.status !== "Encerrado";
  });
  const atasVigentes   = atas.filter(a => (diasParaVencer(a.vigencia) ?? 1) > 0).length;
  const valorContratos = contratos.filter(c => c.status === "Vigente").reduce((acc, c) => acc + c.valor, 0);

  const alertColor  = vencendo30.length > 0 ? K.red   : K.green;
  const alertColorL = vencendo30.length > 0 ? K.redL  : K.greenL;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
      <KpiCard
        label="Processos Ativos"
        value={processos.filter(p => p.fase !== "Encerrado").length}
        sub={`${processos.length} total`}
        icon="processos"
        accent={K.accent} accentLt={K.accentL}
      />
      <KpiCard
        label="Atas Vigentes"
        value={atasVigentes}
        sub="Registro de Preços"
        icon="atas"
        accent={K.teal} accentLt={K.tealL}
      />
      <KpiCard
        label="Contratos Vigentes"
        value={contratos.filter(c => c.status === "Vigente").length}
        sub={fmtBRL(valorContratos)}
        icon="contratos"
        accent={K.green} accentLt={K.greenL}
      />
      <KpiCard
        label="Inexigibilidade"
        value={(inexigibilidades || []).length}
        sub="Art. 74 — Processos"
        icon="inexigib"
        accent={K.purple} accentLt={K.purpleL}
      />
      <KpiCard
        label="A Vencer (30d)"
        value={vencendo30.length}
        sub="Contratos"
        icon="warning"
        accent={alertColor} accentLt={alertColorL}
        wide
      />
    </div>
  );
}
