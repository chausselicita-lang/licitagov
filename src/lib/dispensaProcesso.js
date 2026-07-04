// Agente de Dispensas — motor de montagem do processo
//
// Fonte oficial do modelo: G:\Desktop\AGENTE L.S.A (5 documentos — um processo
// único de Dispensa de Licitação, Lei 14.133/2021, Prefeitura de Mascote/BA).
// A estrutura, ordem, peças e frases padrão foram preservadas integralmente;
// somente os dados variáveis (objeto, valores, datas, nomes, números) são
// substituídos pelos dados do processo atual.
//
// Este módulo é puro (sem dependências de docx/pdf) para poder ser usado
// tanto no gerador de .docx quanto no gerador de .pdf, garantindo que os
// dois arquivos exportados tenham exatamente o mesmo conteúdo.

import { valorComExtenso, formatBRL } from "./valorExtenso.js";
import { validarLimiteLegal, fundamentacaoLegal } from "./dispensaLegal.js";

const hoje = () => new Date();

export function formatarDataExtenso(date = hoje()) {
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2,"0")} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatarDataCurta(date = hoje()) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

// ── Normaliza os dados de entrada (form) + config institucional ──────────
export function buildDadosProcesso(input, config = {}) {
  const objeto = (input.objeto || "").trim();
  const objetoUpper = objeto.toUpperCase();
  const valorEstimado = Number(input.valorEstimado) || 0;
  const tipoObjeto = input.tipoObjeto || "compras_servicos";
  const validacao = validarLimiteLegal({ tipoObjeto, valorEstimado });

  const complementares = input.dadosComplementares || {};

  return {
    // ── entrada básica (workflow passo 1) ──
    objeto,
    objetoUpper,
    valorEstimado,
    valorFormatado: formatBRL(valorEstimado),
    valorExtenso: valorComExtenso(valorEstimado),
    tipoObjeto,
    prazoExecucao: input.prazoExecucao || "",
    unidadeGestora: input.unidadeGestora || "",

    // ── validação legal automática ──
    limiteLegal: validacao.limite,
    excedeLimite: validacao.excede,
    percentualLimite: validacao.percentual,
    fundamentacaoLegal: validacao.fundamentacaoLegal,
    mensagemValidacao: validacao.mensagem,

    // ── numeração do processo ──
    numeroProcesso: input.numeroProcesso || "____/____",
    numeroDispensa: input.numeroDispensa || "____/____",

    // ── datas (podem ser complementadas depois na revisão) ──
    dataAbertura: complementares.dataAbertura || formatarDataCurta(),
    dataAberturaExtenso: complementares.dataAberturaExtenso || formatarDataExtenso(),
    dataPublicacao: complementares.dataPublicacao || formatarDataCurta(),
    dataSessao: complementares.dataSessao || formatarDataCurta(),
    horarioAbertura: complementares.horarioAbertura || "09:00",
    prazoPropostaDias: complementares.prazoPropostaDias || "03 (três)",

    // ── unidade demandante / justificativa ──
    secretariaDemandante: complementares.secretariaDemandante || input.unidadeGestora || "",
    justificativa: complementares.justificativa || "",
    fiscalContrato: complementares.fiscalContrato || "",
    fiscalContratoCpf: complementares.fiscalContratoCpf || "",

    // ── empresa vencedora / contratada (preenchido na revisão) ──
    empresaRazaoSocial: complementares.empresaRazaoSocial || "",
    empresaCnpj: complementares.empresaCnpj || "",
    empresaEndereco: complementares.empresaEndereco || "",
    empresaRepresentante: complementares.empresaRepresentante || "",
    empresaRepresentanteCpf: complementares.empresaRepresentanteCpf || "",
    empresaRepresentanteRg: complementares.empresaRepresentanteRg || "",

    // ── dotação orçamentária ──
    dotacaoOrcamentaria: complementares.dotacaoOrcamentaria || "",

    // ── itens (planilha de custos / termo de referência) ──
    itens: Array.isArray(complementares.itens) ? complementares.itens : [],

    // ── número do contrato / vigência ──
    numeroContrato: complementares.numeroContrato || "____/____",
    vigenciaContrato: complementares.vigenciaContrato || "12 (doze) meses",

    // ── configuração institucional ──
    municipio: config.municipio || "",
    uf: config.uf || "",
    cnpjMunicipio: config.cnpjMunicipio || "",
    endereco: config.endereco || "",
    cep: config.cep || "",
    emailLicitacao: config.emailLicitacao || "",
    prefeitoNome: config.prefeitoNome || "",
    prefeitoCpf: config.prefeitoCpf || "",
    agenteNome: config.agenteContratacaoNome || "",
    agenteMatricula: config.agenteContratacaoMatricula || "",
    procuradorNome: config.procuradorNome || "",
    procuradorOab: config.procuradorOab || "",
    secretarioFinancasNome: config.secretarioFinancasNome || "",
    portariaAgente: config.portariaAgente || "",
    decretoMunicipal: config.decretoMunicipal || "",
  };
}

const linha = () => "_______________________________________________";

// ── Monta as seções (peças) do processo, na ordem exata do modelo oficial ──
// Cada seção: { titulo, paragrafos: string[], tabela?: {cabecalho, linhas} }
export function buildSecoesProcesso(d) {
  const municipioUf = `${d.municipio}/${d.uf}`;
  const secoes = [];

  // 1 — CAPA / PROTOCOLO
  secoes.push({
    titulo: `DISPENSA DE LICITAÇÃO Nº ${d.numeroDispensa}`,
    paragrafos: [
      `PROTOCOLO Nº ${d.numeroProcesso}`,
      `Processo Administrativo Nº ${d.numeroProcesso}`,
      `${municipioUf}, ${d.dataAberturaExtenso}`,
      `OBJETO`,
      d.objetoUpper,
      `DEPARTAMENTO DE LICITAÇÕES E CONTRATOS:`,
      `Agente de Contratação: ${d.agenteNome || linha()}`,
      `${d.prefeitoNome || linha()}`,
      `Prefeito Municipal`,
      `${municipioUf}`,
    ],
  });

  // 2 — AVISO DE DISPENSA DE LICITAÇÃO
  secoes.push({
    titulo: "AVISO DE DISPENSA DE LICITAÇÃO",
    paragrafos: [
      `Modalidade: DISPENSA DE LICITAÇÃO ${d.numeroDispensa}`,
      `O Município de ${municipioUf}, através do Agente de Contratação e equipe de apoio` +
        (d.portariaAgente ? `, designados pela ${d.portariaAgente}` : "") +
        `, torna público, para conhecimento dos interessados, que realizará dispensa de licitação, do tipo Menor Preço:`,
      `Número do processo administrativo: ${d.numeroProcesso}`,
      `Modalidade da licitação: Dispensa por Valor`,
      `Fundamentação legal: ${d.fundamentacaoLegal}`,
      `Objeto: ${d.objetoUpper}`,
      `Unidade solicitante: ${d.unidadeGestora}`,
      `Data de publicação: ${d.dataPublicacao}`,
      `Data de abertura: ${d.dataAbertura}`,
      `Horário de abertura: ${d.horarioAbertura}`,
      `As características do objeto são imprescindíveis para a sua escolha, conforme requerido pela ${(d.secretariaDemandante || d.unidadeGestora).toUpperCase()}, divulgação do presente aviso no sítio eletrônico da Municipalidade, em conformidade com o ${d.fundamentacaoLegal}`,
      `O Termo de Referência e demais documentos estão disponíveis gratuitamente na sede da Prefeitura, no endereço ${d.endereco}${d.cep ? `, CEP: ${d.cep}` : ""}, município de ${municipioUf}, a partir da data de publicação.`,
      `Maiores informações no Departamento de Licitações e Contratos${d.emailLicitacao ? `, pelo e-mail: ${d.emailLicitacao}` : ""}.`,
      `${municipioUf}, ${d.dataPublicacao}.`,
      `${d.agenteNome || linha()}`,
      d.agenteMatricula ? `Matrícula nº ${d.agenteMatricula}` : "",
      `Agente Municipal de Contratação`,
    ].filter(Boolean),
  });

  // 3 — COMUNICAÇÃO INTERNA → SETOR DE COMPRAS
  secoes.push({
    titulo: "COMUNICAÇÃO INTERNA",
    paragrafos: [
      `DE: DLC – DEPARTAMENTO DE LICITAÇÕES E CONTRATOS`,
      `PARA: SETOR DE COMPRAS E CONTRATAÇÃO DE SERVIÇOS`,
      `Pelo presente, solicitamos deste Setor de Compras do município de ${d.municipio}, a elaboração de estimativa de preços, com a finalidade de ${d.objetoUpper}, conforme pedido de realização de despesas constante do presente processo.`,
      `${municipioUf}, ${d.dataAberturaExtenso}.`,
      `${d.agenteNome || linha()}`,
      d.agenteMatricula ? `Matrícula nº ${d.agenteMatricula}` : "",
      `Agente Municipal de Contratação`,
    ].filter(Boolean),
  });

  // 4 — COMUNICAÇÃO INTERNA → SECRETARIA DE FINANÇAS
  secoes.push({
    titulo: "COMUNICAÇÃO INTERNA",
    paragrafos: [
      `DE: DLC – Departamento de Licitações e Contratos`,
      `PARA: SECRETARIA MUNICIPAL DE FINANÇAS`,
      `Através do presente, solicitamos da Secretaria Municipal de Finanças deste município de ${d.municipio}, a indicação de dotação orçamentária para contratação relativa a ${d.objetoUpper}.`,
      `${municipioUf}, ${d.dataAberturaExtenso}.`,
      `${d.agenteNome || linha()}`,
      d.agenteMatricula ? `Matrícula nº ${d.agenteMatricula}` : "",
      `Agente Municipal de Contratação`,
    ].filter(Boolean),
  });

  // 5 — ESTIMATIVA DE PREÇOS
  secoes.push({
    titulo: "ESTIMATIVA DE PREÇOS",
    paragrafos: [
      `${municipioUf}, ${d.dataAberturaExtenso}`,
      `As aquisições e contratações públicas seguem, em regra, o princípio do dever de licitar, previsto no artigo 37, inciso XXI da Constituição. Porém, o comando constitucional já enuncia que a lei poderá estabelecer exceções à regra geral, com a expressão "ressalvados os casos especificados na legislação".`,
      `Dentre todas as propostas legais, está a estimativa de preços para composição de procedimento administrativo para ${d.objetoUpper}, decorrentes do controle das necessidades específicas.`,
      `Informo ainda que foram feitas pesquisas de mercado, tendo apresentado preço estimado em: ${d.valorExtenso}, conforme planilha em anexo.`,
      `Desta forma, e em atenção ao disposto no art. 72, inc. II, da Lei nº 14.133/21, e conforme preconiza o art. 23, da referida lei, apresenta-se compatível com os preços praticados no mercado.`,
      `Seguem anexas as cotações de preços elaboradas por este setor.`,
      linha(),
      `Setor de Compras/Contratação de Serviços`,
    ],
  });

  // 6 — DOCUMENTO DE FORMALIZAÇÃO DE DEMANDA (DFD)
  secoes.push({
    titulo: "DOCUMENTO DE FORMALIZAÇÃO DE DEMANDA (DFD)",
    paragrafos: [
      "Lei Federal nº 14.133, de 01 de abril de 2021",
      "1. IDENTIFICAÇÃO DO REQUISITANTE",
      `UNIDADE REQUISITANTE: ${d.secretariaDemandante || d.unidadeGestora}`,
      "2. IDENTIFICAÇÃO DA DEMANDA",
      "III – JUSTIFICATIVA DA NECESSIDADE DA CONTRATAÇÃO",
      d.justificativa || `A presente justificativa fundamenta a necessidade de contratação relativa a ${d.objetoUpper}, com base no ${d.fundamentacaoLegal}, por dispensa de licitação.`,
      "IV - DESCRIÇÃO DA SOLUÇÃO PRELIMINAR E QUANTIDADES A SEREM ADQUIRIDAS EM FUNÇÃO DO CONSUMO E UTILIZAÇÃO PROVÁVEIS",
      `Estima-se a contratação conforme planilha de custos/itens constante deste processo, no valor total de ${d.valorExtenso}.`,
      "V - PREVISÃO DE DATA EM QUE DEVE SER ASSINADO O INSTRUMENTO CONTRATUAL",
      `O contrato deverá ser assinado em até 30 (trinta) dias da homologação.`,
      "VI – INFORMAÇÕES ADICIONAIS",
      `6.1 Prazo de Execução: ${d.prazoExecucao || "conforme Termo de Referência"}.`,
      `6.2 Prazo para Pagamento: até 30 (trinta) dias, após a apresentação da nota fiscal e certidões negativas.`,
      "DOTAÇÃO:",
      d.dotacaoOrcamentaria || "A indicar pela Secretaria Municipal de Finanças.",
      "9. RESPONSABILIDADE PELA FORMALIZAÇÃO DA DEMANDA",
      "( X ) DE ACORDO. Encaminhe-se à Diretoria de Planejamento, vinculada à Secretaria Municipal de Administração, para ciência, com sugestão de encaminhamento à Controladoria e Procuradoria, para prosseguimento.",
      `${municipioUf}, ${d.dataAberturaExtenso}.`,
      linha(),
      d.secretariaDemandante || d.unidadeGestora,
    ],
  });

  // 7 — TERMO DE REFERÊNCIA
  const totalItens = d.itens.reduce((s, it) => s + (Number(it.total) || 0), 0);
  secoes.push({
    titulo: "TERMO DE REFERÊNCIA",
    paragrafos: [
      `PROCESSO ADMINISTRATIVO Nº ${d.numeroProcesso}`,
      `Secretaria solicitante: ${d.secretariaDemandante || d.unidadeGestora}`,
      "DEFINIÇÃO DO OBJETO:",
      `${d.objetoUpper}, CONFORME PLANILHA DE CUSTOS, ESPECIFICAÇÕES TÉCNICAS E CONDIÇÕES ESTABELECIDAS NESTE TERMO DE REFERÊNCIA.`,
      "DO AMPARO LEGAL:",
      `O presente Termo de Referência encontra-se consubstanciado na Lei Federal nº 14.133/2021${d.decretoMunicipal ? ` e no ${d.decretoMunicipal}` : ""}.`,
      "FORMA E CRITÉRIOS DE SELEÇÃO DO FORNECEDOR:",
      "O fornecedor será selecionado por meio de procedimento de contratação direta, na modalidade DISPENSA, com adoção do critério de julgamento pelo MENOR PREÇO.",
      "14 – DA VIGÊNCIA",
      `A vigência da contratação é de ${d.vigenciaContrato}, a partir da assinatura, podendo ser prorrogada nos termos dos artigos 106 e 107 da Lei nº 14.133/2021.`,
      "18 – DA DOTAÇÃO ORÇAMENTÁRIA",
      d.dotacaoOrcamentaria || "A indicar pela Secretaria Municipal de Finanças.",
      `${municipioUf}, ${d.dataAberturaExtenso}.`,
      linha(),
      d.secretariaDemandante || d.unidadeGestora,
    ],
    tabela: d.itens.length ? {
      cabecalho: ["Item", "Descrição", "Und.", "Quant.", "V. Unit. (R$)", "Total (R$)"],
      linhas: [
        ...d.itens.map((it, i) => [
          String(it.item || i + 1),
          it.descricao || "",
          it.unidade || "",
          String(it.quantidade ?? ""),
          formatBRL(it.valorUnitario || 0),
          formatBRL(it.total || 0),
        ]),
        ["", "", "", "", "TOTAL GERAL", formatBRL(totalItens || d.valorEstimado)],
      ],
    } : null,
  });

  // 8 — AUTUAÇÃO E AUTORIZAÇÃO (GABINETE DO PREFEITO)
  secoes.push({
    titulo: "AUTUAÇÃO E AUTORIZAÇÃO PARA ABERTURA DE PROCEDIMENTO ADMINISTRATIVO",
    paragrafos: [
      `DETERMINO A AUTUAÇÃO do Processo Administrativo sob o nº ${d.numeroProcesso}, de ${d.dataAberturaExtenso}, cujo objeto resumido é ${d.objetoUpper.toLowerCase()}, conforme planilha e termo de referência.`,
      `AUTORIZO a abertura do Procedimento em tempo que determino a tomada imediata de ações, conforme segue:`,
      `Notifique-se o Departamento de Licitações e Contratos, na pessoa do(a) Agente de Contratação ${d.agenteNome || linha()}, para que adote as medidas cabíveis com a finalidade de efetuar a contratação referente ao Processo Administrativo em epígrafe, inclusive expedindo aviso de dispensa para convocação de interessados a apresentarem suas propostas no prazo de ${d.prazoPropostaDias} dias, nos termos do artigo 72, parágrafo único, da Lei 14.133/21.`,
      `O Departamento de Licitações e Contratos fica, desde já, autorizado a dar sequência no procedimento, de maneira a garantir a concretização da contratação para atendimento da finalidade a que se propõe.`,
      `${municipioUf}, ${d.dataAberturaExtenso}.`,
      `${d.prefeitoNome || linha()}`,
      `Prefeito Municipal`,
      `${municipioUf}`,
    ],
  });

  // 9 — ATA DA SESSÃO PÚBLICA
  secoes.push({
    titulo: `ATA DA SESSÃO PÚBLICA DA DISPENSA DE LICITAÇÃO Nº ${d.numeroDispensa}`,
    paragrafos: [
      `RELATIVO AO PROCESSO Nº ${d.numeroProcesso}`,
      `Em ${d.dataSessao}, às ${d.horarioAbertura} horas, reuniram-se o(a) Agente Municipal de Contratação e a equipe de apoio com a finalidade de verificar se estão presentes os elementos previstos na Lei Federal nº 14.133/2021 para a formalização da contratação relativa a ${d.objetoUpper.toLowerCase()}, a ser realizada por dispensa de licitação.`,
      `A sessão teve o seguinte desenvolvimento registrado, sem emendas, rasuras ou ressalvas:`,
      `1 – Justificativa: ${d.justificativa || "A justificativa foi apresentada no projeto básico/termo de referência anexo ao presente processo."}`,
      `2 – Razão da escolha do fornecedor/prestador de serviços: ${d.empresaRazaoSocial ? `A razão da escolha recaiu sobre ${d.empresaRazaoSocial}, inscrita no CNPJ sob nº ${d.empresaCnpj || "____________________"}, por apresentar a melhor proposta, capaz de atender às necessidades especificadas no objeto descrito no DFD e no Termo de Referência.` : "A definir na fase de instrução do processo."}`,
      `3 – ANÁLISE DA DOCUMENTAÇÃO: a empresa apresentou os documentos de habilitação exigidos, estando todos dentro do prazo de validade e atendendo às normas legais vigentes (CNPJ, contrato social, regularidade fiscal federal/estadual/municipal, FGTS, CNDT e demais exigências do Termo de Referência).`,
      `Pelo exposto, o Agente de Contratação deliberou que foram apresentados os elementos constantes dos artigos 72 e 74 da Lei Federal nº 14.133/2021, para contratação do:`,
      `OBJETO: ${d.objetoUpper}`,
      `EXECUTANTE: ${d.empresaRazaoSocial || "____________________"}${d.empresaCnpj ? `, inscrita no CNPJ sob nº ${d.empresaCnpj}` : ""}`,
      `VALOR: ${d.valorExtenso}`,
      `Nada mais havendo a tratar, lavrou-se a presente Ata, que depois de lida e aprovada, foi por todos assinada, e será encaminhada à autoridade competente para fins de ratificação.`,
      `${municipioUf}, ${d.dataSessao}.`,
      `${d.agenteNome || linha()}`,
      d.agenteMatricula ? `Matrícula nº ${d.agenteMatricula}` : "",
      `Agente de Contratação`,
    ].filter(Boolean),
  });

  // 10 — DESPACHO / RESULTADO DO PROCESSO
  secoes.push({
    titulo: `DESPACHO — RESULTADO DO PROCESSO Nº ${d.numeroProcesso}`,
    paragrafos: [
      `DISPENSA DE LICITAÇÃO Nº ${d.numeroDispensa}`,
      `O Poder Executivo do Município de ${municipioUf}, através do Agente de Contratação, torna público o resultado do Processo nº ${d.numeroProcesso}, Dispensa de Licitação nº ${d.numeroDispensa}, na forma que segue:`,
    ],
    tabela: {
      cabecalho: ["Nº", "Vencedor", "Item/Objeto", "Valor Total Estimado"],
      linhas: [[
        "01",
        `${d.empresaRazaoSocial || "____________________"}${d.empresaCnpj ? `, CNPJ ${d.empresaCnpj}` : ""}`,
        d.objetoUpper,
        d.valorFormatado,
      ]],
    },
  });

  secoes[secoes.length - 1].paragrafos.push(
    `Autorização da contratação: Prefeito Municipal de ${municipioUf}.`,
    `Condições: Conforme Ata de julgamento e demais documentos contidos no processo.`,
    `Publicado em: ${d.dataSessao}`,
    `${d.agenteNome || linha()}`,
    d.agenteMatricula ? `Matrícula nº ${d.agenteMatricula}` : "",
    `Agente de Contratação`,
  );

  // 11 — TERMO DE ADJUDICAÇÃO E HOMOLOGAÇÃO
  secoes.push({
    titulo: "TERMO DE ADJUDICAÇÃO E HOMOLOGAÇÃO DE DISPENSA DE LICITAÇÃO",
    paragrafos: [
      `DISPENSA ELETRÔNICA Nº ${d.numeroDispensa}`,
      `PROCESSO ADMINISTRATIVO Nº ${d.numeroProcesso} — MUNICÍPIO DE ${d.municipio.toUpperCase()}`,
      `Objeto: ${d.objetoUpper}`,
      `Empresa vencedora: ${d.empresaRazaoSocial || "____________________"}${d.empresaCnpj ? `, CNPJ ${d.empresaCnpj}` : ""}`,
      `Valor total: ${d.valorExtenso}`,
      `A empresa vencedora fica obrigada a cumprir integralmente as condições estabelecidas no contrato a ser celebrado entre as partes, nos termos da Lei nº 14.133/2021.`,
      `Autorizo a publicação deste Termo de Adjudicação e Homologação no Diário Oficial do Município e no Portal Nacional de Contratações Públicas (PNCP), para fins de publicidade e transparência, nos termos do art. 54 da Lei nº 14.133/2021.`,
      `Por fim, a autoridade municipal, no uso de suas atribuições legais e considerando a previsão orçamentária, a justificativa de contratação e o Parecer Jurídico, resolve HOMOLOGAR o resultado do processo acima especificado.`,
      `${municipioUf}, ${d.dataSessao}.`,
      `${d.prefeitoNome || linha()}`,
      `Prefeito Municipal`,
    ],
  });

  // 12 — DOTAÇÃO ORÇAMENTÁRIA (SECRETARIA DE FINANÇAS)
  secoes.push({
    titulo: `DOTAÇÃO ORÇAMENTÁRIA — PROCESSO ADMINISTRATIVO Nº ${d.numeroProcesso}`,
    paragrafos: [
      `À DEPARTAMENTO DE LICITAÇÕES E CONTRATOS`,
      `Ilmo(a). Sr(a). ${d.agenteNome || linha()}.`,
      `A Secretaria Municipal de Finanças, através de sua titular, ${d.secretarioFinancasNome || linha()}, vem informar a dotação orçamentária consignada no orçamento em vigor para a contratação do objeto relativo ao Processo Administrativo nº ${d.numeroProcesso}, conforme descrito a seguir:`,
      d.dotacaoOrcamentaria || "A detalhar pela Secretaria Municipal de Finanças (poder, órgão, unidade, elemento de despesa e fonte de recurso).",
      `${municipioUf}, ${d.dataAberturaExtenso}.`,
      `${d.secretarioFinancasNome || linha()}`,
      `Secretário(a) de Finanças`,
    ],
  });

  // 13 — PARECER JURÍDICO (PROCURADORIA)
  secoes.push({
    titulo: `PARECER JURÍDICO EM DISPENSA DE LICITAÇÃO Nº ${d.numeroDispensa}`,
    paragrafos: [
      `PROCESSO ADMINISTRATIVO Nº ${d.numeroProcesso}`,
      `Ementa: LICITAÇÃO. DISPENSA DE LICITAÇÃO. ${d.fundamentacaoLegal} ${d.objetoUpper}`,
      "RELATÓRIO",
      `Vem ao exame desta Procuradoria Jurídica, na forma do art. 72 da Lei 14.133/21, o presente processo administrativo, que visa à contratação relativa a ${d.objetoUpper.toLowerCase()}, através de Dispensa de Licitação.`,
      "FUNDAMENTAÇÃO",
      `A Constituição da República, em seu artigo 37, XXI, prevê a obrigatoriedade de licitação para as contratações realizadas pela Administração Pública, ressalvados os casos especificados em lei. A contratação direta, sem prévio certame licitatório, somente é admitida excepcionalmente, nas hipóteses trazidas na própria lei.`,
      `Analisando a contratação sob o prisma do ${d.fundamentacaoLegal}, verifica-se que o valor estimado (${d.valorFormatado}) está ${d.excedeLimite ? "ACIMA" : "dentro"} do limite de dispensa por valor vigente (${formatBRL(d.limiteLegal)}).`,
      d.excedeLimite
        ? `ALERTA: por exceder o limite legal, este processo NÃO comporta dispensa por valor nos termos do ${d.fundamentacaoLegal}, sendo necessária a adoção de modalidade licitatória regular ou fundamentação em outro inciso do art. 75.`
        : `Diante do exposto, o valor estimado é compatível com a formalização do processo de dispensa de licitação, nos termos do ${d.fundamentacaoLegal}`,
      `O processo apresenta a documentação mínima necessária para a formalização da dispensa de licitação, nos termos do art. 72 da Lei nº 14.133/2021.`,
      "CONCLUSÃO",
      d.excedeLimite
        ? `Opina-se PELA NÃO formalização do processo como dispensa de licitação por valor, ante o desatendimento ao limite legal do ${d.fundamentacaoLegal}`
        : `Opina-se pela formalização do processo de contratação direta, nos termos do ${d.fundamentacaoLegal}`,
      "É o parecer. À consideração superior.",
      `${municipioUf}, ${d.dataSessao}.`,
      `${d.procuradorNome || linha()}`,
      `Procurador(a) Geral do Município de ${d.municipio}`,
      d.procuradorOab ? `OAB nº ${d.procuradorOab}` : "",
    ].filter(Boolean),
  });

  // 14 — EXTRATO DO CONTRATO
  secoes.push({
    titulo: `EXTRATO DO CONTRATO RELATIVO AO PROCESSO Nº ${d.numeroProcesso}`,
    paragrafos: [
      `DISPENSA DE LICITAÇÃO Nº ${d.numeroDispensa}`,
      `CONTRATANTE: PREFEITURA MUNICIPAL DE ${d.municipio.toUpperCase()}`,
      `CONTRATADO: ${d.empresaRazaoSocial || "____________________"}${d.empresaCnpj ? `, inscrita no CNPJ sob nº ${d.empresaCnpj}` : ""}`,
      `CONTRATO Nº: ${d.numeroContrato}`,
      `OBJETO: ${d.objetoUpper}`,
      `RECURSO ORÇAMENTÁRIO: ${d.dotacaoOrcamentaria || "conforme indicação da Secretaria Municipal de Finanças"}`,
      `FUNDAMENTAÇÃO: a contratação está fundamentada nos pressupostos do ${d.fundamentacaoLegal}`,
      `VALOR DO CONTRATO: ${d.valorExtenso}`,
      `VIGÊNCIA: ${d.vigenciaContrato}`,
      `Amparo legal: Lei nº 14.133/21${d.decretoMunicipal ? `; ${d.decretoMunicipal}` : ""}`,
      `Processo administrativo nº ${d.numeroProcesso} — Dispensa nº ${d.numeroDispensa}`,
      `Publicado em: ${d.dataSessao}`,
      `${d.agenteNome || linha()}`,
      d.agenteMatricula ? `Matrícula nº ${d.agenteMatricula}` : "",
      `Agente de Contratação`,
    ].filter(Boolean),
  });

  // 15 — MINUTA DO CONTRATO
  secoes.push({
    titulo: `MINUTA DO CONTRATO Nº ${d.numeroContrato}`,
    paragrafos: [
      `CONTRATO DE PRESTAÇÃO DE SERVIÇOS/FORNECIMENTO, PARA A ${(d.secretariaDemandante || d.unidadeGestora).toUpperCase()}, NO MUNICÍPIO DE ${municipioUf}, E A EMPRESA ${d.empresaRazaoSocial || "____________________"}, INSCRITA NO CNPJ: ${d.empresaCnpj || "____________________"}.`,
      `Pelo presente instrumento particular, o MUNICÍPIO DE ${d.municipio.toUpperCase()}, inscrito no CNPJ sob o nº ${d.cnpjMunicipio || "____________________"}, situado na ${d.endereco || "____________________"}${d.cep ? `, CEP: ${d.cep}` : ""}${d.emailLicitacao ? `, endereço eletrônico: ${d.emailLicitacao}` : ""}, neste ato representado por seu Prefeito Municipal, o(a) Sr(a). ${d.prefeitoNome || linha()}${d.prefeitoCpf ? `, inscrito(a) no CPF sob o nº ${d.prefeitoCpf}` : ""}, doravante denominado CONTRATANTE, e de outro lado ${d.empresaRazaoSocial || "____________________"}, inscrita no CNPJ: ${d.empresaCnpj || "____________________"}, endereço: ${d.empresaEndereco || "____________________"}, neste ato representada por seu(sua) sócio(a) administrador(a), o(a) Sr(a). ${d.empresaRepresentante || "____________________"}${d.empresaRepresentanteCpf ? `, CPF: ${d.empresaRepresentanteCpf}` : ""}${d.empresaRepresentanteRg ? ` e RG: ${d.empresaRepresentanteRg}` : ""}, em observância às disposições do ${d.fundamentacaoLegal}, resolvem celebrar o presente Termo de Contrato, decorrente do Processo Administrativo nº ${d.numeroProcesso}, Dispensa de Licitação nº ${d.numeroDispensa}, mediante as cláusulas e condições a seguir enunciadas.`,
      "1. CLÁUSULA PRIMEIRA – OBJETO (ART. 92, I E II)",
      `1.1. O objeto do presente instrumento é ${d.objeto.toLowerCase() || "____________________"}, a fim de atender às necessidades da ${(d.secretariaDemandante || d.unidadeGestora)}, conforme planilha e termo de referência.`,
      "2. CLÁUSULA SEGUNDA – VIGÊNCIA E PRORROGAÇÃO",
      `2.1. O prazo de vigência da contratação é de ${d.vigenciaContrato}, contados a partir da assinatura deste instrumento.`,
      "2.1.1. A prorrogação do prazo contratual poderá ocorrer, a critério do Contratante, nos termos do art. 107 da Lei Federal nº 14.133/21.",
      "2.2. O contrato não poderá ser prorrogado quando o contratado tiver sido penalizado com declaração de inidoneidade ou impedimento de licitar e contratar com o poder público.",
      "3. CLÁUSULA TERCEIRA – DO REGIME DE EXECUÇÃO E GESTÃO CONTRATUAIS (ART. 92, IV, VII E XVIII)",
      "3.1. O regime de execução contratual, o modelo de gestão e execução, assim como os prazos e condições de conclusão, entrega, observação e recebimento do objeto constam no Termo de Referência, anexo a este Contrato.",
      "4. CLÁUSULA QUARTA – SUBCONTRATAÇÃO",
      "4.1. Não será admitida a subcontratação do objeto contratual.",
      "5. CLÁUSULA QUINTA – DOS PREÇOS E PAGAMENTO (ART. 92, V E VI)",
      `5.1. O valor total da contratação é ${d.valorExtenso}.`,
      "5.2. No valor acima estão incluídas todas as despesas ordinárias diretas e indiretas decorrentes da execução do objeto, inclusive tributos, encargos sociais, trabalhistas, previdenciários, fiscais e comerciais incidentes, taxa de administração, frete, seguro e demais custos necessários ao cumprimento integral do objeto.",
      "5.3. O pagamento será realizado em até 30 (trinta) dias subsequentes à efetiva execução do objeto, mediante apresentação da nota fiscal correspondente e certidões negativas.",
      "6. CLÁUSULA SEXTA – DOTAÇÃO ORÇAMENTÁRIA (ART. 92, VIII)",
      `6.1. As despesas decorrentes do presente contrato correrão à conta da dotação orçamentária: ${d.dotacaoOrcamentaria || "____________________"}.`,
      "7. CLÁUSULA SÉTIMA – REAJUSTE (ART. 92, V)",
      "7.1. Os preços inicialmente contratados são fixos e irreajustáveis no prazo de um ano, contado da data do orçamento estimado.",
      "7.2. Após o interregno de um ano, mediante requerimento da contratada, os preços poderão ser reajustados pelo Índice Nacional de Preços ao Consumidor (INPC-IBGE) ou outro índice oficial que venha a substituí-lo.",
      "8. CLÁUSULA OITAVA – OBRIGAÇÕES DO CONTRATANTE (ART. 92, X, XI E XIV)",
      "8.1. Receber o objeto no prazo e condições estabelecidas; prestar as informações e esclarecimentos solicitados pela contratada; notificar a contratada, em até 72 (setenta e duas) horas, sobre irregularidades na execução; acompanhar e fiscalizar a execução do contrato através de servidor especialmente designado; efetuar o pagamento nas condições estabelecidas; observar a manutenção das condições de habilitação da contratada durante toda a vigência contratual.",
      "9. CLÁUSULA NONA – OBRIGAÇÕES DO CONTRATADO (ART. 92, XIV, XVI E XVII)",
      "9.1. A Contratada deve cumprir todas as obrigações constantes no contrato, no Termo de Referência e na proposta, assumindo como exclusivamente seus os riscos e despesas decorrentes da boa e perfeita execução do objeto, inclusive encargos trabalhistas, previdenciários, fiscais e comerciais, mantendo-se, durante toda a execução, em compatibilidade com as obrigações assumidas e com as condições de habilitação exigidas na contratação.",
      "10. CLÁUSULA DÉCIMA – GARANTIA DE EXECUÇÃO (ART. 92, XII)",
      "10.1. Não haverá exigência de garantia contratual de execução.",
      "11. CLÁUSULA DÉCIMA PRIMEIRA – INFRAÇÕES E SANÇÕES ADMINISTRATIVAS (ART. 92, XIV)",
      "11.1. O descumprimento total ou parcial das obrigações assumidas sujeitará o contratado às sanções previstas nos artigos 155 a 163 da Lei nº 14.133/2021, garantidos o contraditório e a ampla defesa: advertência; multa; impedimento de licitar e contratar; declaração de inidoneidade para licitar ou contratar, observadas a natureza e a gravidade da infração.",
      "12. CLÁUSULA DÉCIMA SEGUNDA – DA EXTINÇÃO CONTRATUAL (ART. 92, XIX)",
      "12.1. A extinção contratual observará o disposto nos artigos 137 a 139 da Lei nº 14.133/2021, podendo o contrato ser alterado nos termos do art. 124 e seguintes, mediante termo aditivo, desde que haja interesse do Contratante e as devidas justificativas.",
      "13. CLÁUSULA DÉCIMA TERCEIRA – DO REEQUILÍBRIO DOS PREÇOS",
      "13.1. O pedido de restabelecimento do equilíbrio econômico-financeiro deverá ser formulado durante a vigência do contrato, nos termos do art. 107 da Lei nº 14.133/2021, e respondido em até 90 (noventa) dias.",
      "14. CLÁUSULA DÉCIMA QUARTA – DOS CASOS OMISSOS (ART. 92, III)",
      "14.1. Os casos omissos serão decididos pelo Contratante segundo as disposições da Lei nº 14.133/2021, cujas normas ficam incorporadas ao presente instrumento.",
      "15. CLÁUSULA DÉCIMA QUINTA – ALTERAÇÕES DO CONTRATO",
      "15.1. As alterações contratuais reger-se-ão pela disciplina dos artigos 124 e seguintes da Lei nº 14.133/2021, aceitando a Contratada, nas mesmas condições, acréscimos ou supressões de até 25% (vinte e cinco por cento) do valor inicial atualizado do contrato.",
      "16. CLÁUSULA DÉCIMA SEXTA – DA FISCALIZAÇÃO",
      `16.1. A fiscalização do contrato será exercida por ${d.fiscalContrato || "servidor a ser designado pela Contratante"}${d.fiscalContratoCpf ? `, CPF nº ${d.fiscalContratoCpf}` : ""}, ao qual competirá dirimir as dúvidas surgidas na execução, dando ciência à Administração de tudo que ultrapassar sua competência.`,
      "17. CLÁUSULA DÉCIMA SÉTIMA – FORO (ART. 92, §1º)",
      "17.1. Fica eleito o foro da Comarca a que pertence o Município para dirimir os litígios decorrentes da execução deste Termo de Contrato.",
      `Por estarem justos e contratados, assinam o presente instrumento em 03 (três) vias de igual teor e forma, juntamente com 02 (duas) testemunhas.`,
      `${municipioUf}, ${d.dataSessao}.`,
      `${d.prefeitoNome || linha()} — PREFEITO`,
      `PREFEITURA MUNICIPAL DE ${d.municipio.toUpperCase()} — CONTRATANTE`,
      `${d.empresaRepresentante || linha()}`,
      `Representante / Sócio(a) Administrador(a) — CONTRATADO`,
      `Testemunha 1: ${linha()} CPF: ______________________`,
      `Testemunha 2: ${linha()} CPF: ______________________`,
    ],
  });

  return secoes;
}

export function nomeArquivoProcesso(d, ext) {
  const base = `Dispensa_${d.numeroDispensa}_Processo_${d.numeroProcesso}`.replace(/[^\w\-]+/g, "_");
  return `${base}.${ext}`;
}
