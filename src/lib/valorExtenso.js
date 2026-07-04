// Conversão de valores monetários (R$) para extenso, em português.

const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = ["dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function tresDigitosPorExtenso(n) {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 10) partes.push(UNIDADES[resto]);
    else if (resto < 20) partes.push(DEZ_A_DEZENOVE[resto - 10]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(" e ");
}

const ESCALAS = [
  { valor: 1000000000, singular: "bilhão", plural: "bilhões" },
  { valor: 1000000, singular: "milhão", plural: "milhões" },
  { valor: 1000, singular: "mil", plural: "mil" },
];

function inteiroPorExtenso(n) {
  if (n === 0) return "zero";
  let resto = n;
  const grupos = [];
  for (const escala of ESCALAS) {
    const qtd = Math.floor(resto / escala.valor);
    if (qtd > 0) {
      const texto = escala.valor === 1000 && qtd === 1
        ? escala.singular
        : `${tresDigitosPorExtenso(qtd)} ${qtd === 1 ? escala.singular : escala.plural}`;
      grupos.push(texto);
      resto -= qtd * escala.valor;
    }
  }
  if (resto > 0) grupos.push(tresDigitosPorExtenso(resto));
  return grupos.join(" e ").replace(/ e (\S+ e \S+)$/, ", $1");
}

// Ex.: 79037.13 → "setenta e nove mil, trinta e sete reais e treze centavos"
export function valorPorExtenso(valor) {
  const n = Math.round((Number(valor) || 0) * 100);
  const reais = Math.floor(n / 100);
  const centavos = n % 100;

  const reaisTexto = `${inteiroPorExtenso(reais)} ${reais === 1 ? "real" : "reais"}`;
  if (centavos === 0) return reaisTexto;

  const centavosTexto = `${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
  return `${reaisTexto} e ${centavosTexto}`;
}

export function formatBRL(valor) {
  return (Number(valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "R$ 79.037,13 (setenta e nove mil, trinta e sete reais e treze centavos)"
export function valorComExtenso(valor) {
  return `${formatBRL(valor)} (${valorPorExtenso(valor)})`;
}
