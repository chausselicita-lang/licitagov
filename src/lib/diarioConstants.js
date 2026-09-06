// Sem dependências de browser (import.meta.env) nem Node — usado tanto pela
// UI (diarioDb.js) quanto pelo gerador de PDF server-side (diarioPdf.js).
export const CADERNOS = ['decreto', 'portaria', 'contrato', 'licitacao', 'aviso', 'despacho', 'edital', 'outros'];

export function labelCaderno(caderno) {
  return {
    decreto: 'Decreto', portaria: 'Portaria', contrato: 'Contrato', licitacao: 'Licitação',
    aviso: 'Aviso', despacho: 'Despacho', edital: 'Edital', outros: 'Outros',
  }[caderno] || caderno;
}
