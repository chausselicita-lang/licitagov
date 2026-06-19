const STATUS_MAP = {
  "Vigente":      { bg:"#f0fdf4", fg:"#15803d" },
  "Homologado":   { bg:"#f0fdf4", fg:"#15803d" },
  "Concluída":    { bg:"#f0fdf4", fg:"#15803d" },
  "Finalizada":   { bg:"#f0fdf4", fg:"#15803d" },
  "Adjudicado":   { bg:"#ecfdf5", fg:"#059669" },
  "Em andamento": { bg:"#eff6ff", fg:"#1d4ed8" },
  "Em coleta":    { bg:"#eff6ff", fg:"#1d4ed8" },
  "Publicado":    { bg:"#eff6ff", fg:"#1d4ed8" },
  "Planejamento": { bg:"#fffbeb", fg:"#b45309" },
  "A vencer":     { bg:"#fffbeb", fg:"#b45309" },
  "Suspenso":     { bg:"#fffbeb", fg:"#b45309" },
  "Rascunho":     { bg:"#f3f4f6", fg:"#6b7280" },
  "Encerrado":    { bg:"#f3f4f6", fg:"#6b7280" },
  "Vencido":      { bg:"#fef2f2", fg:"#b91c1c" },
  "Cancelada":    { bg:"#fef2f2", fg:"#b91c1c" },
  "Revogado":     { bg:"#fef2f2", fg:"#b91c1c" },
  "Deserto":      { bg:"#fff7ed", fg:"#c2410c" },
  "Fracassado":   { bg:"#fff7ed", fg:"#c2410c" },
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
