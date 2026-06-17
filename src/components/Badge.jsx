const BADGE_MAP = {
  "Vigente":      { bg:"#D1FAE5", text:"#065F46", border:"#A7F3D0" },
  "A vencer":     { bg:"#FEF3C7", text:"#92400E", border:"#FDE68A" },
  "Encerrado":    { bg:"#F1F5F9", text:"#475569", border:"#E2E8F0" },
  "Vencido":      { bg:"#FEE2E2", text:"#991B1B", border:"#FECACA" },
  "Homologado":   { bg:"#D1FAE5", text:"#065F46", border:"#A7F3D0" },
  "Em andamento": { bg:"#DBEAFE", text:"#1E40AF", border:"#BFDBFE" },
  "Publicado":    { bg:"#CFFAFE", text:"#164E63", border:"#A5F3FC" },
  "Planejamento": { bg:"#FEF3C7", text:"#92400E", border:"#FDE68A" },
  "Revogado":     { bg:"#FEE2E2", text:"#991B1B", border:"#FECACA" },
  "Suspenso":     { bg:"#EDE9FE", text:"#5B21B6", border:"#DDD6FE" },
  "Finalizada":   { bg:"#D1FAE5", text:"#065F46", border:"#A7F3D0" },
  "Em coleta":    { bg:"#DBEAFE", text:"#1E40AF", border:"#BFDBFE" },
  "Rascunho":     { bg:"#F1F5F9", text:"#64748B", border:"#E2E8F0" },
  "Vence hoje":   { bg:"#FEF3C7", text:"#92400E", border:"#FDE68A" },
  "Vencida":      { bg:"#FEE2E2", text:"#991B1B", border:"#FECACA" },
};

const FALLBACK = { bg:"#F1F5F9", text:"#475569", border:"#E2E8F0" };

export default function Badge({ label }) {
  const s = BADGE_MAP[label] || FALLBACK;
  return (
    <span style={{
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      borderRadius: 6, padding: "2px 8px",
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      textTransform: "uppercase", whiteSpace: "nowrap", display: "inline-flex",
      alignItems: "center",
    }}>{label}</span>
  );
}
