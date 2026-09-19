import { createClient } from '@supabase/supabase-js';
import { gerarEmbedding } from './_lib/embeddings.js';

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const MIN_CHARS = 200; // abaixo disso o conteúdo é curto demais pra render um exemplo útil de few-shot

const TIPO_DOCUMENTO_POR_TABELA = {
  planejamento_dfd: 'DFD',
  planejamento_etp: 'ETP',
  planejamento_tr: 'TR',
  planejamento_mapa_riscos: 'MAPA_RISCO',
};

// Recebido via webhook assíncrono (pg_net) disparado pelo trigger
// rag_notificar_index() em supabase/migration_rag_base_conhecimento.sql,
// sempre que uma peça do Planejamento IA muda de status pra "finalizado".
// Protegido por segredo compartilhado (x-rag-secret) — nunca chamado
// diretamente pelo browser.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secretEsperado = process.env.RAG_WEBHOOK_SECRET;
  const secretRecebido = req.headers['x-rag-secret'];
  if (!secretEsperado || secretRecebido !== secretEsperado) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel' });

  const { tabela, peca_id } = req.body || {};
  const tipoDocumento = TIPO_DOCUMENTO_POR_TABELA[tabela];
  if (!tipoDocumento || !peca_id) {
    return res.status(400).json({ error: 'tabela ou peca_id inválidos' });
  }

  const sb = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data: peca, error: pecaErr } = await sb
      .from(tabela)
      .select('id, processo_id, tenant_id, conteudo_gerado, status')
      .eq('id', peca_id)
      .single();
    if (pecaErr || !peca) return res.status(404).json({ error: 'Peça não encontrada' });
    if (peca.status !== 'finalizado') return res.status(200).json({ skipped: 'status não é finalizado' });

    const conteudo = (peca.conteudo_gerado || '').trim();

    const { data: processo } = await sb
      .from('planejamento_processos')
      .select('tipo_contratacao')
      .eq('id', peca.processo_id)
      .single();

    const linhaBase = {
      processo_id: peca.processo_id,
      peca_id: peca.id,
      tenant_id: peca.tenant_id,
      tipo_documento: tipoDocumento,
      tipo_contratacao: processo?.tipo_contratacao || null,
      conteudo_texto: conteudo,
    };

    if (conteudo.length < MIN_CHARS) {
      const { error: upsertErr } = await sb.from('agentes_base_conhecimento')
        .upsert({ ...linhaBase, embedding: null, status: 'descartado' }, { onConflict: 'processo_id,tipo_documento' });
      if (upsertErr) throw upsertErr;
      return res.status(200).json({ skipped: 'conteúdo curto demais para indexar' });
    }

    const embedding = await gerarEmbedding(conteudo);

    const { error: upsertErr } = await sb.from('agentes_base_conhecimento')
      .upsert({ ...linhaBase, embedding, status: 'aprovado' }, { onConflict: 'processo_id,tipo_documento' });
    if (upsertErr) throw upsertErr;

    return res.json({ indexed: true });
  } catch (err) {
    console.error('[rag-index]', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
