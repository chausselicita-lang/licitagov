export const fmtBRL = v =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export const fmtDate = d =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

export const hoje = () => new Date().toISOString().slice(0, 10);

export const diasParaVencer = d => {
  if (!d) return null;
  return Math.round((new Date(d + "T00:00:00") - new Date()) / 86400000);
};

export const calcMediana = arr => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export const fmtFileSize = bytes => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
