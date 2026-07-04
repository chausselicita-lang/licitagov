const STATUS_MAP = {
  "Vigente":      { bg:"#f0fdf4", fg:"#15803d" },
  "Homologado":   { bg:"#f0fdf4", fg:"#15803d" },
  "Concluída":    { bg:"#f0fdf4", fg:"#15803d" },
  "Finalizada":   { bg:"#f0fdf4", fg:"#15803d" },
  "Adjudicado":   { bg:"#f0fdf4", fg:"#15803d" },
  "Em andamento": { bg:"#fff1e6", fg:"#c25a00" },
  "Em coleta":    { bg:"#fff1e6", fg:"#c25a00" },
  "Publicado":    { bg:"#fff1e6", fg:"#c25a00" },
  "Planejamento": { bg:"#fff1e6", fg:"#c25a00" },
  "A vencer":     { bg:"#fff1e6", fg:"#c25a00" },
  "Suspenso":     { bg:"#f3f4f6", fg:"#6b7280" },
  "Rascunho":     { bg:"#f3f4f6", fg:"#6b7280" },
  "Encerrado":    { bg:"#f3f4f6", fg:"#6b7280" },
  "Vencido":      { bg:"#fef2f2", fg:"#b91c1c" },
  "Cancelada":    { bg:"#fef2f2", fg:"#b91c1c" },
  "Revogado":     { bg:"#fef2f2", fg:"#b91c1c" },
  "Deserto":      { bg:"#fff1e6", fg:"#c25a00" },
  "Fracassado":   { bg:"#fff1e6", fg:"#c25a00" },
};

export default function StatusBadge({ label, color }) {
  const preset = STATUS_MAP[label];
  const fg = color || (preset ? preset.fg : "#6b7280");
  const bg = preset ? preset.bg : "#f3f4f6";
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
