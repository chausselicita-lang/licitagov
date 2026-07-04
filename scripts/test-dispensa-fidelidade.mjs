// Script ad-hoc: gera um processo de exemplo com os dados reais do modelo
// (Prefeitura de Mascote/BA) para comparar a saída do gerador com o
// original em G:\Desktop\AGENTE L.S.A. Não faz parte do build/produção.
import { writeFileSync, mkdirSync } from "node:fs";
import { buildDadosProcesso, buildSecoesProcesso, nomeArquivoProcesso } from "../src/lib/dispensaProcesso.js";
import { buildDocxBuffer } from "../src/lib/dispensaDocx.js";
import { buildPdfBuffer } from "../src/lib/dispensaPdf.js";

const config = {
  municipio: "Mascote",
  uf: "BA",
  cnpjMunicipio: "13.818.018/0001-47",
  endereco: "Praça Almir Silva Araújo, 86, Centro",
  cep: "45.870-000",
  emailLicitacao: "licitacao@mascote.ba.gov.br",
  prefeitoNome: "Sebastião Moreira Carvalho",
  prefeitoCpf: "715.570.595-00",
  agenteContratacaoNome: "Edivânia dos Santos",
  agenteContratacaoMatricula: "148354",
  procuradorNome: "Lélio Furtado Ferreira Junior",
  procuradorOab: "21.835",
  secretarioFinancasNome: "Lauciene Geraldo Souza",
  portariaAgente: "Portaria nº 011 de 06 de Janeiro de 2025",
  decretoMunicipal: "Decreto Municipal n°. 020/2024",
};

const input = {
  numeroProcesso: "013/2026",
  numeroDispensa: "005/2026",
  objeto: "Contratação de empresa especializada para execução de serviços de escavação e drenagem de águas pluviais no Distrito de São João do Paraíso, no Município de Mascote/BA",
  tipoObjeto: "obras_engenharia",
  valorEstimado: 79037.13,
  prazoExecucao: "conforme Termo de Referência",
  unidadeGestora: "Secretaria Municipal de Planejamento e Obras",
  dadosComplementares: {
    secretariaDemandante: "Secretaria Municipal de Planejamento e Obras",
    dataAbertura: "14/01/2026",
    dataSessao: "14/01/2026",
    dataAberturaExtenso: "05 de janeiro de 2026",
    dataPublicacao: "09/01/2026",
    horarioAbertura: "09:00",
    empresaRazaoSocial: "Comercial Atacadista Xavier LTDA",
    empresaCnpj: "41.648.722/0001-34",
    empresaEndereco: "Avenida Rio do Antonio, 271 A, Sala 1, Bairro São Jorge, Brumado/BA",
    empresaRepresentante: "",
    dotacaoOrcamentaria: "Poder: 2 Poder Executivo | Órgão: 3 Secretaria Municipal de Saúde de Mascote | Secretaria: 10 Secretaria Municipal de Saúde | Unidade: 03.01 Fundo Municipal de Saúde | 10.301.0010.1.013 Construção e Ampliação da Unidade Básica de Saúde | Elemento de Despesa: 4.4.90.51.00 - Obras e Instalações | Fonte de Recurso: 16000000 - Recursos do SUS do Governo Federal",
    numeroContrato: "001/2026-FMS",
    vigenciaContrato: "12 meses",
    itens: [
      { item: "1.1", descricao: "Escavação mecanizada de vala", unidade: "M3", quantidade: 210, valorUnitario: 15, total: 3150 },
      { item: "2.1", descricao: "Tubo de PVC DN 150mm", unidade: "M", quantidade: 120, valorUnitario: 86.69, total: 10402.8 },
      { item: "3.1", descricao: "Pavimento em paralelepípedos", unidade: "M2", quantidade: 256, valorUnitario: 88.43, total: 22638.08 },
    ],
  },
};

const dados = buildDadosProcesso(input, config);
const secoes = buildSecoesProcesso(dados);

console.log("Total de seções:", secoes.length);
secoes.forEach((s, i) => console.log(`  ${i + 1}. ${s.titulo}`));

const outDir = process.env.DISPENSA_SAMPLE_OUT || "./dispensa-sample-out";
mkdirSync(outDir, { recursive: true });

const docxBuf = await buildDocxBuffer(secoes, dados);
writeFileSync(`${outDir}/${nomeArquivoProcesso(dados, "docx")}`, docxBuf);
console.log("DOCX gerado:", docxBuf.length, "bytes");

const pdfBuf = await buildPdfBuffer(secoes, dados);
writeFileSync(`${outDir}/${nomeArquivoProcesso(dados, "pdf")}`, pdfBuf);
console.log("PDF gerado:", pdfBuf.length, "bytes");
