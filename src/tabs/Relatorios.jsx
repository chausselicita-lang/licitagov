import { C, shadow } from "../lib/theme.js";
import { fmtBRL, diasParaVencer } from "../lib/utils.js";
import Icon from "../components/Icon.jsx";
import Btn from "../components/Btn.jsx";
import { KpiCard } from "../components/UI.jsx";

const REPORTS = [
  { icon:"processos",  title:"Processos por Modalidade",   color:"#2563EB", desc:"Distribuição e valores por tipo de licitação" },
  { icon:"contratos",  title:"Contratos a Vencer",         color:"#D97706", desc:"Contratos nos próximos 30, 60 e 90 dias" },
  { icon:"atas",       title:"Saldo de Atas de RP",        color:"#0891B2", desc:"Utilização e saldo por fornecedor/item" },
  { icon:"cotacoes",   title:"Mapa de Preços Consolidado", color:"#10B981", desc:"Medianas por categoria de objeto" },
  { icon:"relatorios", title:"Relatório Gerencial",        color:"#8B5CF6", desc:"Visão geral de todos os processos e contratos" },
];

export default function Relatorios({ data }) {
  const { processos, contratos, cotacoes, atas } = data;
  const byModalidade = processos.reduce((acc, p) => {
    acc[p.modalidade] = (acc[p.modalidade] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Report cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 28 }}>
        {REPORTS.map(r => (
          <div key={r.title}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px", cursor: "pointer", transition: "border-color 0.14s, box-shadow 0.14s", boxShadow: shadow.card }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = r.color; e.currentTarget.style.boxShadow = shadow.cardHover; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = shadow.card; }}
            onClick={() => window.print()}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: r.color + "15", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Icon name={r.icon} size={20} strokeWidth={1.6} color={r.color} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 5 }}>{r.title}</div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 16, lineHeight: 1.55 }}>{r.desc}</div>
            <Btn color={r.color} variant="outline" size="sm">Gerar Relatório</Btn>
          </div>
        ))}
      </div>

      {/* Processos por modalidade */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px", marginBottom: 16, boxShadow: shadow.card }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 18, textTransform: "uppercase", letterSpacing: "0.08em" }}>Processos por Modalidade</div>
        {Object.entries(byModalidade).map(([mod, qtd]) => (
          <div key={mod} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: C.text }}>{mod}</span>
              <span style={{ fontSize: 13, color: C.accent, fontWeight: 700 }}>{qtd}</span>
            </div>
            <div style={{ background: C.subtle, borderRadius: 4, height: 5, overflow: "hidden" }}>
              <div style={{ width: `${(qtd / processos.length) * 100}%`, height: "100%", background: C.accent, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>

      {/* KPIs resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
        <KpiCard label="Valor total contratos" value={fmtBRL(contratos.filter(c => c.status === "Vigente").reduce((a, c) => a + c.valor, 0))} color={C.green} />
        <KpiCard label="Atas ativas" value={atas.filter(a => diasParaVencer(a.vigencia) > 0).length} color={C.accent2} />
        <KpiCard label="Cotações realizadas" value={cotacoes.length} color={C.gold} />
        <KpiCard label="Processos ativos" value={processos.filter(p => !["Revogado", "Suspenso"].includes(p.fase)).length} color={C.accent} />
      </div>
    </div>
  );
}
