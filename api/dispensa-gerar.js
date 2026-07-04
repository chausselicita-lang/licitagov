import { createClient } from '@supabase/supabase-js';
import { buildDadosProcesso, buildSecoesProcesso, nomeArquivoProcesso } from '../src/lib/dispensaProcesso.js';
import { buildDocxBuffer } from '../src/lib/dispensaDocx.js';
import { buildPdfBuffer } from '../src/lib/dispensaPdf.js';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const BUCKET = 'dispensas-docs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel' });

  const { processoId, input, config: institucional } = req.body || {};
  if (!input?.objeto || input?.valorEstimado === undefined) {
    return res.status(400).json({ error: 'objeto e valorEstimado são obrigatórios' });
  }

  const sb = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const dados = buildDadosProcesso(input, institucional || {});

    // Bloqueia a geração dos arquivos se o valor exceder o limite legal —
    // o processo continua registrado como "Bloqueado" para revisão do gestor.
    if (dados.excedeLimite) {
      let row;
      if (processoId) {
        const { data, error } = await sb.from('dispensa_processos')
          .update({
            status: 'Bloqueado',
            limite_legal: dados.limiteLegal,
            excede_limite: true,
            fundamentacao_legal: dados.fundamentacaoLegal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', processoId).select().single();
        if (error) throw error;
        row = data;
      }
      await sb.from('dispensa_logs').insert({
        processo_id: processoId || null,
        evento: 'validacao_bloqueada',
        detalhes: { mensagem: dados.mensagemValidacao, limite: dados.limiteLegal, valor: dados.valorEstimado },
      });
      return res.status(422).json({
        error: 'valor_excede_limite',
        mensagem: dados.mensagemValidacao,
        limite: dados.limiteLegal,
        valor: dados.valorEstimado,
        processo: row || null,
      });
    }

    const secoes = buildSecoesProcesso(dados);
    const [docxBuf, pdfBuf] = await Promise.all([
      buildDocxBuffer(secoes, dados),
      buildPdfBuffer(secoes, dados),
    ]);

    const pastaId = processoId || crypto.randomUUID();
    const docxPath = `processos/${pastaId}/${nomeArquivoProcesso(dados, 'docx')}`;
    const pdfPath = `processos/${pastaId}/${nomeArquivoProcesso(dados, 'pdf')}`;

    const [upDocx, upPdf] = await Promise.all([
      sb.storage.from(BUCKET).upload(docxPath, docxBuf, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      }),
      sb.storage.from(BUCKET).upload(pdfPath, pdfBuf, {
        contentType: 'application/pdf',
        upsert: true,
      }),
    ]);
    if (upDocx.error) throw upDocx.error;
    if (upPdf.error) throw upPdf.error;

    const docxUrl = sb.storage.from(BUCKET).getPublicUrl(docxPath).data.publicUrl;
    const pdfUrl = sb.storage.from(BUCKET).getPublicUrl(pdfPath).data.publicUrl;

    const payload = {
      numero_processo: dados.numeroProcesso,
      numero_dispensa: dados.numeroDispensa,
      objeto: dados.objeto,
      tipo_objeto: dados.tipoObjeto,
      valor_estimado: dados.valorEstimado,
      prazo_execucao: dados.prazoExecucao,
      unidade_gestora: dados.unidadeGestora,
      status: 'Gerado',
      limite_legal: dados.limiteLegal,
      excede_limite: false,
      fundamentacao_legal: dados.fundamentacaoLegal,
      dados_complementares: input.dadosComplementares || {},
      docx_url: docxUrl,
      pdf_url: pdfUrl,
      updated_at: new Date().toISOString(),
    };

    let row;
    if (processoId) {
      const { data, error } = await sb.from('dispensa_processos').update(payload).eq('id', processoId).select().single();
      if (error) throw error;
      row = data;
    } else {
      const { data, error } = await sb.from('dispensa_processos').insert(payload).select().single();
      if (error) throw error;
      row = data;
    }

    await sb.from('dispensa_logs').insert({
      processo_id: row.id,
      evento: 'documentos_gerados',
      detalhes: { docxUrl, pdfUrl },
    });

    return res.json({ processo: row, docxUrl, pdfUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
