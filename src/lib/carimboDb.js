import { getSupabase } from './supabase.js';
import { sanitizeStorageFileName } from './storageSafeName.js';

function configFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    carimboImageUrl: row.carimbo_image_url,
    posCarimboX: Number(row.pos_carimbo_x),
    posCarimboY: Number(row.pos_carimbo_y),
    carimboWidthPct: Number(row.carimbo_width_pct),
    posNumeroX: Number(row.pos_numero_x),
    posNumeroY: Number(row.pos_numero_y),
    numeroFontSize: Number(row.numero_font_size),
    numeroColor: row.numero_color,
    updatedAt: row.updated_at,
  };
}

export const CARIMBO_CONFIG_DEFAULTS = {
  posCarimboX: 0.75,
  posCarimboY: 0.05,
  carimboWidthPct: 0.18,
  posNumeroX: 0.5,
  posNumeroY: 0.42,
  numeroFontSize: 14,
  numeroColor: '#1a1a6e',
};

// ── Configuracao do carimbo (1 por tenant) ───────────────────────
export async function sbGetCarimboConfig() {
  const sb = getSupabase();
  const { data, error } = await sb.from('carimbo_config').select('*').maybeSingle();
  if (error) return { data: null, error };
  return { data: configFromDb(data), error: null };
}

export async function sbSaveCarimboConfig(config) {
  const sb = getSupabase();
  const payload = {
    carimbo_image_url: config.carimboImageUrl,
    pos_carimbo_x: config.posCarimboX,
    pos_carimbo_y: config.posCarimboY,
    carimbo_width_pct: config.carimboWidthPct,
    pos_numero_x: config.posNumeroX,
    pos_numero_y: config.posNumeroY,
    numero_font_size: config.numeroFontSize,
    numero_color: config.numeroColor,
    updated_at: new Date().toISOString(),
  };

  if (config.id) {
    const { data, error } = await sb.from('carimbo_config').update(payload).eq('id', config.id).select().single();
    return { data: data ? configFromDb(data) : null, error };
  }
  const { data, error } = await sb.from('carimbo_config').insert(payload).select().single();
  return { data: data ? configFromDb(data) : null, error };
}

// ── Upload dos PNGs (carimbo / rubrica) ──────────────────────────
// Upload direto do navegador - o bucket carimbo-assets tem policy de
// INSERT/UPDATE restrita a pasta {tenant_id}/ do proprio usuario
// (migration_carimbo_digital.sql), diferente dos outros buckets do
// projeto que exigem relay por API service-role.
export async function uploadCarimboAsset(file, tenantId, kind) {
  const sb = getSupabase();
  const ext = sanitizeStorageFileName(file.name).split('.').pop() || 'png';
  const path = `${tenantId}/${kind}.${ext}`;
  const { error } = await sb.storage.from('carimbo-assets').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/png',
    cacheControl: '0',
  });
  if (error) return { url: null, error };
  const { data } = sb.storage.from('carimbo-assets').getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}`, error: null };
}

// ── Historico de carimbagens ──────────────────────────────────────
function processamentoFromDb(row) {
  return {
    id: row.id,
    nomeArquivo: row.nome_arquivo,
    totalFolhas: row.total_folhas,
    numeroInicial: row.numero_inicial,
    numeroFinal: row.numero_final,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  };
}

export async function sbListCarimboProcessamentos() {
  const sb = getSupabase();
  const { data, error } = await sb.from('carimbo_processamentos').select('*').order('created_at', { ascending: false });
  if (error) return { data: [], error };
  return { data: data.map(processamentoFromDb), error: null };
}

export async function sbCreateCarimboProcessamento({ nomeArquivo, totalFolhas, numeroInicial, numeroFinal, storagePath }) {
  const sb = getSupabase();
  const { data: userData } = await sb.auth.getUser();
  const { data, error } = await sb.from('carimbo_processamentos').insert({
    nome_arquivo: nomeArquivo,
    total_folhas: totalFolhas,
    numero_inicial: numeroInicial,
    numero_final: numeroFinal,
    storage_path: storagePath || null,
    created_by: userData?.user?.id || null,
  }).select().single();
  return { data: data ? processamentoFromDb(data) : null, error };
}

// Guarda o PDF final gerado no bucket carimbo-processados, para permitir
// baixar de novo depois a partir do historico.
export async function uploadCarimboProcessado(pdfBytes, tenantId, nomeArquivo) {
  const sb = getSupabase();
  const safeName = sanitizeStorageFileName(nomeArquivo);
  const path = `${tenantId}/${Date.now()}-${safeName}`;
  const { error } = await sb.storage.from('carimbo-processados').upload(path, pdfBytes, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (error) return { path: null, url: null, error };
  const { data } = sb.storage.from('carimbo-processados').getPublicUrl(path);
  return { path, url: data.publicUrl, error: null };
}
