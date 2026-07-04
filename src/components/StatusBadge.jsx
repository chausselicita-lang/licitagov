const STATUS_MAP = {
  "Vigente":      { bg:"#12261a", fg:"#3ecf6e" },
  "Homologado":   { bg:"#12261a", fg:"#3ecf6e" },
  "Concluída":    { bg:"#12261a", fg:"#3ecf6e" },
  "Finalizada":   { bg:"#12261a", fg:"#3ecf6e" },
  "Adjudicado":   { bg:"#12261a", fg:"#3ecf6e" },
  "Em andamento": { bg:"#2a1c0f", fg:"#FF9633" },
  "Em coleta":    { bg:"#2a1c0f", fg:"#FF9633" },
  "Publicado":    { bg:"#2a1c0f", fg:"#FF9633" },
  "Planejamento": { bg:"#2a1c0f", fg:"#FF9633" },
  "A vencer":     { bg:"#2a1c0f", fg:"#FF9633" },
  "Suspenso":     { bg:"#2a2a2a", fg:"#C0C0C0" },
  "Rascunho":     { bg:"#2a2a2a", fg:"#C0C0C0" },
  "Encerrado":    { bg:"#2a2a2a", fg:"#C0C0C0" },
  "Vencido":      { bg:"#2a1414", fg:"#f04545" },
  "Cancelada":    { bg:"#2a1414", fg:"#f04545" },
  "Revogado":     { bg:"#2a1414", fg:"#f04545" },
  "Deserto":      { bg:"#2a1c0f", fg:"#FF7A00" },
  "Fracassado":   { bg:"#2a1c0f", fg:"#FF7A00" },
};

export default function StatusBadge({ label, color }) {
  const preset = STATUS_MAP[label];
  const fg = color || (preset ? preset.fg : "#C0C0C0");
  const bg = preset ? preset.bg : "#2a2a2a";
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      background: bg,
      color: fg,
      borderRadius:999,
      padding:"3px 10px",
      fontSize:12, fontWeight:600,
      whiteSpace:"nowrap",
    }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:"currentColor", flexShrink:0 }} />
      {label}
    </span>
  );
}
