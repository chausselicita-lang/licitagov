// Validação legal — Agente de Dispensas
// Art. 75, inciso II, da Lei nº 14.133/2021 (valores atualizados)

import { formatBRL } from "./valorExtenso.js";

export const LIMITES_ART_75_II = {
  compras_servicos:   62725.59,
  obras_engenharia:   125451.15,
};

export const TIPOS_OBJETO = [
  { value: "compras_servicos", label: "Compras / Outros Serviços" },
  { value: "obras_engenharia", label: "Obras / Serviços de Engenharia" },
];

export function fundamentacaoLegal(tipoObjeto) {
  const alinea = tipoObjeto === "obras_engenharia" ? "I" : "II";
  return `Art. 75, inciso ${alinea}, da Lei nº 14.133, de 1º de abril de 2021.`;
}

// Retorna o resultado da checagem automática do limite legal para a dispensa.
export function validarLimiteLegal({ tipoObjeto, valorEstimado }) {
  const limite = LIMITES_ART_75_II[tipoObjeto] ?? LIMITES_ART_75_II.compras_servicos;
  const valor = Number(valorEstimado) || 0;
  const excede = valor > limite;
  const percentual = limite > 0 ? (valor / limite) * 100 : 0;

  const tipoLabel = TIPOS_OBJETO.find(t => t.value === tipoObjeto)?.label || "Compras / Outros Serviços";

  const mensagem = excede
    ? `O valor estimado (${formatBRL(valor)}) ULTRAPASSA o limite de dispensa por valor para ${tipoLabel.toLowerCase()} ` +
      `(${formatBRL(limite)}), previsto no ${fundamentacaoLegal(tipoObjeto)} Este processo NÃO pode ser formalizado ` +
      `como Dispensa de Licitação por valor — é necessário adotar modalidade licitatória regular ou justificar dispensa por outro inciso do art. 75.`
    : `Valor estimado dentro do limite legal de dispensa por valor para ${tipoLabel.toLowerCase()} ` +
      `(${formatBRL(limite)}), conforme ${fundamentacaoLegal(tipoObjeto)}`;

  return {
    limite,
    valor,
    excede,
    percentual: Math.round(percentual * 10) / 10,
    fundamentacaoLegal: fundamentacaoLegal(tipoObjeto),
    mensagem,
  };
}
