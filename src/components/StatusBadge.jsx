const STATUS_MAP = {
  "Vigente":      { bg:"rgba(46,160,105,0.15)",   fg:"#4ade80" },
  "Homologado":   { bg:"rgba(46,160,105,0.15)",   fg:"#4ade80" },
  "Concluída":    { bg:"rgba(46,160,105,0.15)",   fg:"#4ade80" },
  "Finalizada":   { bg:"rgba(46,160,105,0.15)",   fg:"#4ade80" },
  "Em andamento": { bg:"rgba(79,126,247,0.15)",   fg:"#6b9bff" },
  "Em coleta":    { bg:"rgba(79,126,247,0.15)",   fg:"#6b9bff" },
  "Publicado":    { bg:"rgba(79,126,247,0.15)",   fg:"#6b9bff" },
  "Planejamento": { bg:"rgba(230,145,56,0.15)",   fg:"#f0a45c" },
  "A vencer":     { bg:"rgba(217,180,50,0.15)",   fg:"#e2c14d" },
  "Rascunho":     { bg:"rgba(138,141,150,0.15)",  fg:"#8a8d96" },
  "Encerrado":    { bg:"rgba(138,141,150,0.15)",  fg:"#8a8d96" },
  "Vencido":      { bg:"rgba(241,91,91,0.15)",    fg:"#f15b5b" },
  "Cancelada":    { bg:"rgba(241,91,91,0.15)",    fg:"#f15b5b" },
  "Revogado":     { bg:"rgba(241,91,91,0.15)",    fg:"#f15b5b" },
  "Suspenso":     { bg:"rgba(167,139,250,0.15)",  fg:"#a78bfa" },
};

export default function StatusBadge({ label, color }) {
  const preset = STATUS_MAP[label];
  const fg = color || (preset ? preset.fg : "#8a8d96");
  const bg = preset ? preset.bg : "rgba(138,141,150,0.15)";
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      background: bg,
      color: fg,
      border:`1px solid ${fg}30`,
      borderRadius:999,
      padding:"3px 10px",
      fontSize:11, fontWeight:600, letterSpacing:"0.02em",
      whiteSpace:"nowrap",
    }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:"currentColor", flexShrink:0 }} />
      {label}
    </span>
  );
}
