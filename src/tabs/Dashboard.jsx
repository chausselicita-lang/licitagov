import { C, shadow } from "../lib/theme.js";
import { fmtBRL, fmtDate, diasParaVencer } from "../lib/utils.js";
import Badge from "../components/Badge.jsx";
import Icon from "../components/Icon.jsx";
import { KpiCard, SectionHeader } from "../components/UI.jsx";

export default function Dashboard({ data }) {
  const { processos, atas, contratos, cotacoes } = data;

  const vencendo = contratos.filter(c => {
    const d = diasParaVencer(c.fim);
    return d !== null && d >= 0 && d <= 30 && c.status !== "Encerrado";
  });
  const valorContratos = contratos.filter(c => c.status === "Vigente").reduce((a, c) => a + c.valor, 0);
  const atasVigentes   = atas.filter(a => diasParaVencer(a.vigencia) > 0).length;
  const processosAtivos = processos.filter(p => !["Revogado", "Suspenso", "Encerrado"].includes(p.fase)).length;

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(172px,1fr))", gap: 14, marginBottom: 28 }}>
        <KpiCard label="Processos Ativos"    value={processosAtivos}  sub={`${processos.length} total`}                       color={C.accent}  />
        <KpiCard label="Atas Vigentes"       value={atasVigentes}     sub="Registro de Preços"                                 color={C.accent2} />
        <KpiCard label="Contratos Vigentes"  value={contratos.filter(c => c.status === "Vigente").length} sub={fmtBRL(valorContratos)} color={C.green}  />
        <KpiCard label="Cotações"            value={cotacoes.length}  sub="Pesquisas de preço"                                 color={C.gold}    />
        <KpiCard label="A Vencer (30d)"      value={vencendo.length}  sub="Contratos"                                          color={vencendo.length > 0 ? C.red : C.green} />
      </div>

      {/* Processos Recentes */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", boxShadow: shadow.card, marginBottom: 16 }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <SectionHeader title="Processos Recentes" />
        </div>
        {processos.slice(0, 5).map((p, i, arr) => (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "13px 20px",
            borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
            transition: "background 0.1s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = C.overlay}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{p.numero}</span>
                <Badge label={p.fase} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.objeto}</div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{p.modalidade} · {p.orgao}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, minWidth: 80, textAlign: "right", flexShrink: 0 }}>
              {fmtBRL(p.valor)}
            </div>
          </div>
        ))}
      </div>

      {/* Alertas de vencimento */}
      {vencendo.length > 0 && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 14 }}>
            <Icon name="warning" size={15} color={C.red} />
            Contratos a vencer nos próximos 30 dias
          </div>
          {vencendo.map((c, i, arr) => (
            <div key={c.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "9px 0",
              borderBottom: i < arr.length - 1 ? "1px solid #FECACA" : "none",
              flexWrap: "wrap", gap: 8,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.numero} — {c.objeto}</div>
                <div style={{ fontSize: 12, color: C.sub }}>{c.fornecedor}</div>
              </div>
              <div style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>
                Vence em {diasParaVencer(c.fim)}d · {fmtDate(c.fim)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
