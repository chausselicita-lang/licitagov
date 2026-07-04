// Agente de Dispensas — motor de montagem do processo
//
// Fonte oficial do modelo: G:\Desktop\AGENTE L.S.A (5 documentos .docx — um
// processo único de Dispensa de Licitação, Lei 14.133/2021, Prefeitura de
// Mascote/BA): "1. DEPARTAMENTO DE LICITA.docx", "2. DFD E TR DE
// DRENAGEM.docx", "3. GABINETE DO PREFEITO_Estrutura met.docx",
// "4. SECRETARIA DE FIANANÇAS_ESTRUTURA MET.docx",
// "5. PROCURADORIA MUNICIPAL_ESTRUTURA MET.docx".
//
// Estrutura, ordem das peças e frases padrão são reproduzidas literalmente
// (extraídas parágrafo a parágrafo/tabela a tabela dos 5 .docx originais).
// Somente os dados variáveis (objeto, valores, datas, nomes, números,
// endereços) são substituídos pelos dados do processo atual e da
// configuração institucional do município. Onde o modelo original cita um
// nome/decreto/dado fixo que não tem campo correspondente na configuração
// institucional deste SaaS (ex.: signatário do Setor de Compras, decreto de
// nomeação da Secretária de Finanças), a frase padrão é mantida e só o nome
// específico vira uma linha em branco para assinatura manual — nunca se
// inventa um nome ou se remove a frase.
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

// Converte uma data curta "DD/MM/AAAA" para a fórmula de ata "Aos DD dias, do
// mês de MES, do ano de AAAA" usada no modelo original (ex.: "Aos quatorze
// dias, do mês de janeiro, do ano de 2026").
function formatarAosDiasMes(dataCurta) {
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const partes = String(dataCurta || "").split("/");
  if (partes.length !== 3) return dataCurta || "";
  const [dia, mes, ano] = partes;
  const mesNome = meses[Number(mes) - 1] || mes;
  return `${Number(dia)} dias, do mês de ${mesNome}, do ano de ${ano}`;
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
// Cada seção: { titulo, paragrafos: string[], tabela?, caixas?: [{linhas}] }
// Uma entrada em `paragrafos` igual a "{{CAIXA:N}}" é um marcador — o
// renderizador (docx/pdf) desenha ali a caixa `caixas[N]` como um quadro com
// borda (reproduz as caixas de texto/objeto do modelo original), em vez de
// texto corrido.
export function buildSecoesProcesso(d) {
  const municipioUf = `${d.municipio}/${d.uf}`;
  const secoes = [];

  // ═══ DOCUMENTO 1 — "1. DEPARTAMENTO DE LICITA.docx" ═══

  // 1 — CAPA / PROTOCOLO / OBJETO / DEPARTAMENTO / ASSINATURA DO PREFEITO
  secoes.push({
    titulo: `DISPENSA DE LICITAÇÃO Nº ${d.numeroDispensa}`,
    paragrafos: [
      "{{CAIXA:0}}",
      "OBJETO",
      "{{CAIXA:1}}",
      "DEPARTAMENTO DE LICITAÇÕES E CONTRATOS:",
      "Agente de Contratação:",
      d.agenteNome || linha(),
      "Apoio:",
      d.prefeitoNome || linha(),
      "Prefeito Municipal",
      municipioUf,
    ],
    caixas: [
      { linhas: [
        `PROTOCOLO Nº ${d.numeroProcesso}`,
        `Processo Administrativo Nº ${d.numeroProcesso}`,
        `${municipioUf}, ${d.dataAberturaExtenso}`,
        "Assinatura do Responsável",
      ] },
      { linhas: [d.objetoUpper] },
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
      `Objeto: ${d.objetoUpper},`,
      `Unidade solicitante: ${d.secretariaDemandante || d.unidadeGestora}`,
      `Data de publicação: ${d.dataPublicacao}`,
      `Data de abertura: ${d.dataAbertura}`,
      `Horário de abertura: ${d.horarioAbertura}`,
      `As características da prestação de serviços são imprescindíveis para a sua escolha, conforme requerido pela ${(d.secretariaDemandante || d.unidadeGestora).toUpperCase()}, divulgação do presente aviso no sítio eletrônico da Municipal, em conformidade com o ${d.fundamentacaoLegal}`,
      `O termo de Referência e demais documentos estão disponíveis gratuitamente na, ou na sede da Prefeitura, no endereço situada a ${d.endereco || linha()}${d.cep ? `, CEP: ${d.cep}` : ""}, município de ${d.municipio}, Estado da ${d.uf === "BA" ? "Bahia" : d.uf}, a partir da data de publicação, das 08h00 às 13h00.`,
      `Maiores informações na Departamento de licitações e contratos/PMM${d.emailLicitacao ? `, pelo e-mail: ${d.emailLicitacao}` : ""}`,
      `${municipioUf}, ${d.dataPublicacao}.`,
      `${d.agenteNome || linha()}`,
      d.agenteMatricula ? `Matrícula nº ${d.agenteMatricula}` : "",
      `Agente Municipal de Contratação`,
    ].filter(Boolean),
  });

  // 3 — COMUNICAÇÃO INTERNA → SETOR DE COMPRAS (solicita estimativa de preços)
  secoes.push({
    titulo: "COMUNICAÇÃO INTERNA",
    paragrafos: [
      `DE: DLC – DEPARTAMENTO DE LICITAÇÕES E CONTRATOS`,
      `PARA: SETOR DE COMPRAS E CONTRATAÇÃO DE SERVIÇOS`,
      `Pelo presente, solicitamos deste Setor de Compras do município de ${d.municipio}, a elaboração de estimativa de preços, com a finalidade de ${d.objetoUpper}, conforme pedido de realização de despesas constante do presente processo.`,
      `${d.municipio} (${d.uf}), ${d.dataAberturaExtenso}.`,
      `${d.agenteNome || linha()}`,
      d.agenteMatricula ? `Matrícula nº ${d.agenteMatricula}` : "",
      `Agente Municipal de Contratação`,
    ].filter(Boolean),
  });

  // 4 — COMUNICAÇÃO INTERNA → SECRETARIA DE FINANÇAS (solicita dotação)
  secoes.push({
    titulo: "COMUNICAÇÃO INTERNA",
    paragrafos: [
      `DE: DLC – Departamento de Licitações e Contratos`,
      `PARA: SECRETARIA MUNICIPAL DE FINANÇAS`,
      `Através do presente, solicitamos da Secretaria Municipal de Finanças deste município de ${d.municipio}, a indicação de dotação orçamentária para contratação de empresa especializada para ${d.objetoUpper},`,
      `${d.municipio} (${d.uf}), ${d.dataAberturaExtenso}.`,
      `${d.agenteNome || linha()}`,
      d.agenteMatricula ? `Matrícula nº ${d.agenteMatricula}` : "",
      `Agente Municipal de Contratação`,
    ].filter(Boolean),
  });

  // 5 — ESTIMATIVA DE PREÇOS
  secoes.push({
    titulo: "Estimativa de Preços.",
    paragrafos: [
      `${d.municipio} – ${d.uf}, ${d.dataAberturaExtenso}`,
      `As aquisições e contratações públicas seguem, em regra, o princípio do dever de licitar, previsto no artigo 37, inciso XXI da Constituição. Porém, o comando constitucional já enuncia que a lei poderá estabelecer exceções à regra geral, com a expressão "ressalvados os casos especificados na legislação".`,
      `Dentre todas as propostas legais, está a estimativa de preços para composição de procedimento administrativo para ${d.objetoUpper},, decorrentes do controle das necessidades especificas.`,
      `Informo ainda que foram feitas pesquisas de preços de mercado, tendo apresentado preço estimado em: ${d.valorExtenso}, conforme planilha em anexo.`,
      `Desta forma, e em atenção ao disposto no art. 72, inc. II, da Lei nº 14.133/21, e conforme preconiza o art. 23, da referida lei, apresenta-se compatível com o preços praticados no mercado.`,
      `Seguem anexas, as cotações de preços elaboradas por este setor.`,
      linha(),
      `Setor de Compras/Contratação de Serviços`,
      d.portariaAgente || linha(),
    ],
  });

  // 6 — ATA DA SESSÃO PÚBLICA
  secoes.push({
    titulo: `ATA DA SESSÃO PÚBLICA DA DISPENSA DE LICITAÇÃO N. ${d.numeroDispensa}`,
    paragrafos: [
      `RELATIVO AO PROCESSO N. ${d.numeroProcesso}`,
      `Aos ${formatarAosDiasMes(d.dataSessao)}, as ${d.horarioAbertura} horas, reuniram-se a Agente municipal de contratação e a equipe de apoio com a finalidade de verificar se estão presentes os elementos previstos na Lei Federal n. 14.133/2021 para a formalização para a contratação de empresa especializada para ${d.objeto.toLowerCase()},, decorrentes do controle das necessidades especificas, a ser realizada por dispensa de licitação.`,
      `A sessão teve o seguinte desenvolvimento registrado, sem emendas, rasuras ou ressalvas:`,
      `1 – Justificativa:`,
      d.justificativa || `A justificativa foi apresentada pela ${(d.secretariaDemandante || d.unidadeGestora).toUpperCase()}, no projeto básico anexo ao presente processo.`,
      `2 – Razão da escolha do fornecedor/prestador de serviços:`,
      `A razão da escolha do prestador de serviço para executar o objeto foi apresentada projeto básico anexo ao processo, haja vista que a ${d.empresaRazaoSocial || linha()}, inscrita no CNPJ sob nº ${d.empresaCnpj || linha()}, é a empresa que apresentou a melhor proposta, capaz de atender as necessidades especificadas no objeto descrito no DFD e no Termo de Referência, atendendo assim, ao objetivo da administração, conforme comprovam as cotações, anexados ao processo.`,
      `3 – ANÁLISE DA DOCUMENTAÇÃO:`,
      `A empresa ${d.empresaRazaoSocial || linha()}, inscrita no CNPJ sob nº ${d.empresaCnpj || linha()}, apresentou os seguintes documentos de habilitação, estando todos dentro do prazo de validade e atendendo as normas legais vigentes:`,
      "• Prova de inscrição no cadastro nacional de pessoa jurídica (CNPJ) atualizado, relativo ao domicílio ou sede do licitante, pertinente e compatível com o objeto desta licitação;",
      "• Prova de existência da pessoa jurídica, através do contrato social ou documento equivalente;",
      "• Prova de regularidade com as Fazendas Federal relativa a tributos Federais e à Dívida Ativa da União e prova de regularidade perante o Instituto Nacional de Seguridade Social - INSS, através de certidão expedida conjuntamente pela secretaria da Receita Federal do Brasil – RFB e pela Procuradoria-Geral da Fazenda Nacional –PGFN, conforme portarias MF 358 e 443/2014;",
      "• Certificado de regularidade de situação perante ao Fundo de Garantia do Tempo de Serviço – FGTS ou documento equivalente que comprove a regularidade;",
      "• Certidão de regularidade com a Fazenda Estadual e Municipal referente ao domicílio da empresa;",
      "• Alvará de funcionamento, dentro do prazo de validade, emitida pela Fazenda Municipal;",
      "• Certidão Negativa de Débitos Trabalhistas (CNDT), provando a inexistência de débitos inadimplidos perante a Justiça do trabalho;",
      "• Atestado de capacidade técnica.",
      `Pelo exposto, o Agente de Contratação deliberou que foram apresentados os elementos constantes dos artigos 72 e 74 da Lei Federal n. 14.133/2021, para contratação do:`,
      `OBJETO: ${d.objeto.toLowerCase()}`,
      `EXECUTANTE: ${d.empresaRazaoSocial || linha()}, inscrita no CNPJ sob nº ${d.empresaCnpj || linha()}`,
      `VALOR: ${d.valorExtenso}`,
      `Nada mais havendo a tratar, lavrou-se a presente ATA, que depois de lida e aprovada, foi por todos assinada, e será encaminhada ao Sr. Secretário Municipal para fins de ratificação.`,
      `${municipioUf}, ${d.dataSessao}.`,
      `${d.agenteNome ? d.agenteNome.toUpperCase() : linha()}`,
      d.agenteMatricula ? `Matrícula nº ${d.agenteMatricula}` : "",
      `AGENTE DE CONTRATAÇÃO`,
      `EQUIPE DE APOIO:`,
      linha(),
      linha(),
    ].filter(Boolean),
  });

  // 7 — DESPACHO / RESULTADO DO PROCESSO
  secoes.push({
    titulo: "DESPACHO",
    paragrafos: [
      `RESULTADO DO PROCESSO N. ${d.numeroProcesso}`,
      `DISPENSA DE LICITAÇÃO N. ${d.numeroDispensa}`,
      `O Poder Executivo do Município de ${municipioUf}, através do Agente de contratação, torna público o resultado do Processo n. ${d.numeroProcesso}, Dispensa de Licitação n. ${d.numeroDispensa}, na forma que segue:`,
    ],
    tabela: {
      cabecalho: ["N.", "VENCEDOR", "ITEM/OBJETO", "VALOR TOTAL ESTIMADO R$"],
      linhas: [[
        "01",
        `${d.empresaRazaoSocial || linha()}, inscrita no CNPJ sob nº ${d.empresaCnpj || linha()};`,
        d.objeto.toLowerCase(),
        d.valorExtenso,
      ]],
    },
  });
  secoes[secoes.length - 1].paragrafosApos = [
    `Autorização da contratação: Prefeito Municipal de ${municipioUf}.`,
    `Condições: Conforme Ata de julgamento e demais documentos contidos no processo.`,
    `Publicado em: ${d.dataSessao}`,
    `${d.agenteNome ? d.agenteNome.toUpperCase() : linha()}`,
    d.agenteMatricula ? `Matrícula nº ${d.agenteMatricula}` : "",
    `AGENTE DE CONTRATAÇÃO`,
  ].filter(Boolean);

  // 8 — EXTRATO DO CONTRATO
  secoes.push({
    titulo: `EXTRATO DO CONTRATO RELATIVO AO PROCESSO N. ${d.numeroProcesso}`,
    paragrafos: [`DISPENSA DE LICITAÇÃO N.${d.numeroDispensa}`],
    tabela: {
      cabecalho: ["", ""],
      linhas: [
        ["CONTRATANTE:", `PREFEITURA MUNICIPAL DE ${d.municipio.toUpperCase()}`],
        ["CONTRATADO:", `${d.empresaRazaoSocial || linha()}, inscrita no CNPJ sob nº ${d.empresaCnpj || linha()}`],
        ["CONTRATO Nº:", d.numeroContrato],
        ["OBJETO:", d.objeto],
        ["RECURSO ORÇAMENTÁRIO:", d.dotacaoOrcamentaria || "A indicar pela Secretaria Municipal de Finanças."],
        ["FUNDAMENTAÇÃO:", `A contratação está fundamentada nos pressupostos do ${d.fundamentacaoLegal}`],
        ["VALOR DO CONTRATO:", d.valorExtenso],
        ["VIGÊNCIA:", `Até ${d.vigenciaContrato}.`],
        ["Amparo legal:", `Lei nº 14.133/21${d.decretoMunicipal ? ` | ${d.decretoMunicipal}` : ""} | Processo adm nº ${d.numeroProcesso} | Dispensa nº ${d.numeroDispensa}`],
      ],
    },
  });
  secoes[secoes.length - 1].paragrafosApos = [
    `Publicado em: ${d.dataSessao}`,
    `${d.agenteNome ? d.agenteNome.toUpperCase() : linha()}`,
    d.agenteMatricula ? `Matrícula nº ${d.agenteMatricula}` : "",
    `AGENTE DE CONTRATAÇÃO`,
  ].filter(Boolean);

  // 9 — MINUTA DO CONTRATO (texto integral das cláusulas do modelo original)
  secoes.push({
    titulo: `Minuta do CONTRATO Nº ${d.numeroContrato}`,
    paragrafos: [
      `CONTRATO DE PRESTAÇÃO DE SERVIÇOS, PARA A SECRETARIA DE ${(d.secretariaDemandante || d.unidadeGestora).toUpperCase() || linha()}, NO MUNICÍPIO DE ${municipioUf}, E A EMPRESA ${d.empresaRazaoSocial || linha()}, inscrito no CNPJ: ${d.empresaCnpj || linha()}`,
      `Pelo presente instrumento particular, o MUNICIPIO DE ${d.municipio.toUpperCase()}, inscrito no CNPJ sob o n. CNPJ: ${d.cnpjMunicipio || linha()}, situada na ${d.endereco || linha()}${d.cep ? `, CEP: ${d.cep}` : ""}${d.emailLicitacao ? `, endereço eletrônico: ${d.emailLicitacao}` : ""}, neste ato representado por seu Prefeito Municipal, o Sr. ${d.prefeitoNome || linha()}${d.prefeitoCpf ? `, inscrito no CPF sob o n° ${d.prefeitoCpf}` : ""}, doravante denominado CONTRATANTE, e de outro lado a ${d.empresaRazaoSocial || linha()}, inscrito no CNPJ: ${d.empresaCnpj || linha()}, Endereço: ${d.empresaEndereco || linha()}, neste ato representada por seu sócio administrador(a), o(a) Sr(a). ${d.empresaRepresentante || linha()}, CPF: ${d.empresaRepresentanteCpf || linha()} e RG: ${d.empresaRepresentanteRg || linha()}, conforme o Ato Constitutivo da empresa, em observância ás disposições ao ${d.fundamentacaoLegal} e demais legislações aplicais, resolvem celebrar o presente Termo de contrato, decorrente do processo administrativo n° ${d.numeroProcesso}, Dispensa de licitação n° ${d.numeroDispensa}, mediante cláusulas e condições a seguir enunciadas.`,
      "1. CLÁUSULA PRIMEIRA – OBJETO (ART. 92, I E II)",
      `O objeto do presente instrumento é a contratação de ${d.objeto || linha()}, afim de atender às necessidades da secretaria municipal de ${(d.secretariaDemandante || d.unidadeGestora).toUpperCase() || linha()} do município de ${municipioUf}, conforme planilha e termo de referência.`,
      "1.1. ESPECIFICAÇÃO E ESTIMATIVA DO OBJETO DA CONTRATAÇÃO:",
      "(planilha de itens conforme tabela do Termo de Referência anexo — ver seção 11 deste processo)",
      `(extenso) ${d.valorExtenso}`,
      "1.3. Vinculam está contratação, independentemente de transcrição:",
      "1.3.1. O Termo de Referência;",
      "1.3.2. A Proposta do Contratado;",
      "1.3.3. Eventuais anexos dos documentos supracitados.",
      "2. CLÁUSULA SEGUNDA – VIGÊNCIA E PRORROGAÇÃO",
      `2.1. O prazo de vigência da contratação é de até ${d.vigenciaContrato}, contados a partir da assinatura deste, encerrando-se em ${linha()}`,
      "2.1.1. A prorrogação do prazo contratual poderá ocorrer, a critério do Contratante, nos termos do art. 107 da Lei Federal n°. 14.133/21.",
      "2.2. O contrato não poderá ser prorrogado quando o contratado tiver sido penalizado nas sanções de declaração de inidoneidade ou impedimento de licitar e contratar com poder público, observadas as abrangências de aplicação.",
      "3. CLÁUSULA TERCEIRA – DO REGIME DE EXECUÇÃO E GESTÃO CONTRATUAIS (ART. 92, IV, VII E XVIII)",
      "3.1. O regime de execução contratual, o modelo de gestão e de execução, assim como os prazos e condições de conclusão, entrega, observação e recebimento do objeto constam no Termo de Referência, anexo a este Contrato.",
      "4. CLÁUSULA QUARTA - SUBCONTRATAÇÃO",
      "4.1. Não será admitida a subcontratação do objeto contratual.",
      "5. CLÁUSULA QUINTA – DOS PREÇOS E PAGAMENTO (ART. 92, V E VI)",
      `5.1. O valor total da contratação é ${d.valorFormatado}.`,
      `5.2 Conta para pagamento: BANCO: ${linha()}, AG: ${linha()}, CONTA: ${linha()}, TITULARIDADE: ${linha()}`,
      "5.3. No valor acima estão incluídas todas as despesas ordinárias diretas e indiretas decorrentes da execução do objeto, inclusive tributos e/ou impostos, encargos sociais, trabalhistas, previdenciários, fiscais e comerciais incidentes, taxa de administração, frete, seguro e outros necessários ao cumprimento integral do objeto da contratação.",
      "5.4. O pagamento será realizado até o dia 30 (trinta) do mês subsequente a efetiva execução do serviço, mediante a disponibilização da nota fiscal correspondente e certidões negativas.",
      "6. CLÁUSULA SEXTA – DOTAÇÃO ORÇAMENTÁRIA (ART. 92, VIII)",
      "6.1 As despesas decorrentes do presente contrato correrão à conta da dotação orçamentária número:",
      d.dotacaoOrcamentaria || linha(),
      "7. CLÁUSULA SÉTIMA - REAJUSTE (ART. 92, V)",
      "7.1. Os preços inicialmente contratados são fixos e irreajustáveis no prazo de um ano contado da data do orçamento estimado.",
      "7.2. Após o interregno de um ano, mediante requerimento da contratada, os preços iniciais serão reajustados, mediante a aplicação, pelo Contratante, do Índice Nacional de Preços ao Consumidor (INPC-IBGE) ou outro índice oficial que venha a substitui-lo, por força de determinação governamental, exclusivamente para as obrigações iniciadas e concluídas após a ocorrência da anualidade.",
      "8. CLÁUSULA OITAVA - OBRIGAÇÕES DO CONTRATANTE (ART. 92, X, XI E XIV)",
      "8.1 Receber o objeto no prazo e condições estabelecidas no Edital, especificações técnicas e seus anexos;",
      "8.2 Prestar as informações e esclarecimentos que venham a ser solicitados pela contratada, necessárias ao desenvolvimento das atividades relativas às obrigações da contratada.",
      "8.3 Notificar a CONTRATADA, imediatamente, acerca da ocorrência de eventuais irregularidades na execução dos serviços, fixando o prazo máximo de 72 (setenta e duas) horas para sua regularização;",
      "8.4 Prestar as informações e os esclarecimentos que venham a ser solicitados pelos empregados credenciados da CONTRATADA;",
      "8.5 Acompanhar e fiscalizar a execução do presente contrato, através de um funcionário especialmente designado que anotará em registro próprio todas as ocorrências relacionadas com o Contrato.",
      "8.6 Designar pessoas responsáveis pelo encaminhamento e fiscalização dos serviços ora pactuados;",
      "8.7 Efetuar o pagamento devido nas condições estabelecidas neste termo;",
      "8.8 Ordenar se for o caso, a imediata substituição de empregado da CONTRATADA que embaraçar ou dificultar a sua fiscalização;",
      "8.9 Observar para que durante toda vigência do mencionado contrato sejam mantidas todas as condições de habilitação e qualificação da CONTRATADA, exigíveis no contrato, solicitando desta, quando for o caso, a documentação que substitua aquela com prazo de validade vencida;",
      "8.10 Fornecer atestados de capacidade técnica quando solicitado, desde que atendidas as obrigações contratuais.",
      "9. CLÁUSULA NONA – OBRIGAÇÕES DO CONTRATADO (ART. 92, XIV, XVI E XVII)",
      "9.1 A Contratada deve cumprir todas as obrigações constantes no contrato, no termo de referência, seus anexos e sua proposta, assumindo como exclusivamente seus os riscos e as despesas decorrentes da boa e perfeita execução do objeto e, ainda:",
      "9.1.1.1 Carga, transporte e descarga, no local indicado, sendo que o item carga está incluso no valor de aquisição, não sendo pago como item isolado;",
      "9.1.1.2 A contratada deverá efetuar e entrega do objeto em perfeitas condições, conforme especificações e prazo constantes no Edital e seus anexos, acompanhado da respectiva nota fiscal do material, na qual constarão as indicações referentes a: marca, fabricante, modelo, procedência;",
      "9.1.1.3 A contratada deverá substituir, as suas expensas, no prazo fixado neste Termo de referência, os objetos não aceitos pela Contratante;",
      "9.1.1.4 Contratada deverá comunicar a Contratante, no prazo máximo de 24 (vinte e quatro) horas que antecede a data da entrega, os motivos que impossibilitem o cumprimento do prazo previsto, com a devida comprovação;",
      "9.1.1.5 A empresa fica obrigada a recolher assinatura e nome legível do recebedor do material no local que foi solicitado, para posterior conferência.",
      "9.1.1.6 Manter-se durante a execução do contrato, com as condições de habilitação e qualificação exigidas na licitação;",
      "9.1.1.7 Substituir as suas expensas, no total ou em parte, o objeto do contrato em que se verificarem defeitos ou incorreções;",
      "9.1.1.8 Responsabilizar-se pelos encargos trabalhistas, previdenciários, fiscais, comerciais e de transporte resultantes da execução do contrato;",
      "9.1.1.9 Responder pelos danos causados diretamente a PMM/BA ou a terceiros, decorrentes da sua culpa ou dolo na execução do contrato, não excluindo ou reduzindo essa responsabilidade de fiscalização ou acompanhamento pela contratante;",
      "9.1.1.10 É dever da CONTRATADA executar o contrato com regularidade, e quando passíveis de correção durante a execução, será aplicada a CONTRATADA advertência;",
      "9.1.1.11 A CONTRATADA poderá executar o contrato com atraso injustificado até o limite de 10 (dez) dias, após os quais será considerado como inexecução contratual: multa diária de 0,5% sobre o valor atualizado do contrato.",
      "10. CLÁUSULA DÉCIMA – GARANTIA DE EXECUÇÃO (ART. 92, XII)",
      "10.1. Não haverá exigência de garantia contratual da execução.",
      "11. CLÁUSULA DÉCIMA PRIMEIRA – INFRAÇÕES E SANÇÕES ADMINISTRATIVAS (ART. 92, XIV)",
      "11.1. Comete infração administrativa, nos termos da Lei nº 14.133, de 2021, o contratado que:",
      "a) der causa à inexecução parcial do contrato;",
      "b) der causa à inexecução parcial do contrato que cause grave dano à Administração ou ao funcionamento dos serviços públicos ou ao interesse coletivo;",
      "c) der causa à inexecução total do contrato;",
      "d) ensejar o retardamento da execução ou da entrega do objeto da contratação sem motivo justificado;",
      "e) apresentar documentação falsa ou prestar declaração falsa durante a execução do contrato;",
      "f) praticar ato fraudulento na execução do contrato;",
      "g) comportar-se de modo inidôneo ou cometer fraude de qualquer natureza;",
      "h) praticar ato lesivo previsto no art. 5º da Lei nº 12.846, de 1º de agosto de 2013.",
      "i) Incorre em infração administrativa o fornecedor que cometer quaisquer das infrações previstas no art. 155, da LEI 14.133/2021.",
      "11.2. Serão aplicadas ao contratado que incorrer nas infrações acima descritas as seguintes sanções:",
      "Advertência, quando o contratado der causa à inexecução parcial do contrato, sempre que não se justificar a imposição de penalidade mais grave (art. 156, §2º, da Lei nº 14.133, de 2021);",
      "Impedimento de licitar e contratar, quando praticadas as condutas descritas nas alíneas “b”, “c” e “d” do subitem acima deste Contrato, sempre que não se justificar a imposição de penalidade mais grave (art. 156, § 4º, da Lei nº 14.133, de 2021);",
      "Declaração de inidoneidade para licitar e contratar, quando praticadas as condutas descritas nas alíneas “e”, “f”, “g” e “h” do subitem acima deste Contrato, bem como nas alíneas “b”, “c” e “d”, que justifiquem a imposição de penalidade mais grave (art. 156, §5º, da Lei nº 14.133, de 2021).",
      "Multa:",
      "1. Moratória de 5% (cinco por cento) por dia de atraso injustificado sobre o valor da parcela inadimplida, até o limite de 30 (trinta) dias;",
      "2. Compensatória, para as infrações descritas nas alíneas “e” a “h” do subitem acima deste contrato, de 20% a 30% do valor do Contrato.",
      "3. Compensatória, para a inexecução total do contrato prevista na alínea “c” do subitem acima deste contrato, de 15% a 30% do valor do Contrato.",
      "4. Para infração descrita na alínea “b” do subitem acima deste contrato, a multa será de 10% a 20% do valor do Contrato.",
      "5. Para infrações descritas na alínea “d” do subitem acima deste contrato, a multa será de 2% a 5% do valor do Contrato.",
      "6. Para a infração descrita na alínea “a” do subitem acima deste contrato, a multa será de 5% a 10% do valor do Contrato.",
      "11.3. A aplicação das sanções previstas neste Contrato não exclui, em hipótese alguma, a obrigação de reparação integral do dano causado ao Contratante (art. 156, §9º, da Lei nº 14.133, de 2021).",
      "11.3.1. Todas as sanções previstas neste Contrato poderão ser aplicadas cumulativamente com a multa (art. 156, §7º, da Lei nº 14.133, de 2021).",
      "11.3.2. Antes da aplicação da multa será facultada a defesa do interessado no prazo de 15 (quinze) dias úteis, contado da data de sua intimação (art. 157, da Lei nº 14.133, de 2021).",
      "11.3.3. Se a multa aplicada e as indenizações cabíveis forem superiores ao valor do pagamento eventualmente devido pelo Contratante ao Contratado, além da perda desse valor, a diferença será descontada da garantia prestada ou será cobrada judicialmente (art. 156, §8º, da Lei nº 14.133, de 2021).",
      "11.3.4. Previamente ao encaminhamento à cobrança judicial, a multa poderá ser recolhida administrativamente no prazo máximo de 10 (dez) dias, a contar da data do recebimento da comunicação enviada pela autoridade competente.",
      "11.4. A aplicação das sanções realizar-se-á em processo administrativo que assegure o contraditório e a ampla defesa ao Contratado, observando-se o procedimento previsto no caput e parágrafos do art. 158 da Lei nº 14.133, de 2021, para as penalidades de impedimento de licitar e contratar e de declaração de inidoneidade para licitar ou contratar.",
      "11.5. Na aplicação das sanções serão considerados (art. 156, §1º, da Lei nº 14.133, de 2021):",
      "a) a natureza e a gravidade da infração cometida;",
      "b) as peculiaridades do caso concreto;",
      "c) as circunstâncias agravantes ou atenuantes;",
      "d) os danos que dela provierem para o Contratante;",
      "e) a implantação ou o aperfeiçoamento de programa de integridade, conforme normas e orientações dos órgãos de controle.",
      "11.6. Os atos previstos como infrações administrativas na Lei nº 14.133, de 2021, ou em outras leis de licitações e contratos da Administração Pública que também sejam tipificados como atos lesivos na Lei nº 12.846, de 2013, serão apurados e julgados conjuntamente, nos mesmos autos, observados o rito procedimental e autoridade competente definidos na referida Lei (art. 159).",
      "11.7. A personalidade jurídica do Contratado poderá ser desconsiderada sempre que utilizada com abuso do direito para facilitar, encobrir ou dissimular a prática dos atos ilícitos previstos neste Contrato ou para provocar confusão patrimonial, e, nesse caso, todos os efeitos das sanções aplicadas à pessoa jurídica serão estendidos aos seus administradores e sócios com poderes de administração, à pessoa jurídica sucessora ou à empresa do mesmo ramo com relação de coligação ou controle, de fato ou de direito, com o Contratado, observados, em todos os casos, o contraditório, a ampla defesa e a obrigatoriedade de análise jurídica prévia (art. 160, da Lei nº 14.133, de 2021).",
      "11.8. O Contratante deverá, no prazo máximo de 15 (quinze) dias úteis, contado da data de aplicação da sanção, informar e manter atualizados os dados relativos às sanções por ela aplicadas, para fins de publicidade no Cadastro Nacional de Empresas Inidôneas e Suspensas (Ceis) e no Cadastro Nacional de Empresas Punidas (Cnep), instituídos no âmbito do Poder Executivo Federal. (Art. 161, da Lei nº 14.133, de 2021) e ainda sua situação quanto a dívida ativa da união.",
      "11.9. As sanções de impedimento de licitar e contratar e declaração de inidoneidade para licitar ou contratar são passíveis de reabilitação na forma do art. 163 da Lei nº 14.133/21.",
      "11.10 Caso haja prejuízo material por parte da CONTRATADA, resultante diretamente da execução do contrato será expedida uma declaração de inidoneidade cumulada com a suspensão do direito de licitar e contratar com a Administração Pública pelo prazo de 5 anos e multa de 10 % sobre o valor atualizado do contrato.",
      "12. CLÁUSULA DÉCIMA SEGUNDA – DA EXTINÇÃO CONTRATUAL (ART. 92, XIX)",
      "12.1 A rescisão contratual dar-se-á conforme definido na Legislação pertinente.",
      "12.2. O contrato será extinto quando vencido o prazo nele estipulado, independentemente de terem sido cumpridas ou não as obrigações de ambas as partes contraentes.",
      "12.3 O contrato poderá ser extinto antes do prazo nele fixado, sem ônus para o Contratante, quando esta não dispuser de créditos orçamentários para sua continuidade ou quando entender que o contrato não mais lhe oferece vantagem.",
      "12.4 A de extinção antecipada por problema ligados a fiscalização do contrato deverá ser formalmente motivada, onde serão assegurados o contraditório e a ampla defesa, e incluído o desatendimento das determinações regularmente expedidas pelo fiscal do contrato ou por autoridade superior, conforme dispõe a Lei nº 14.133/2021, em seu artigo 137, nos casos de atraso superior a dois meses.",
      "12.5. O contrato poderá ser alterado nos casos previstos no art. 125 da Lei n.º 14.133/2021, desde que haja interesse do CONTRATANTE, com a apresentação das devidas justificativas.",
      "12.6. As alterações serão consideradas formalizadas, mediante elaboração de Termo Aditivo a este instrumento contratual.",
      "12.7 A alteração social, a modificação da finalidade ou da estrutura da empresa, falecimento do sócio administrativo não ensejará a extinção, se não restringir sua capacidade de concluir o contrato, sendo possível a sua transmissão para o (s) sucessor(es).",
      "13. CLÁUSULA DÉCIMA TERCEIRA – DO REEQUILIBRIO DOS PREÇOS",
      "13.1 O pedido de restabelecimento do equilíbrio econômico-financeiro deverá ser formulado durante a vigência do contrato e antes de eventual prorrogação nos termos do art. 107 desta Lei. E deverá ser protocolada na Secretária correspondente.",
      "13.2 Eventuais pedidos de reequilíbrio econômico deverão ser respondidos em no máximo 90 (noventa) dias, contados do protocolo de requerimento.",
      "14. CLÁUSULA DÉCIMA QUARTA – DOS CASOS OMISSOS (ART. 92, III)",
      "14.1. Os casos omissos serão decididos pelo contratante, segundo as disposições contidas na Lei nº 14.133, de 2021, cujas normas ficam incorporadas ao presente instrumento, ainda que delas não faça aqui menção expressa.",
      "15. CLÁUSULA DÉCIMA QUINTA – ALTERAÇÕES DO CONTRATO",
      "15.1. Eventuais alterações contratuais reger-se-ão pela disciplina dos arts. 124 e seguintes da Lei nº 14.133, de 2021.",
      "15.2. O Contratado é obrigado a aceitar, nas mesmas condições contratuais, os acréscimos ou supressões que se fizerem necessários, até o limite de 25% (vinte e cinco por cento) do valor inicial atualizado do contrato.",
      "15.3. As alterações contratuais deverão ser promovidas mediante celebração de termo aditivo, submetido à prévia aprovação da consultoria jurídica do contratante, salvo nos casos de justificada necessidade de antecipação de seus efeitos, hipótese em que a formalização do aditivo deverá ocorrer no prazo máximo de 1 (um) mês (art. 132 da Lei nº 14.133, de 2021).",
      "15.4. Registros que não caracterizam alteração do contrato podem ser realizados por simples apostila, dispensada a celebração de termo aditivo, na forma do art. 136 da Lei nº 14.133, de 2021.",
      "16. CLÁUSULA DÉCIMA SEXTA – DA FISCALIZAÇÃO",
      `16.1. A CONTRATANTE manterá fiscalização sobre a execução do presente contrato através do servidor ${d.fiscalContrato || linha()}, cadastrado no CPF sob o nº. ${d.fiscalContratoCpf || linha()}.`,
      "16.2 NA fiscalização competirá dirimir as dúvidas que surgirem no curso da execução do contrato, e de tudo dará ciência à Administração.",
      "16.2. As decisões e providências que ultrapassarem a competência do servidor designado para o acompanhamento e a fiscalização dos serviços deverão ser solicitadas ao gestor municipal, em tempo hábil para a adoção das medidas convenientes.",
      "17. CLÁUSULA DÉCIMA SÉTIMA – FORO (ART. 92, §1º)",
      "17.1. Fica eleito o Foro Seção Judiciária da Comarca de Camacã/BA para dirimir os litígios que decorrerem da execução deste Termo de Contrato.",
      "Por estarem justos e contratados, assinam o presente instrumento em 03 (três) vias de igual teor e forma, juntamente com 02 (duas) testemunhas que a tudo assistiram e também assinam.",
      `${d.municipio}, ${d.uf}, ${d.dataSessao}.`,
      `${d.prefeitoNome || linha()} – PREFEITO`,
      `PREFEITURA MUNICPAL DE ${d.municipio.toUpperCase()}`,
      `CONTRATANTE`,
      `${d.empresaRepresentante || linha()}`,
      `REPRESENTENTE - SÓCIO ADM`,
      `CONTRATADO`,
      `Testemunha 1: ______________________ CPF: ______________________`,
      `Testemunha 2: _______________________CPF: ______________________`,
    ],
  });

  // ═══ DOCUMENTO 2 — "2. DFD E TR DE DRENAGEM.docx" ═══

  // 10 — DOCUMENTO DE FORMALIZAÇÃO DE DEMANDA (DFD)
  secoes.push({
    titulo: "DOCUMENTO DE FORMALIZAÇÃO DE DEMANDA (DFD)",
    paragrafos: [
      "Lei Federal nº 14.133, de 01 de abril de 2021",
      "1. IDENTIFICAÇÃO DO REQUISITANTE",
      `UNIDADE REQUISITANTE: ${d.secretariaDemandante || d.unidadeGestora}`,
      "2. IDENTIFICAÇÃO DA DEMANDA",
      "I – TIPO DE CONTRATAÇÃO",
      "( x ) Serviço não continuado   (  ) Serviço continuado   (  ) Material de Consumo   (   ) Material Permanente / Equipamento",
      "II - GRAU DE PRIORIDADE:  (  ) BAIXA   (  ) MÉDIA   ( X ) ALTA",
      "III – JUSTIFICATIVA DA NECESSIDADE DA CONTRATAÇÃO",
      "Considerado o problema a ser resolvido sob a perspectiva do interesse público e o planejamento estratégico, se for o caso.",
      d.justificativa || `Considerado o problema a ser resolvido sob a perspectiva do interesse público e do planejamento estratégico municipal, a presente justificativa fundamenta a necessidade de contratação direta de empresa especializada para ${d.objeto.toLowerCase()}, com base no ${d.fundamentacaoLegal}, por dispensa de licitação.`,
      `A execução dos serviços enquadra-se nos termos da Lei nº 14.133/2021, demandando conhecimento técnico especializado, utilização de equipamentos apropriados e observância às normas técnicas aplicáveis.`,
      `A contratação direta por dispensa de licitação revela-se medida eficiente e vantajosa para a Administração Pública, considerando a urgência da demanda, a necessidade de pronta intervenção e o interesse público envolvido, assegurando os princípios da economicidade, eficiência, legalidade e planejamento, conforme disposto no art. 11 da Lei nº 14.133/2021.`,
      `Diante do exposto, resta plenamente justificada a contratação direta de empresa especializada para ${d.objeto.toLowerCase()}, como medida necessária, adequada e proporcional ao atendimento do interesse público municipal.`,
      "IV - DESCRIÇÃO DA SOLUÇÃO PRELIMINAR E QUANTIDADES A SEREM ADQUIRIDAS EM FUNÇÃO DO CONSUMO E UTILIZAÇÃO PROVÁVEIS",
      `Estima-se a contratação dos quantitativos conforme planilha de custos apresentada, no valor total de ${d.valorExtenso}.`,
      "V - PREVISÃO DE DATA EM QUE DEVE SER ASSINADO O INSTRUMENTO CONTRATUAL",
      `O contrato deverá ser assinado até dia ${d.dataAbertura}.`,
      "VI – INFORMAÇÕES ADICIONAIS",
      `6.1 Prazo de Execução: ${d.prazoExecucao || "conforme regime de execução contratual, o modelo de gestão e de execução, assim como eventual prorrogação de contrato e condições de conclusão, entrega, observação e recebimento do objeto constam no Termo de Referência, conforme descrito no contrato e seus anexos."}`,
      `6.2 Local e Horário de Entrega dos Materiais: O local e horário de entrega, deverá obedecer às demandas das secretarias demandantes e ordem de fornecimento.`,
      `6.3 Unidade e Servidor Responsável para Esclarecimentos: ${d.secretariaDemandante || d.unidadeGestora}.`,
      `6.4 Prazo para Pagamento: O pagamento será realizado em até 30 (trinta) dias, após a da apresentação da nota fiscal e certidões negativas.`,
      `6.5. Indicação do membro da equipe de planejamento e se necessário o responsável pela fiscalização: ${d.fiscalContrato || linha()}. O fiscal de contrato será indicado pela secretaria demandante, na inclusão em cláusula contratual.`,
      "VII – DEFINIÇÃO DA NECESSIDADE DE ELABORAÇÃO OU NÃO DO ETP",
      "( X) Em razão da baixa complexidade do objeto, o Estudo Técnico Preliminar e o gerenciamento de riscos poderão ser dispensados, bastando o projeto básico, nos termos da legislação vigente.",
      "(  ) Apesar de não se tratar de objeto complexo, serão necessários elaboração de Estudo Técnico Preliminar e gerenciamento de riscos da contratação;",
      "(  ) Devido à alta complexidade do objeto, serão necessários elaboração de Estudo Técnico Preliminar e gerenciamento de riscos da contratação;",
      "(  ) Devido a existência de Estudo Técnico Preliminar e o gerenciamento de riscos da contratação anterior, serão utilizados o ETP e GR do processo de n° ______/________.",
      "DOTAÇÃO:",
      d.dotacaoOrcamentaria || "A indicar pela Secretaria Municipal de Finanças.",
      "9. RESPONSABILIDADE PELA FORMALIZAÇÃO DA DEMANDA",
      "(x) DE ACORDO. Encaminhe-se à Diretoria de Planejamento, vinculada à Secretaria Municipal de Administração, para ciência, com sugestão de encaminhamento à Controladoria e Procuradoria, para prosseguimento.",
      "( ) DEMANDA NÃO AUTORIZADA. Encaminha-se a unidade demandantes para arquivamento.",
      `${municipioUf}, em ${d.dataAberturaExtenso}.`,
      linha(),
      d.secretariaDemandante || d.unidadeGestora,
    ],
  });

  // 11 — TERMO DE REFERÊNCIA
  const totalItens = d.itens.reduce((s, it) => s + (Number(it.total) || 0), 0);
  secoes.push({
    titulo: "TERMO DE REFERÊNCIA",
    paragrafos: [
      `PROCESSO ADMINISTRATIVO Nº ${d.numeroProcesso}`,
      `Informações Básicas`,
      `Número do processo: ${d.numeroProcesso}`,
      `Secretaria solicitante: ${d.secretariaDemandante || d.unidadeGestora}`,
      "DEFINIÇÃO DO OBJETO:",
      "{{CAIXA:0}}",
      "DO AMPARO LEGAL:",
      `O presente Termo de Referência encontra-se consubstanciado na Lei Federal nº 14.133/2021 de 1º de abril de 2021 e suas alterações${d.decretoMunicipal ? ` e ${d.decretoMunicipal}` : ""}.`,
      "JUSTIFICATIVA:",
      d.justificativa || `Trata-se de Termo de Referência destinado à contratação de empresa especializada para ${d.objeto.toLowerCase()}, visando atender à demanda da ${d.secretariaDemandante || d.unidadeGestora}.`,
      `A contratação direta por dispensa de licitação, com fundamento no ${d.fundamentacaoLegal}, mostra-se juridicamente possível e administrativamente vantajosa, uma vez que o valor estimado da contratação encontra-se dentro do limite legal vigente, conforme demonstrado na planilha orçamentária elaborada com base em referências oficiais.`,
      `Além disso, a adoção da dispensa de licitação confere maior celeridade ao atendimento da demanda, assegurando a eficiência administrativa, a economicidade e o atendimento ao interesse público, nos termos do art. 11 da Lei nº 14.133/2021.`,
      "DA EXECUÇÃO",
      "Os serviços objeto deste termo de referência serão executados de forma imediata, sendo aferidos e pagos em parcelas regulares e mensais, condicionado ao boletim de medição, a emissão de nota fiscal ou documento compativel e certidões negativas habilitatórias.",
      "Os serviços que não corresponderem às exigências qualitativas e quantitativas, poderão ser rejeitadas pela administração, devendo ser substituídos de forma imediata, às custas do prestador, quando for o caso, sem prejuízo da aplicação das penalidades.",
      "O recebimento provisório ou definitivo não excluirá a responsabilidade civil pela solidez e pela segurança do fornecimento nem a responsabilidade ético-profissional pela perfeita execução do contrato.",
      "FORMA E CRITÉRIOS DE SELEÇÃO DO FORNECEDOR E FORMA DE FORNECIMENTO",
      "O fornecedor será selecionado por meio da realização de procedimento de LICITAÇÃO, na modalidade DISPENSA, com adoção do critério de julgamento pelo MENOR PREÇO.",
      "O objeto da contratação será em LOTE ÚNICO, com o critério de julgamento por MENOR PREÇO, por ser a opção mais vantajosa, uma vez que proporciona economia de recursos, simplificação administrativa, transparência, controle, gestão de riscos e facilidade de planejamento, contribuindo para uma gestão pública eficiente e responsável.",
      "QUANTO A CONCORRÊNCIA:",
      `Poderão participar do processo licitatório os interessados cujo ramo de atividade seja compatível com o objeto desta licitação, e que manifeste interesse, seja presencialmente (na sede da administração pública do município) ou de forma on-line no e-mail: ${d.emailLicitacao || linha()} e ainda, atenderem todas as exigências constantes neste termo de referência e seus anexos, inclusive quanto à documentação.`,
      "DA PUBLICAÇÃO:",
      `O termo de Referência e demais documentos estão disponíveis gratuitamente na, ou na sede da Prefeitura, no endereço situada a ${d.endereco || linha()}${d.cep ? `, CEP: ${d.cep}` : ""}, município de ${d.municipio}, Estado da ${d.uf === "BA" ? "Bahia" : d.uf}, a partir da data de publicação, das 08h00 às 13h00;`,
      `Maiores informações na Comissão Permanente de Contratação/PMM${d.emailLicitacao ? `, pelo e-mail: ${d.emailLicitacao}` : ""}`,
      "ESPECIFICAÇÕES e ESTIMATIVAS DOS ITENS",
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
        ["", "", "", "", "Total", formatBRL(totalItens || d.valorEstimado)],
      ],
    } : null,
    caixas: [
      { linhas: [`${d.objetoUpper}, CONFORME PLANILHA DE CUSTOS, ESPECIFICAÇÕES TÉCNICAS E CONDIÇÕES ESTABELECIDAS NESTE TERMO DE REFERÊNCIA.`] },
    ],
  });
  secoes[secoes.length - 1].paragrafosApos = [
    `* Os valores de referência foram obtidos com base em pesquisas de preços de mercado na fase interna do procedimento administrativo, através do painel de preços e o valor estimado a ser contratado é de ${d.valorExtenso}`,
    "11. DIREITOS E RESPONSABILIDADES DAS PARTES E PENALIDADES CABIVEIS DAS:",
    "11.1 - OBRIGAÇÕES DA CONTRATADA",
    "Além das obrigações descritas no aviso e neste Termo de referência, são ainda obrigações da contratada:",
    "A CONTRATADA: obriga-se a proceder o fornecimento dos produtos objeto do processo licitatório, em compatibilidade com as obrigações por ela assumidas e manter todas as condições de habilitação e qualificação exigidas na licitação. À CONTRATADA caberá a responsabilidade total fornecimento dos produtos objeto do processo licitatório. A CONTRATADA deverá comunicar ao CONTRATANTE as alterações que forem efetuadas em seu contrato social.",
    "A CONTRATADA é responsável pela segurança do trabalho de seus funcionários e pelos atos por eles praticados. É de sua responsabilidade, ainda, eventuais danos pessoais e materiais causados a terceiros durante o transporte e descarga dos produtos no local da entrega.",
    "Executar fielmente o objeto dentro do melhor padrão de qualidade, de forma que os serviços a serem executados mantenham todas as especificações técnicas e qualidades exigidas pelo Tribunal de Contas do Estado da Bahia, Tribunal de Contas da União e demais normas do direito financeiro, cumprindo todas as especificações estabelecidas neste Termo de Referência;",
    "i) Fornecer mão-de-obra profissional qualificada e inscrita junto ao Conselho Profissional competente;",
    "j) Assumir todas as despesas relativas à pessoal e quaisquer outras oriundas, derivadas ou conexas com o contrato, tais como: salários, encargos sociais e trabalhistas e eventuais passivos, impostos, alimentação do seu pessoal, deslocamentos de funcionários, equipamentos de proteção individual e coletiva, tributos, seguros, taxas e serviços, licenças em repartições públicas, registros, autenticações do contrato, etc., e ficando, ainda, para todos os efeitos legais, declarada pela contratada a inexistência de qualquer vínculo empregatício entre seus empregados e/ou prepostos e a contratante;",
    "k) Responsabilizar-se por todas e quaisquer despesas decorrentes de impostos, despesas com mão de obra, encargos sociais, trabalhistas, previdenciários, fiscais e comerciais, taxas, seguros e outras despesas que incidam direta ou indiretamente na execução dos serviços objeto deste instrumento;",
    "l) Utilizar de forma privativa e confidencial, os documentos fornecidos pelo CONTRATANTE para a execução do Contrato;",
    "Submeter-se à fiscalização por parte do CONTRATANTE, acatando as determinações e especificações contidas neste Termo;",
    "m) Responsabilizar-se pelo bom comportamento do seu pessoal, podendo o Contratante exigir a imediata substituição de profissional cuja permanência julgar inconveniente;",
    "n) Prestar esclarecimentos a CONTRATANTE sobre eventuais atos ou fatos noticiados que a envolvam, independente de solicitação;",
    "o) Os serviços contratados, caso não satisfaçam à Fiscalização da CONTRATANTE, serão impugnados, cabendo à Contratada todo o ônus decorrente de sua ré execução direta, além das responsabilidades contratuais;",
    "p) Aceitar, nas mesmas condições contratuais, os acréscimos ou supressões em até 25% (vinte e cinco por cento) do valor inicial do contrato, conforme estabelece o art. 125, da Lei nº 14.133/2021;",
    "q) Emitir Nota Fiscal de Serviços e certidões negativa quanto ao FGTS, INSS, Fazenda estadual, Fazenda Municipal, bem como trabalhista (CNDT), a fim de demonstrar sua regularidade, para qualquer recebimento a ser pago pela CONTRATANTE;",
    "r) Responsabilizar-se por eventuais danos causados diretamente à CONTRATANTE ou a terceiros, decorrentes de culpa ou dolo na execução dos serviços, não excluindo ou reduzindo tal responsabilidade a fiscalização ou acompanhamento da Administração;",
    "s) Assumir integral responsabilidade pela direção e supervisão dos trabalhos garantindo a execução dos serviços de acordo com as condições ajustadas;",
    "t) Comunicar verbalmente, de imediato, e confirmar por escrito à CONTRATANTE, no prazo máximo de 10 (dez) dias, a ocorrência de qualquer fato impeditivo a execução dos serviços, com a devida comprovação;",
    "u) Assumir inteira responsabilidade civil, administrativa e penal por quaisquer danos e prejuízos materiais ou pessoais causados diretamente ou por seus empregados ou prepostos, à contratante ou a terceiros.",
    "11.2 – DAS OBRIGAÇÕES DA CONTRATANTE",
    "O CONTRATANTE: poderá solicitar à CONTRATADA, a qualquer momento, que comprove que os produtos entregues possuem registro no órgão competente. A CONTRATANTE deverá zelar pelo bom uso e o devido armazenamento dos produtos.",
    "O contratante deverá designar fiscal do contrato ou respectivo substituto (Lei n.º 14.133, de 2021, art. 117, caput), a fim de acompanhar a execução do contrato, para que sejam cumpridas todas as condições estabelecidas, de modo a assegurar os melhores resultados para a Administração, com a conferência das notas fiscais e das documentações exigidas para o pagamento e, após o ateste, que certifica o recebimento provisório, encaminhar ao gestor de contrato para ratificação.",
    "b) Prestar as informações e esclarecimentos que venham a ser solicitados pela contratada, necessárias ao desenvolvimento das atividades relativas às obrigações da contratada.",
    "c) Notificar a CONTRATADA, imediatamente, acerca da ocorrência de eventuais irregularidades na execução dos serviços, fixando o prazo máximo de 72 (setenta e duas) horas para sua regularização;",
    "d) Prestar as informações e os esclarecimentos que venham a ser solicitados pelos empregados credenciados da CONTRATADA;",
    "e) Acompanhar e fiscalizar a execução do presente contrato, através de um funcionário especialmente designado que anotará em registro próprio todas as ocorrências relacionadas com o Contrato.",
    "f) Efetuar o pagamento devido nas condições estabelecidas neste termo;",
    "g) Ordenar se for o caso, a imediata substituição de empregado da CONTRATADA que embaraçar ou dificultar a sua fiscalização;",
    "h) Observar para que durante toda vigência do mencionado contrato sejam mantidas todas as condições de habilitação e qualificação da CONTRATADA, exigíveis no contrato, solicitando desta, quando for o caso, a documentação que substitua aquela com prazo de validade vencida;",
    "i) Fornecer atestados de capacidade técnica quando solicitado, desde que atendidas as obrigações contratuais;",
    "j) Rejeitar, em todo ou em parte, os produtos em desacordo com o contrato.",
    "12 – DO RECEBIMENTO E PAGAMENTO DOS ITENS",
    "O objeto contratado será recebido e fiscalizado, no ato da entrega, por fiscal, designado para este fim, que procederá à conferência de sua conformidade com o pedido. Caso não haja qualquer impropriedade explícita, será atestado esse recebimento, assinando-se o canhoto do respectivo documento fiscal de entrega. As decisões e providências que ultrapassarem a competência do agente fiscalizador serão solicitadas à autoridade competente do contratante, para adoção das medidas convenientes, consoante disposto no Art. 117, § 1° da Lei n° 14.133/2021.",
    "A fiscalização da contratação será exercida por um representante da administração, designado pelo agente de contratação, ao qual competirá dirimir as dúvidas que surgirem no curso da execução do contrato, e de tudo dará ciência à Administração.",
    "12.1 DA LIQUIDAÇÃO DO PAGAMENTO",
    `O pagamento será efetuado em até 30 (trinta) dias subsequente ao fornecimento, por meio de ordem bancária, para crédito em conta indicado pelo contratado, condicionada a emissão da Nota Fiscal e a certificação da ${d.secretariaDemandante || d.unidadeGestora} que fiscalizará a execução do Contrato.`,
    "Havendo erro na apresentação da Nota Fiscal/Fatura ou dos documentos pertinentes à contratação, ou, ainda, circunstância que impeça a liquidação da despesa, o pagamento ficará sobrestada até que a Contratada providencie as medidas saneadoras. Nesta hipótese, o prazo para pagamento iniciar-se-á após a comprovação da regularização da situação, não acarretando qualquer ônus para a Contratante.",
    "13 - DESCRIÇÃO DA SOLUÇÃO COMO UM TODO CONSIDERADO O CICLO DE VIDA DO OBJETO E ESPECIFICAÇÃO DO PRODUTO.",
    "Todos os materiais empregados deverão possuir garantia mínima de 12 (doze) meses contra defeitos de fabricação, certificações de qualidade e conformidade com padrões internacionais, assegurando durabilidade, confiabilidade e compatibilidade com as melhores práticas de mercado, conforme exigências do art. 40, §1º, inciso X, da Lei nº 14.133/2021, que determina a especificação completa do objeto a ser contratado.",
    "14 – DA VIGÊNCIA",
    `Os preços vigorarão pelo prazo de até ${d.vigenciaContrato}, a partir da data de sua assinatura, podendo ainda, ser prorrogado, observando as diretrizes dos artigos 106 e 107 da Lei 14.133/2021, se for vantajoso para a administração pública, permitida a negociação com o contratado ou a extinção deste, sem ônus para qualquer das partes.`,
    "O contrato poderá ser rescidido, de forma unilateral, conforme interesse da Administração Pública., a qualquer tempo.",
    "15 - DA GARANTIA",
    "A empresa deverá estar devidamente constituída e em pleno funcionamento, garantindo assim a capacidade de honrar integralmente os compromissos assumidos e contratados.",
    "A realização dos serviços será por meio de estrutura própria ou parceiro autorizado, efetuando manutenção preventiva ou corretiva, para evitar descontinuidade da prestação do serviço, e mantido durante todo o período de validade do contrato.",
    "16 – DA ALTERAÇÃO DO CONTRATO",
    "a) O contrato originário deste processo, poderá ser alterado nos casos previstos no art. 124 Lei Federal 14.133/2021, desde que haja interesse do CONTRATANTE, com a apresentação das devidas justificativas.",
    "b) A CONTRATADA ficará obrigada a aceitar, nas mesmas condições deste contrato, acréscimos ou supressões na execução do objeto da presente licitação, de até 25% (vinte e cinco por cento) do valor inicial atualizado do contrato, conforme art. 125 Lei Federal 14.133/2021.",
    "17 - DA SUBCONTRATAÇÃO",
    "a) Não será admitida a subcontratação do objeto licitatório.",
    "18 – DA DOTAÇÃO ORÇAMENTÁRIA",
    d.dotacaoOrcamentaria || "A indicar pela Secretaria Municipal de Finanças.",
    "19 – DA FISCALIZAÇÃO",
    "Será designado fiscal de contrato, pela secretaria demandante, para exercer ampla, irrestrita e permanente fiscalização dos serviços contratados.",
    "20 - DISPOSIÇÕES GERAIS",
    "A CONTRATADA é obrigada a fornecer o objeto deste Contrato, de acordo com as normas técnicas reguladoras, em estreita observância às legislações federal, estadual e municipal, bem como, a quaisquer ordens ou determinação do Poder Público, procurando – dentro do possível – conduzir os serviços e o pessoal de modo a formar, perante o público, uma boa imagem da CONTRATANTE e da própria CONTRATADA.",
    "No preço proposto deverão estar compreendidos todos os custos relativos aos encargos fiscais e parafiscais que possam interferir na composição dos preços, bem como outros custos indiretos.",
    "Em nenhuma hipótese e por quaisquer motivos a contratada poderá suspender a execução do serviço, salvo no caso de atrasos no pagamento superior a 2 (dois) meses, contados da recebimento da nota fiscal, isenta de pendências, pelo setor competente da administração.",
    "Nenhum pagamento será efetuado à contratada enquanto pendente de liquidação qualquer obrigação financeira que lhe for imposta, em virtude de penalidade ou inadimplência, a qual poderá ser compensada com o pagamento pendente, sem que isso gere direito a acréscimos de qualquer natureza ou mesmo direito de suspensão do serviço referidos no parágrafo anterior.",
    "Os casos omissos do presente instrumento serão solucionados pelo gestor do contrato.",
    "Em virtude das atribuições que competem, aprovo o presente.",
    `${d.municipio} (${d.uf}), ${d.dataAberturaExtenso}.`,
    d.secretariaDemandante || d.unidadeGestora,
  ];

  // ═══ DOCUMENTO 3 — "3. GABINETE DO PREFEITO_Estrutura met.docx" ═══

  // 12 — AUTUAÇÃO E AUTORIZAÇÃO PARA ABERTURA DE PROCEDIMENTO ADMINISTRATIVO
  secoes.push({
    titulo: "AUTUAÇÃO E AUTORIZAÇÃO PARA ABERTURA DE PROCEDIMENTO ADMINISTRATIVO",
    paragrafos: [
      `DETERMINO A AUTUAÇÃO do Processo Administrativo sob o nº ${d.numeroProcesso} de ${d.dataAberturaExtenso}, cujo objeto resumido é a de contratação de empresa especializada para ${d.objeto.toLowerCase()}, conforme planilha e termo de referência.`,
      `AUTORIZO a abertura do Procedimento em tempo que determino a tomada imediata de ações, conforme segue:`,
      `Notifique-se o Departamento de licitações e contratos, na pessoa da Agente de Contratação a Srª. ${d.agenteNome || linha()} para que adote as medidas cabíveis com a finalidade de efetuar a contratação referente ao Processo Administrativo em epígrafe, inclusive expedindo aviso de dispensa para convocação para interessados apresentarem suas propostas no prazo de ${d.prazoPropostaDias} dias, nos termos do artigo 72, § único da lei 14.133/21.`,
      `Segue anexo o pedido do ${d.secretariaDemandante || d.unidadeGestora}, com as devidas justificativas, salientando-se que há a necessidade de celeridade nas ações para o atendimento na demanda solicitada.`,
      `O Departamento de Licitações e Contratos fica, desde já, autorizada a dar sequência no procedimento, de maneira a garantir a concretização da contratação para atendimento da finalidade a que se propõe.`,
      `${d.municipio} (${d.uf}), ${d.dataAberturaExtenso}.`,
      `${d.prefeitoNome || linha()}`,
      `Prefeito Municipal`,
      `${municipioUf}`,
    ],
  });

  // 13 — DESPACHO/AUTORIZAÇÃO DE CONTRATAÇÃO (PREFEITO)
  secoes.push({
    titulo: `DESPACHO/AUTORIZAÇÃO DE CONTRATAÇÃO DECORRENTE DO PROCESSO ${d.numeroProcesso}`,
    paragrafos: [
      `DISPENSA DE LICITAÇÃO N° ${d.numeroDispensa}`,
      `O Prefeito Municipal de ${d.municipio}, no uso das suas atribuições que lhes confere o inciso VIII do artigo 72 da Lei nº 14.133/2021, AUTORIZA a contratação, conforme o resultado do processo na forma que segue:`,
    ],
    tabela: {
      cabecalho: ["N.", "VENCEDOR", "ITEM/OBJETO", "VALOR TOTAL ESTIMADO R$"],
      linhas: [[
        "01",
        `${(d.empresaRazaoSocial || linha()).toUpperCase()} CNPJ: ${d.empresaCnpj || linha()}`,
        `CONTRATAÇÃO DE EMPRESA ESPECIALIZADA PARA ${d.objetoUpper}.`,
        d.valorExtenso.toUpperCase(),
      ]],
    },
  });
  secoes[secoes.length - 1].paragrafosApos = [
    `O processo foi instruído com os documentos e requisitos que comprovam que o contratado possui habilitação e qualificação mínima para celebrar o contrato, conforme preconizado no artigo 72 da Lei Federal 14.133/2021;`,
    `Prefeitura Municipal de ${municipioUf}, ${d.dataSessao}`,
    `${d.prefeitoNome || linha()}`,
    `Prefeito Municipal`,
    `${municipioUf}`,
    `PREFEITURA MUNICIPAL DE ${d.municipio.toUpperCase()}`,
    d.cnpjMunicipio ? `CNPJ Nº: ${d.cnpjMunicipio}` : "",
  ].filter(Boolean);

  // 14 — TERMO DE ADJUDICAÇÃO E HOMOLOGAÇÃO DE DISPENSA DE LICITAÇÃO
  secoes.push({
    titulo: "TERMO DE ADJUDICAÇÃO E HOMOLOGAÇÃO DE DISPENSA DE LICITAÇÃO",
    paragrafos: [
      `DISPENSA ELETRÔNICA Nº ${d.numeroDispensa}`,
      `PROCESSO ADM: Nº ${d.numeroProcesso} - MUNICIPIO DE ${d.municipio.toUpperCase()}`,
    ],
    tabela: {
      cabecalho: ["", ""],
      linhas: [
        ["Objeto:", d.objetoUpper],
        ["Empresa vencedora:", `${d.empresaRazaoSocial || linha()} CNPJ: ${d.empresaCnpj || linha()}`],
        ["Endereço:", d.empresaEndereco || linha()],
        ["Valor total:", d.valorExtenso],
      ],
    },
  });
  secoes[secoes.length - 1].paragrafosApos = [
    `A empresa vencedora fica obrigada a cumprir integralmente as condições estabelecidas no contrato que será celebrado entre as partes, nos termos da Lei nº 14.133/2021, bem como a executar o objeto adjudicado nos termos e prazos estipulados.`,
    `Autorizo a publicação deste Termo de Adjudicação e Homologação para Dispensa Eletrônica no Diário Oficial do Município e no Portal Nacional de Contratações Públicas - PNCP, para fins de publicidade e transparência, nos termos do artigo 54 da Lei nº 14.133/2021.`,
    `Por fim, a autoridade municipal do órgão, MUNICIPIO DE ${d.municipio.toUpperCase()}, no uso de suas atribuições legais e considerando a necessidade de contratação de empresa para fornecimento do objeto em epígrafe, a previsão orçamentaria, a existência de saldo atestado pelo setor competente, a justificativa de contratação e o Parecer Jurídico e demais documentos da empresa vencedora (apensados nos autos), resolve HOMOLOGAR o resultado dos trabalhos apresentados pelo Departamento no atendimento ao objeto do processo licitatório acima especificado.`,
    `${municipioUf}, ${d.dataSessao}.`,
    `${d.prefeitoNome || linha()}`,
    `Prefeito Municipal`,
  ];

  // ═══ DOCUMENTO 4 — "4. SECRETARIA DE FIANANÇAS_ESTRUTURA MET.docx" ═══

  // 15 — DOTAÇÃO ORÇAMENTÁRIA (SECRETARIA DE FINANÇAS)
  secoes.push({
    titulo: `REFERÊNCIA: PROCESSO ADMINISTRATIVO Nº. ${d.numeroProcesso}`,
    paragrafos: [
      `À DEPARTAMENTO DE LICITAÇÕES E CONTRATOS`,
      `ILMO. SR. ${(d.agenteNome || linha()).toUpperCase()}.`,
      `A Secretaria Municipal de Finanças, através da sua titular, ${d.secretarioFinancasNome || linha()}, vem informar a dotação orçamentária consignada no orçamento em vigor para contratação do objeto relativo ao Processo Administrativo nº. ${d.numeroProcesso}, conforme descrito a seguir:`,
      d.dotacaoOrcamentaria || "A detalhar pela Secretaria Municipal de Finanças (poder, órgão, unidade, elemento de despesa e fonte de recurso).",
      `${municipioUf}, ${d.dataAberturaExtenso}.`,
      linha(),
      d.secretarioFinancasNome || linha(),
      `Secretária de Finanças`,
    ],
  });

  // ═══ DOCUMENTO 5 — "5. PROCURADORIA MUNICIPAL_ESTRUTURA MET.docx" ═══

  // 16 — PARECER JURÍDICO (PROCURADORIA)
  secoes.push({
    titulo: `PARECER JURÍDICO EM DISPENSA DE LICITAÇÃO Nº ${d.numeroDispensa}`,
    paragrafos: [
      `PROCESSO ADMINISTRATIVO Nº. ${d.numeroProcesso}`,
      "PARECER JURÍDICO",
      `Ementa: LICITAÇÃO. DISPENSA DE LICITAÇÃO. ${d.fundamentacaoLegal} contratação de empresa especializada para ${d.objeto.toLowerCase()}, conforme planilha e termo de referência, decorrentes do controle das necessidades especificas.`,
      "RELATÓRIO",
      `Vem ao exame dessa Procuradoria Jurídica, na forma do art. 72 da Lei 14.133/21, o presente processo administrativo, que visa à contratação da empresa ${(d.empresaRazaoSocial || linha()).toUpperCase()} CNPJ: ${d.empresaCnpj || linha()}, atraves de Dispensa de Licitação, para atender as necessidades das Secretarias de ${d.secretariaDemandante || d.unidadeGestora} do Município de ${municipioUf}, conforme constante na justificativa da contratação.`,
      "FUNDAMENTAÇÃO",
      "Sabe-se que o Parecer Jurídico em Processos Licitatórios cumpre a função de análise à legalidade do procedimento, bem como os pressupostos formais da contratação, ou seja, avaliar a compatibilidade dos atos administrativos produzidos no processo de contratação pública com o sistema jurídico vigente. Desta forma, a conveniência da realização de determinada contratação fica a cargo do Gestor Público, ordenador das despesas.",
      "A Constituição da República, em seu artigo 37, XXI, prevê a obrigatoriedade de licitação para as contratações realizadas pela Administração Pública:",
      "XXI - ressalvados os casos especificados na legislação, as obras, serviços, compras e alienações serão contratados mediante processo de licitação pública que assegure igualdade de condições a todos os concorrentes, com cláusulas que estabeleçam obrigações de pagamento, mantidas as condições efetivas da proposta, nos termos da lei, o qual somente permitirá as exigências de qualificação técnica e econômica indispensáveis à garantia do cumprimento das obrigações.",
      "A obrigatoriedade da realização do procedimento licitatório é um corolário do princípio constitucional da isonomia, previsto na Constituição Federal de 1988 (art. 5º, I), pelo qual, todos devem receber tratamento igual pelo Estado.",
      "Evita-se, desse modo que os parceiros sejam escolhidos por critérios de amizade pessoal e outros interesses que não o da consecução da finalidade pública. Assim, o objeto imediato e próprio da licitação é evitar a ocorrência do arbítrio e do favoritismo. Segundo o constitucionalista Alexandre de Morais, “a licitação representa, portanto, a oportunidade de atendimento ao interesse público, pelos particulares, numa situação de igualdade”.",
      "Sempre que haja possibilidade de concorrência, sem prejuízo ao interesse público, deverá haver licitação. A contratação direta, sem realização do prévio certame licitatório, somente é admitida excepcionalmente, nas hipóteses trazidas na própria lei. Tais situações, contudo, configuram-se em exceções à regra geral. A licitação é regra; a contratação direta, exceção.",
      `Sobre referida contratação, primeiramente, é preciso analisar sob o prisma do ${d.fundamentacaoLegal}, in verbis:`,
      "“Art. 75. É dispensável a licitação:",
      "(...)",
      d.fundamentacaoLegal.includes("inciso I,")
        ? "I - para contratação que envolva valores inferiores a R$ 100.000,00 (cem mil reais), no caso de obras e serviços de engenharia ou de serviços de manutenção de veículos automotores;"
        : "II -  para contratação que envolva valores inferiores a R$ 50.000,00 (cinquenta mil reais), no caso de outros serviços e compras;",
      `O Decreto Federal nº 12.807, de 2025 atualizou os valores estabelecidos na Lei nº 14.133/2021, ${d.fundamentacaoLegal}, estabelecendo o referido limite para ${formatBRL(d.limiteLegal)}.`,
      "Diante da atualização promovida pela nova lei federal, o valor teto, para formalização do presente processo, foi reajustado, ou seja, analisando do ponto de vista estritamente jurídico e considerando a necessidade de contratação do serviço, vislumbra-se a possibilidade de aplicação do novo dispositivo para formalização de processo de dispensa, já que não há, neste momento vedação para seu uso.",
      "Outrossim, também se observa que o processo formalizado também atende as regras do art. 72 da Lei nº 14.133/2021, pois, apresenta a documentação mínima necessário para a formalização da dispensa de licitação. No entanto, é preciso que o gestor público, quando da escolha e da evidente necessidade de contratação, tome os cuidados necessários, para que referida contratação não exceda o valor de mercado (dentro da razoabilidade) e que sejam respeitados os princípios da legalidade, impessoalidade, moralidade, publicidade e eficiência (art. 37, CF/88).",
      `Mister reiterar que não cabe a assessoria jurídica avaliar critérios de vantagem e conveniência na referida contratação, pois, trata-se de prerrogativas exclusivas da gestão pública, dessa forma, desde que o entendimento o interesse público e as demais orientações técnicas apresentadas, entendo que a contratação poderá ser efetivada, de forma direta, tendo em vista que, a referida contratação enquadra-se nas hipóteses de dispensa de licitação, definida no ${d.fundamentacaoLegal}`,
      "O presente parecer é prestado sob o prisma estritamente jurídico, não competindo a essa assessoria jurídica adentrar no mérito da conveniência e oportunidade dos atos praticados pelos gestores públicos.",
      "Ademais, conforme acostados ao processo, o gestor demonstrou o cumprimento dos princípios atinentes à licitação, principalmente os da impessoalidade, moralidade, probidade e julgamento objetivo, além das exigências gerais previstas na Lei nº 14.133/21.",
      "Por fim, interessante e prudente que conste do contrato a ser celebrado que ambas as partes – contratante e contratada – devem cumprir e respeitar, durante toda a vigência do contrato, o que dispõe no § 1º do artigo 37 da Constituição Federal.",
      "CONCLUSÃO",
      d.excedeLimite
        ? `ALERTA: por exceder o limite legal, este processo NÃO comporta dispensa por valor nos termos do ${d.fundamentacaoLegal}, sendo necessária a adoção de modalidade licitatória regular ou fundamentação em outro inciso do art. 75 — este parecer não pode opinar pela formalização nas condições atuais.`
        : `Uma vez adotadas as providências assinaladas e se abstendo da apreciação dos aspectos inerentes à conveniência e oportunidade mencionados acima, opina-se pela formalização do processo de contratação direta, nos termos do ${d.fundamentacaoLegal}`,
      "É o parecer. À consideração superior.",
      `${municipioUf}, ${d.dataSessao}.`,
      d.procuradorNome || linha(),
      `Procurador Geral do Município de ${d.municipio}`,
      d.procuradorOab ? `OAB-${d.uf} nº ${d.procuradorOab}` : "",
    ].filter(Boolean),
  });

  return secoes;
}

export function nomeArquivoProcesso(d, ext) {
  const base = `Dispensa_${d.numeroDispensa}_Processo_${d.numeroProcesso}`.replace(/[^\w\-]+/g, "_");
  return `${base}.${ext}`;
}
