// Sanitiza nomes de arquivo antes de virarem key de objeto no Supabase
// Storage. Nomes de edital em PT-BR quase sempre têm acento ("Pregão",
// "Licitação", "nº") — o Storage rejeita esses bytes na key com "Invalid
// key". Normaliza pra ASCII seguro (NFD + strip de diacríticos, depois
// troca qualquer caractere fora de [a-zA-Z0-9.\-_] por "_").
const DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g');

export function sanitizeStorageFileName(fileName) {
  return String(fileName)
    .normalize('NFD').replace(DIACRITICS_RE, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');
}
