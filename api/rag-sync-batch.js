import { createClient } from '@supabase/supabase-js';
import { gerarEmbedding } from './_lib/embeddings.js';

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const MIN_CHARS = 200;
const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 30;

// Carga retroativa da base de conhecimento — chamado em loop pelo botão
// "Sincronizar Base de Conhecimento" no Super Admin, um lote por vez, pra
// nunca estourar o timeout de função serverless do Vercel. Idempotente:
// cada peça só aparece em rag_pecas_pendentes enquanto não tiver NENHUMA
// linha (aprovada ou descartada) em agentes_base_conhecimento — rodar de
// novo nunca duplica nem reprocessa o que já foi feito.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel' });

  const authHeader = req.headers.authorization || '';
  const callerToken = authHeader.replace('Bearer ', '');
  if (!callerToken) return res.status(401).json({ error: 'Unauthorized' });

  const sb = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data: { user }, error: authErr } = await sb.auth.getUser(callerToken);
    if (authErr || !user) return res.status(401).json({ error: 'Token inválido' });

    const { data: profile } = await sb.from('user_profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'super_admin') {
      return res.status(403).json({ error: 'Acesso negado — restrito ao Super Admin' });
    }

    const limit = Math.min(Math.max(parseInt(req.body?.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const { data: pendentes, error: pendErr } = await sb.from('rag_pecas_pendentes').select('*').limit(limit);
    if (pendErr) throw pendErr;

    let processados = 0;
    const falhas = [];

    for (const item of pendentes || []) {
      const conteudo = (item.conteudo_texto || '').trim();
      const linhaBase = {
        processo_id: item.processo_id,
        peca_id: item.peca_id,
        tenant_id: item.tenant_id,
        tipo_documento: item.tipo_documento,
        tipo_contratacao: item.tipo_contratacao || null,
        conteudo_texto: conteudo,
      };

      if (conteudo.length < MIN_CHARS) {
        const { error: upsertErr } = await sb.from('agentes_base_conhecimento')
          .upsert({ ...linhaBase, embedding: null, status: 'descartado' }, { onConflict: 'processo_id,tipo_documento' });
        if (upsertErr) falhas.push({ pecaId: item.peca_id, tipo: item.tipo_documento, erro: upsertErr.message });
        else falhas.push({ pecaId: item.peca_id, tipo: item.tipo_documento, erro: 'conteúdo curto demais (descartado)' });
        continue;
      }

      try {
        const embedding = await gerarEmbedding(conteudo);
        const { error: upsertErr } = await sb.from('agentes_base_conhecimento')
          .upsert({ ...linhaBase, embedding, status: 'aprovado' }, { onConflict: 'processo_id,tipo_documento' });
        if (upsertErr) throw upsertErr;
        processados++;
      } catch (err) {
        // Falha transiente (ex.: rate limit da OpenAI) — não grava nada, item
        // permanece em rag_pecas_pendentes pra ser tentado no próximo lote.
        falhas.push({ pecaId: item.peca_id, tipo: item.tipo_documento, erro: err.message || String(err) });
      }
    }

    const { count: restantes } = await sb.from('rag_pecas_pendentes').select('*', { count: 'exact', head: true });

    return res.json({ processados, falhas, restantes: restantes || 0, concluido: (restantes || 0) === 0 });
  } catch (err) {
    console.error('[rag-sync-batch]', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
