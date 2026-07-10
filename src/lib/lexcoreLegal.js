// LexCore — prompts de IA e helpers de parsing (Lei 14.133/2021)

export const TIPOS_PROBLEMA = [
  { value: "restritivo",  label: "Restritivo à competitividade" },
  { value: "ilegal",      label: "Ilegal" },
  { value: "dubio",       label: "Dúbio / impreciso" },
  { value: "risco_baixo", label: "Risco baixo" },
];

export const NIVEIS_RISCO = ["alto", "medio", "baixo"];

export const TIPOS_PECA = [
  { value: "impugnacao",     label: "Impugnação ao Edital" },
  { value: "razoes_recurso", label: "Razões de Recurso" },
  { value: "contrarrazoes",  label: "Contrarrazões" },
  { value: "peticao",        label: "Petição Diversa" },
];

export const ANALISE_SYSTEM = `Você é um especialista em licitações públicas brasileiras, com domínio completo da Lei 14.133/2021.
Analise o texto do edital fornecido e identifique cláusulas problemáticas.
Responda APENAS com um array JSON válido, sem texto adicional, sem markdown, no formato:
[{"trecho_edital": "...", "tipo_problema": "restritivo|ilegal|dubio|risco_baixo", "descricao_problema": "...", "fundamentacao_legal": "...", "artigo_lei": "Art. X da Lei 14.133/2021", "nivel_risco": "alto|medio|baixo"}]
Se nenhum ponto crítico for encontrado, responda com um array vazio: []`;

export function buildPecaSystem(tipoPecaLabel) {
  return `Você é um advogado especialista em licitações públicas. Redija uma peça jurídica do tipo ${tipoPecaLabel}
com base nos pontos críticos fornecidos. A peça deve ter: endereçamento formal, qualificação das partes,
síntese fática, fundamentação jurídica (citando os artigos da Lei 14.133/2021 aplicáveis), pedidos claros
e fechamento. Linguagem jurídica formal, mas objetiva. Não invente jurisprudência específica — cite apenas
a legislação fornecida no contexto.
Responda APENAS com o texto final da peça, pronto para protocolo, sem markdown e sem comentários fora da peça.`;
}

// Recebe os pontos críticos já carregados do banco (formato camelCase de
// pontoFromDb em lexcoreDb.js: nivelRisco, tipoProblema, descricaoProblema,
// trechoEdital, fundamentacaoLegal, artigoLei) — não o array snake_case cru
// que a IA devolve antes de ser inserido (esse é tratado por
// parsePontosCriticosJSON, nunca chega aqui diretamente).
export function buildPecaUserPrompt({ tipoPecaLabel, nomeEdital, numeroProcesso, pontos }) {
  const listaPontos = pontos.map((p, i) => (
    `${i + 1}. [Risco ${p.nivelRisco.toUpperCase()} — ${p.tipoProblema}] ${p.descricaoProblema}\n` +
    `   Trecho do edital: "${p.trechoEdital}"\n` +
    `   Fundamentação: ${p.fundamentacaoLegal}${p.artigoLei ? ` (${p.artigoLei})` : ""}`
  )).join("\n\n");

  return `Edital: ${nomeEdital || "não informado"}
Processo nº: ${numeroProcesso || "não informado"}

Redija uma peça do tipo "${tipoPecaLabel}" com base nos seguintes pontos críticos selecionados:

${listaPontos}`;
}

// Extrai o primeiro array JSON válido de um texto (a IA às vezes cerca a
// resposta com texto adicional apesar da instrução de responder só o array).
export function parsePontosCriticosJSON(text) {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("IA não retornou um array JSON válido. Tente novamente.");
  let arr;
  try { arr = JSON.parse(m[0]); } catch { throw new Error("Falha ao interpretar o JSON retornado pela IA."); }
  if (!Array.isArray(arr)) throw new Error("Formato de resposta inválido (esperado um array).");
  return arr.filter(p => p && p.trecho_edital && p.tipo_problema && p.nivel_risco).map(p => ({
    trecho_edital: String(p.trecho_edital),
    tipo_problema: p.tipo_problema,
    descricao_problema: String(p.descricao_problema || ""),
    fundamentacao_legal: String(p.fundamentacao_legal || ""),
    artigo_lei: p.artigo_lei ? String(p.artigo_lei) : null,
    nivel_risco: p.nivel_risco,
  }));
}

export function labelTipoPeca(tipo) {
  return TIPOS_PECA.find(t => t.value === tipo)?.label || tipo;
}

export function labelTipoProblema(tipo) {
  return TIPOS_PROBLEMA.find(t => t.value === tipo)?.label || tipo;
}
