// LexCore — prompts de IA e helpers do fluxo de Respostas a Impugnação/Recurso
// (independente da análise de edital — ver src/lib/lexcoreLegal.js para o
// fluxo de análise de edital, que não é tocado por este arquivo)

export const TIPOS_RESPOSTA = [
  { value: "resposta_impugnacao", label: "Resposta à Impugnação" },
  { value: "contrarrazoes",       label: "Contrarrazões" },
];

export function labelTipoResposta(tipo) {
  return TIPOS_RESPOSTA.find(t => t.value === tipo)?.label || tipo;
}

export function buildRespostaSystem(tipoRespostaLabel) {
  return `Você é um advogado especialista em licitações públicas, representando o ÓRGÃO LICITANTE (não o autor da petição).
Leia o documento anexado (uma impugnação ao edital ou um recurso administrativo apresentado por um licitante ou terceiro)
e redija uma peça do tipo "${tipoRespostaLabel}" respondendo e refutando os argumentos apresentados, em defesa do edital
ou da decisão recorrida. A peça deve ter: endereçamento formal, síntese da petição recebida, rebate ponto a ponto dos
argumentos com fundamentação jurídica (citando os artigos da Lei 14.133/2021 aplicáveis), e pedido de indeferimento da
impugnação/recurso com manutenção do edital ou da decisão. Linguagem jurídica formal, mas objetiva. Não invente
jurisprudência específica — cite apenas a legislação.
Responda APENAS com o texto final da peça, pronto para protocolo, sem markdown e sem comentários fora da peça.`;
}

export function buildRespostaUserText({ tipoRespostaLabel, nomeReferencia, numeroProcesso }) {
  const linhas = [
    `Edital/Objeto de referência: ${nomeReferencia || "não informado"}`,
    `Processo nº: ${numeroProcesso || "não informado"}`,
    "",
    `O documento anexado é a petição recebida. Redija a peça de defesa do tipo "${tipoRespostaLabel}" conforme as instruções do sistema.`,
  ];
  return linhas.join("\n");
}
