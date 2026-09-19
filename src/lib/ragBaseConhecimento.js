// Base de Conhecimento IA (RAG) — retrieval de exemplos few-shot pros
// agentes do Planejamento IA (ETP/TR/Mapa de Riscos) + helpers do painel de
// monitoramento no Super Admin. Mesmo padrão de dbPlanejamento.js.
import { getSupabase } from './supabase.js';
import { getTenantScope } from './tenantScope.js';

async function ragEmbed(texto) {
  const resp = await fetch('/api/rag-embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || 'Erro ao gerar embedding');
  return json.embedding;
}

// Busca os exemplos mais similares já aprovados para injetar como few-shot.
// Nunca lança erro pro chamador: se a busca falhar (API fora do ar, tabela
// ainda vazia etc.), retorna [] silenciosamente — o agente sempre consegue
// gerar o documento, com ou sem exemplos de referência.
export async function ragObterExemplosFewShot({ tipoDocumento, textoConsulta, tipoContratacao, limit = 3 }) {
  try {
    const sb = getSupabase();
    if (!sb) return [];
    const embedding = await ragEmbed(textoConsulta);
    const { data, error } = await sb.rpc('rag_buscar_similares', {
      p_tipo_documento: tipoDocumento,
      p_embedding: embedding,
      p_tenant_id: getTenantScope(),
      p_tipo_contratacao: tipoContratacao || null,
      p_limit: limit,
    });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('[rag] busca de exemplos few-shot falhou, seguindo sem exemplos:', e.message || e);
    return [];
  }
}

// ── Carga retroativa (Super Admin) ───────────────────────────────
export async function ragSyncBatch(accessToken, limit = 15) {
  const resp = await fetch('/api/rag-sync-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ limit }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || 'Erro ao sincronizar base de conhecimento');
  return json; // { processados, falhas, restantes, concluido }
}

// ── Painel de monitoramento ───────────────────────────────────────
export async function ragObterStats() {
  const sb = getSupabase();
  if (!sb) return { porTenant: [], pendentes: 0 };
  const [statsRes, pendentesRes] = await Promise.all([
    sb.from('rag_stats_por_tenant').select('*'),
    sb.from('rag_pecas_pendentes').select('*', { count: 'exact', head: true }),
  ]);
  return {
    porTenant: statsRes.data || [],
    pendentes: pendentesRes.count || 0,
  };
}
