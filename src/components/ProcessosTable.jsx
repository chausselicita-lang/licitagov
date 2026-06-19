import StatusBadge from "./StatusBadge.jsx";
import { fmtBRL } from "../lib/utils.js";

const P = {
  card:    "#ffffff",
  border:  "#e4e8ef",
  subtle:  "#f8fafc",
  text:    "#111827",
  sub:     "#6b7280",
  accent:  "#1d4ed8",
  hover:   "#f8fafc",
};

export default function ProcessosTable({ processos, onViewAll }) {
  return (
    <div style={{
      background: P.card,
      border:`1px solid ${P.border}`,
      borderRadius:12,
      boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
      overflow:"hidden",
    }}>
      {/* Section header */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
        borderBottom:`1px solid ${P.border}`, padding:"14px 20px",
        background: P.subtle,
      }}>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:P.text }}>Processos Recentes</div>
          <div style={{ fontSize:12, color:P.sub, marginTop:2 }}>Últimas movimentações da unidade gestora</div>
        </div>
        {onViewAll && (
          <button onClick={onViewAll}
            onMouseEnter={e => e.currentTarget.style.opacity="0.7"}
            onMouseLeave={e => e.currentTarget.style.opacity="1"}
            style={{
              background:"none", border:"none", color:P.accent,
              cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit",
              display:"flex", alignItems:"center", gap:4, flexShrink:0,
              transition:"opacity 0.12s",
            }}>
            Ver todos →
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background: P.subtle, borderBottom:`1px solid ${P.border}` }}>
              {[
                { label:"Número / Objeto", align:"left" },
                { label:"Modalidade",      align:"left" },
                { label:"Status",          align:"left" },
                { label:"Valor",           align:"right" },
              ].map(h => (
                <th key={h.label} style={{
                  padding:"10px 20px",
                  fontSize:11, color:P.sub, fontWeight:600,
                  textTransform:"uppercase", letterSpacing:"0.07em",
                  textAlign: h.align, whiteSpace:"nowrap",
                }}>{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processos.filter(p => !["Dispensa","Dispensa de Licitação","Inexigibilidade","Inexigibilidade de Licitação"].includes(p.modalidade)).slice(0, 5).map((p, i) => (
              <tr key={p.id}
                style={{
                  borderBottom:`1px solid ${P.border}`,
                  background: P.card,
                  transition:"background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = P.hover}
                onMouseLeave={e => e.currentTarget.style.background = P.card}
              >
                <td style={{ padding:"12px 20px", maxWidth:300 }}>
                  <div style={{ fontWeight:700, color:P.accent }}>{p.numero}</div>
                  <div style={{
                    fontSize:12, color:P.sub,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:260,
                  }}>{p.objeto}</div>
                </td>
                <td style={{ padding:"12px 20px", color:P.sub, whiteSpace:"nowrap" }}>{p.modalidade}</td>
                <td style={{ padding:"12px 20px" }}>
                  <StatusBadge label={p.fase} />
                </td>
                <td style={{ padding:"12px 20px", textAlign:"right", fontWeight:700, color:P.text, whiteSpace:"nowrap" }}>
                  {fmtBRL(p.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
