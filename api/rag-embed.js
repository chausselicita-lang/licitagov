import { gerarEmbedding } from './_lib/embeddings.js';

// Endpoint chamado do browser (mesmo padrão de api/claude.js) para embeddar
// o texto da demanda no momento da geração de ETP/TR/Mapa de Riscos, antes
// da busca por similaridade via supabase.rpc('rag_buscar_similares', ...).
// A chave da OpenAI nunca sai do servidor Vercel.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { texto } = req.body || {};
  if (!texto || !String(texto).trim()) {
    return res.status(400).json({ error: 'texto é obrigatório' });
  }

  try {
    const embedding = await gerarEmbedding(texto);
    return res.json({ embedding });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
