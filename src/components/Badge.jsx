const BADGE_MAP = {
  "Vigente":      { bg:"#12261a", text:"#3ecf6e", border:"#1f4a30" },
  "A vencer":     { bg:"#2a1c0f", text:"#FF9633", border:"#4d2c0f" },
  "Encerrado":    { bg:"#2a2a2a", text:"#C0C0C0", border:"#3d3d3d" },
  "Vencido":      { bg:"#2a1414", text:"#f04545", border:"#4a2020" },
  "Homologado":   { bg:"#12261a", text:"#3ecf6e", border:"#1f4a30" },
  "Em andamento": { bg:"#2a1c0f", text:"#FF9633", border:"#4d2c0f" },
  "Publicado":    { bg:"#2a1c0f", text:"#FF9633", border:"#4d2c0f" },
  "Planejamento": { bg:"#2a1c0f", text:"#FF9633", border:"#4d2c0f" },
  "Revogado":     { bg:"#2a1414", text:"#f04545", border:"#4a2020" },
  "Suspenso":     { bg:"#2a2a2a", text:"#C0C0C0", border:"#3d3d3d" },
  "Finalizada":   { bg:"#12261a", text:"#3ecf6e", border:"#1f4a30" },
  "Em coleta":    { bg:"#2a1c0f", text:"#FF9633", border:"#4d2c0f" },
  "Rascunho":     { bg:"#2a2a2a", text:"#C0C0C0", border:"#3d3d3d" },
  "Vence hoje":   { bg:"#2a1c0f", text:"#FF9633", border:"#4d2c0f" },
  "Vencida":      { bg:"#2a1414", text:"#f04545", border:"#4a2020" },
  "Bloqueado":    { bg:"#2a1414", text:"#f04545", border:"#4a2020" },
  "Gerado":       { bg:"#2a1c0f", text:"#FF9633", border:"#4d2c0f" },
  "Concluído":    { bg:"#12261a", text:"#3ecf6e", border:"#1f4a30" },
  "Validado":     { bg:"#2a1c0f", text:"#FF9633", border:"#4d2c0f" },
};

const FALLBACK = { bg:"#2a2a2a", text:"#C0C0C0", border:"#3d3d3d" };

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
