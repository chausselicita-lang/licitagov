const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small'; // 1536 dimensões — mesma dimensão da coluna embedding em agentes_base_conhecimento
const MAX_CHARS = 30000; // folga generosa abaixo do limite de tokens do modelo

export async function gerarEmbedding(texto) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada nas variáveis de ambiente do Vercel.');

  const textoLimpo = String(texto || '').trim().slice(0, MAX_CHARS);
  if (!textoLimpo) throw new Error('Texto vazio — nada para gerar embedding.');

  const resp = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, input: textoLimpo }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error?.message || `Erro HTTP ${resp.status} ao gerar embedding`);

  const embedding = json.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== 1536) {
    throw new Error('Embedding retornado pela OpenAI em formato inesperado.');
  }
  return embedding;
}
