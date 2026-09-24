import { createClient } from '@supabase/supabase-js';
import { buildMapaComparativoDocx, nomeArquivoMapaComparativo } from '../src/lib/cotacaoMapaDocx.js';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const BUCKET = 'cotacoes-docs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel' });

  const { cotacaoId } = req.body || {};
  if (!cotacaoId) return res.status(400).json({ error: 'cotacaoId é obrigatório' });

  const sb = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // service role bypassa RLS — o filtro por cotacaoId já restringe ao
    // registro certo; não há necessidade de tenant_id aqui pois estamos
    // lendo (não gravando) e o id já identifica a cotação de forma única.
    const { data: cot, error: eCot } = await sb
      .from('cotacoes')
      .select('id, numero, objeto, processo, data_criacao, cot_itens(id, descricao, unidade, qtd, cot_fontes_ia(fonte, fornecedor, descricao, valor_unitario, unidade_medida, orgao_referencia, data_referencia, url, selecionado, item_id))')
      .eq('id', cotacaoId)
      .single();
    if (eCot) throw eCot;
    if (!cot) return res.status(404).json({ error: 'Cotação não encontrada' });

    const itens = (cot.cot_itens || [])
      .map(it => ({
        descricao: it.descricao,
        unidade: it.unidade,
        qtd: it.qtd,
        // cot_fontes_ia vem embutido por item_id — cada linha de fonte só
        // aparece aqui se pertencer a este item; filtra as não selecionadas.
        fontes: (it.cot_fontes_ia || []).filter(f => f.item_id === it.id && f.selecionado !== false),
      }))
      .filter(it => it.fontes.length > 0);

    if (!itens.length) {
      return res.status(400).json({ error: 'Nenhum item com fontes de preço selecionadas para gerar o mapa. Pesquise e selecione ao menos um resultado antes de exportar.' });
    }

    const docxBuf = await buildMapaComparativoDocx({
      cotacao: { numero: cot.numero, objeto: cot.objeto, processo: cot.processo, dataCriacao: cot.data_criacao },
      itens,
    });
    const nomeArquivo = nomeArquivoMapaComparativo({ numero: cot.numero });
    const path = `mapas/${cot.id}/${nomeArquivo}`;

    const upload = await sb.storage.from(BUCKET).upload(path, docxBuf, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });
    if (upload.error) throw upload.error;

    const docxUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    const { data: row, error: eUpdate } = await sb
      .from('cotacoes')
      .update({ mapa_docx_url: docxUrl })
      .eq('id', cotacaoId)
      .select()
      .single();
    if (eUpdate) throw eUpdate;

    return res.json({ cotacao: row, docxUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
