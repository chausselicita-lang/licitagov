const BADGE_MAP = {
  "Vigente":      { bg:"#D1FAE5", text:"#065F46", border:"#A7F3D0" },
  "A vencer":     { bg:"#FFE9D6", text:"#9A3F00", border:"#FFD1AC" },
  "Encerrado":    { bg:"#F1F5F9", text:"#475569", border:"#E2E8F0" },
  "Vencido":      { bg:"#FEE2E2", text:"#991B1B", border:"#FECACA" },
  "Homologado":   { bg:"#D1FAE5", text:"#065F46", border:"#A7F3D0" },
  "Em andamento": { bg:"#FFE9D6", text:"#9A3F00", border:"#FFD1AC" },
  "Publicado":    { bg:"#FFE9D6", text:"#9A3F00", border:"#FFD1AC" },
  "Planejamento": { bg:"#FFE9D6", text:"#9A3F00", border:"#FFD1AC" },
  "Revogado":     { bg:"#FEE2E2", text:"#991B1B", border:"#FECACA" },
  "Suspenso":     { bg:"#F1F5F9", text:"#475569", border:"#E2E8F0" },
  "Finalizada":   { bg:"#D1FAE5", text:"#065F46", border:"#A7F3D0" },
  "Em coleta":    { bg:"#FFE9D6", text:"#9A3F00", border:"#FFD1AC" },
  "Rascunho":     { bg:"#F1F5F9", text:"#64748B", border:"#E2E8F0" },
  "Vence hoje":   { bg:"#FFE9D6", text:"#9A3F00", border:"#FFD1AC" },
  "Vencida":      { bg:"#FEE2E2", text:"#991B1B", border:"#FECACA" },
  "Bloqueado":    { bg:"#FEE2E2", text:"#991B1B", border:"#FECACA" },
  "Gerado":       { bg:"#FFE9D6", text:"#9A3F00", border:"#FFD1AC" },
  "Concluído":    { bg:"#D1FAE5", text:"#065F46", border:"#A7F3D0" },
  "Validado":     { bg:"#FFE9D6", text:"#9A3F00", border:"#FFD1AC" },
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
