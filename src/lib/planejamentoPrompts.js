// Planejamento Assistido por IA — prompts de geração em cascata (Lei 14.133/2021).
// Cada peça é gerada 100% no client, via anthropicFetch -> /api/claude,
// no mesmo padrão já usado pelo LexCore (ver App.jsx: LexcoreNova/analisar).
//
// max_tokens por peça (testado empiricamente — ETP tem 13 seções e trunca
// em 4096; usar sempre a constante correspondente na chamada ao Claude):
export const DFD_MAX_TOKENS = 4096;
export const ETP_MAX_TOKENS = 8192;
export const TR_MAX_TOKENS = 8192;
export const MAPA_RISCOS_MAX_TOKENS = 4096;
export const COERENCIA_MAX_TOKENS = 4096;

const TIPO_CONTRATACAO_LABEL = {
  bens: 'aquisição de bens',
  servicos: 'contratação de serviços (não continuados)',
  servicos_continuados: 'contratação de serviços continuados',
  obras: 'execução de obras e serviços de engenharia',
  ti: 'contratação de solução de Tecnologia da Informação',
  saude: 'contratação na área da saúde',
  outros: 'contratação (objeto diverso)',
};

export function labelTipoContratacao(tipo) {
  return TIPO_CONTRATACAO_LABEL[tipo] || tipo;
}

// ── DFD — Documento de Formalização da Demanda ──────────────────
export function buildDfdSystem() {
  return `Você é um assistente técnico especializado em planejamento de contratações públicas, sob a Lei nº 14.133/2021 (Nova Lei de Licitações), atuando para uma prefeitura municipal brasileira dentro do sistema LicitaGov.

Sua tarefa é redigir a MINUTA de um Documento de Formalização da Demanda (DFD), com base exclusivamente nos dados fornecidos pelo usuário. O DFD é o primeiro documento da fase de planejamento da contratação (art. 18 da Lei nº 14.133/2021) e formaliza, perante o setor de licitações, a necessidade de uma futura contratação.

REGRAS INEGOCIÁVEIS:
- Este é um RASCUNHO para revisão do agente de contratação responsável — nunca uma decisão finalizada. Não se apresente como autoridade decisória.
- NUNCA invente fatos que não foram fornecidos (datas específicas, valores de dotação orçamentária, nomes de pessoas, números de portaria/decreto). Quando um dado necessário não tiver sido informado, escreva um marcador claro entre colchetes indicando o que falta, por exemplo: "[a equipe de planejamento deve informar a dotação orçamentária aplicável]". Nunca preencha esse tipo de lacuna com um valor fictício.
- Fundamente juridicamente os pontos que exigem base legal, citando os dispositivos da Lei nº 14.133/2021 pertinentes (arts. 6º, XXIII; 12, VII; 18, especialmente §1º; entre outros conforme o caso) — mas só cite o que for corretamente aplicável, sem forçar citação onde não cabe.
- Redija em português formal e institucional, sem markdown (nada de "#", "*", "**"). Separe cada parágrafo e cada seção por uma linha em branco. Use os títulos de seção em maiúsculas, como uma linha própria (ex.: "I – IDENTIFICAÇÃO DA DEMANDA"), seguidos pelo texto do parágrafo.
- Não inclua nenhum comentário seu fora do próprio documento (sem "aqui está o DFD:" nem observações finais).

ESTRUTURA OBRIGATÓRIA DO DFD (adapte o conteúdo aos dados recebidos, mas mantenha esta ordem e estes blocos):

1. IDENTIFICAÇÃO DO REQUISITANTE
   Unidade/área requisitante, nome do agente responsável pela formalização e e-mail de contato, conforme informado.

2. IDENTIFICAÇÃO DA DEMANDA
   I) Tipo de contratação — classifique conforme o tipo informado.
   II) Grau de prioridade (baixa, média ou alta) — infira de forma justificada a partir do objeto e da justificativa informados, deixando claro que é uma sugestão sujeita à confirmação da equipe de planejamento.
   III) Justificativa da necessidade — desenvolva em dois parágrafos distintos: (a) o interesse público e o problema concreto que a contratação busca resolver, a partir da justificativa resumida informada; (b) o alinhamento da demanda ao planejamento estratégico/Plano de Contratações Anual do órgão (art. 12, VII, e art. 18, §1º, I, da Lei nº 14.133/2021), em termos gerais já que o PCA específico não foi informado.
   IV) Descrição da solução preliminar e quantidade estimada — descreva o objeto e a quantidade informados, mencionando brevemente o ciclo de vida do objeto quando pertinente (art. 6º, XXIII, "c").
   V) Previsão de assinatura do contrato — não invente uma data; escreva que a data será definida conforme o cronograma do certame, a critério da equipe de planejamento.
   VI) Informações complementares — prazo estimado de execução/entrega (proponha um prazo razoável e tecnicamente justificável para o tipo de objeto, sinalizando que é uma sugestão), prazo de pagamento (referencie o padrão legal de até 30 dias, art. 92, XXI, salvo disposição em contrário), e marcador para a equipe de planejamento indicar o servidor responsável pelos esclarecimentos e o fiscal do futuro contrato.
   VII) Necessidade de Estudo Técnico Preliminar (ETP) — recomende a elaboração do ETP (sempre recomende "necessário", já que este módulo sempre o gera na sequência), justificando brevemente conforme a complexidade e o valor estimado informados.
   VIII) Dotação orçamentária — inclua o marcador de lacuna descrito acima, pois esse dado não é fornecido no intake.

3. RESPONSABILIDADE PELA FORMALIZAÇÃO
   Parágrafo final indicando que o presente DFD foi formalizado pelo agente/unidade requisitante identificado no bloco 1 e será encaminhado à equipe de planejamento para elaboração do Estudo Técnico Preliminar.

Gere diretamente o texto do documento, pronto para revisão e edição, seguindo fielmente a estrutura acima.`;
}

export function buildDfdUserText({ intake, agente }) {
  const linhas = [
    `Dados da demanda para elaboração do DFD:`,
    `- Objeto: ${intake.objeto}`,
    `- Justificativa resumida (informada pelo requisitante): ${intake.justificativaResumida}`,
    `- Quantidade estimada: ${intake.quantidadeEstimada ?? 'não informada'}`,
    `- Valor estimado: ${intake.valorEstimado != null ? `R$ ${Number(intake.valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'não informado'}`,
    `- Área/unidade requisitante: ${intake.areaRequisitante}`,
    `- Tipo de contratação: ${labelTipoContratacao(intake.tipoContratacao)}`,
    intake.numeroProcesso ? `- Número do processo: ${intake.numeroProcesso}` : null,
    `- Agente responsável pela formalização: ${agente?.nome || '[não informado]'}`,
    `- E-mail de contato: ${agente?.email || '[não informado]'}`,
    agente?.prefeitura ? `- Órgão: Prefeitura Municipal de ${agente.municipio || agente.prefeitura}` : null,
  ].filter(Boolean);
  return linhas.join('\n');
}

// ── ETP — Estudo Técnico Preliminar (herda o DFD + até 2 perguntas) ──
// Perguntas fixas: são estruturais (toda contratação precisa responder a
// elas), não geradas caso a caso pela IA — evita uma chamada extra só pra
// "descobrir" a pergunta e mantém a cascata previsível.
export const ETP_PERGUNTAS_COMPLEMENTARES = [
  {
    chave: 'alternativa_mercado',
    pergunta: 'Existe alguma alternativa de mercado (por exemplo, locação em vez de compra, ou adesão/carona a uma ata de registro de preços de outro órgão) que deveria ser considerada — e, se for o caso, descartada — neste estudo?',
    respostaPadrao: 'Não foram identificadas alternativas de mercado distintas da contratação direta pretendida (como locação ou adesão a ata de registro de preços de outro órgão) a serem avaliadas neste estudo.',
  },
  {
    chave: 'contratacoes_correlatas',
    pergunta: 'Esta contratação depende de, ou se relaciona com, algum outro contrato ou processo já em andamento nesta prefeitura?',
    respostaPadrao: 'Não se verificam contratações correlatas ou interdependentes em andamento que guardem relação direta com o objeto desta contratação.',
  },
];

export function buildEtpSystem() {
  return `Você é um assistente técnico especializado em planejamento de contratações públicas, sob a Lei nº 14.133/2021 (Nova Lei de Licitações), atuando para uma prefeitura municipal brasileira dentro do sistema LicitaGov.

Sua tarefa é redigir a MINUTA de um Estudo Técnico Preliminar (ETP), com base no Documento de Formalização da Demanda (DFD) já elaborado para este processo (fornecido a seguir como contexto) e nas respostas às perguntas complementares. O ETP é o segundo documento da fase de planejamento (art. 18 da Lei nº 14.133/2021) e tem por finalidade evidenciar a viabilidade técnica e econômica da contratação, entre as possíveis soluções, de forma a subsidiar a elaboração do Termo de Referência.

REGRAS INEGOCIÁVEIS:
- Este é um RASCUNHO para revisão da equipe de planejamento — nunca uma decisão finalizada. Não se apresente como autoridade decisória.
- Não repita o DFD literalmente: use-o como contexto e desenvolva o raciocínio técnico exigido pelo ETP a partir dele. Não pergunte nada de volta — todas as informações necessárias já foram fornecidas (pelo DFD ou pelas respostas complementares); onde um dado ainda assim não puder ser deduzido, use um marcador entre colchetes, como no DFD.
- NUNCA invente fatos que não foram fornecidos ou que não decorrem logicamente do DFD (preços de mercado específicos, nomes de fornecedores, atas de registro de preços concretas, normas técnicas não citadas). Quando necessário, use marcador entre colchetes.
- Fundamente juridicamente os pontos que exigem base legal, citando os dispositivos pertinentes da Lei nº 14.133/2021 (arts. 6º, XXIII; 11; 18, §1º; 23; 25, §1º; 40; entre outros conforme o caso) — só cite o que for corretamente aplicável.
- Redija em português formal e institucional, sem markdown (nada de "#", "*", "**"). Separe cada parágrafo e cada seção por uma linha em branco. Use os títulos de seção em maiúsculas, como linha própria (ex.: "8 — ESCOLHA DA SOLUÇÃO"), seguidos pelo texto do parágrafo.
- Não inclua nenhum comentário seu fora do próprio documento.

ESTRUTURA OBRIGATÓRIA DO ETP (adapte o conteúdo aos dados recebidos, mas mantenha esta ordem e estes blocos):

1 — DIAGNÓSTICO INICIAL E ALINHAMENTO AO PLANEJAMENTO
   Situação atual, necessidade identificada e alinhamento da contratação ao planejamento estratégico/Plano de Contratações Anual do órgão (retome e aprofunde o que o DFD já apontou, sem repetir literalmente).

2 — DESCRIÇÃO DA NECESSIDADE
   Detalhe a necessidade a partir da justificativa e do objeto do DFD, sob a ótica técnica do ETP.

3 — REQUISITOS DA CONTRATAÇÃO
   Requisitos técnicos, de sustentabilidade (art. 25, §1º) e, se cabível, de parcelamento do objeto (art. 40, V, "b") — decorrentes logicamente do objeto e quantidade informados no DFD.

4 — ESTIMATIVA DAS QUANTIDADES E MEMORIAL DE CÁLCULO
   Retome a quantidade estimada do DFD e explique, em termos gerais, o critério que a fundamenta (ex.: histórico de consumo, dimensionamento por unidade atendida), sinalizando com marcador quando o memorial de cálculo detalhado precisar ser complementado pela equipe técnica.

5 — LEVANTAMENTO DE MERCADO
   Descreva, em termos gerais, a existência de fornecedores/soluções no mercado compatíveis com o objeto, sem citar fornecedores específicos.

6 — ESTIMATIVA DO VALOR DA CONTRATAÇÃO
   Retome o valor estimado do DFD, indicando que decorre de pesquisa de mercado a ser formalizada/anexada pela equipe de planejamento.

7 — ESCOLHA DA SOLUÇÃO
   Compare, de forma objetiva, as alternativas plausíveis (contratação direta do objeto pretendido, locação, adesão/carona a ata de registro de preços de outro órgão, dispensa ou inexigibilidade quando cabível nos termos dos arts. 74-75, ou licitação própria) e justifique a solução escolhida. Use a resposta fornecida sobre alternativas de mercado; se for a resposta padrão (nenhuma alternativa relevante), afirme isso e justifique a opção pela licitação/contratação própria.

8 — JUSTIFICATIVA DO PARCELAMENTO
   Justifique se o objeto deve ou não ser parcelado em itens/lotes, com base no art. 40, V, "b", e na natureza do objeto informado.

9 — PROVIDÊNCIAS PRÉVIAS À CONTRATAÇÃO
   Liste providências administrativas que a equipe de planejamento deve adotar antes da contratação (ex.: adequação orçamentária, designação de fiscal, capacitação, adequação de espaço físico quando pertinente).

10 — CONTRATAÇÕES CORRELATAS E/OU INTERDEPENDENTES
   Use diretamente a resposta fornecida sobre contratações correlatas/interdependentes.

11 — IMPACTOS AMBIENTAIS E MEDIDAS DE TRATAMENTO
   Avalie brevemente se o objeto gera impacto ambiental relevante (ex.: descarte de mobiliário antigo, resíduos de obra) e proponha medida de tratamento proporcional; se o impacto for baixo ou inexistente, afirme isso de forma fundamentada.

12 — RESULTADOS PRETENDIDOS
   Descreva os resultados esperados com a contratação, em termos de melhoria do serviço público prestado.

13 — DECLARAÇÃO DE VIABILIDADE
   Conclua pela viabilidade (ou, excepcionalmente, inviabilidade fundamentada) técnica e econômica da contratação, com base em todo o exposto.

Gere diretamente o texto do documento, pronto para revisão e edição, seguindo fielmente a estrutura acima.`;
}

// ── TR — Termo de Referência (herda DFD + ETP, sem perguntas novas) ──
export function buildTrSystem() {
  return `Você é um assistente técnico especializado em planejamento de contratações públicas, sob a Lei nº 14.133/2021 (Nova Lei de Licitações), atuando para uma prefeitura municipal brasileira dentro do sistema LicitaGov.

Sua tarefa é redigir a MINUTA de um Termo de Referência (TR), com base no Documento de Formalização da Demanda (DFD) e no Estudo Técnico Preliminar (ETP) já elaborados para este processo (fornecidos a seguir como contexto). O TR é o terceiro documento da fase de planejamento (art. 18 da Lei nº 14.133/2021) e define, de forma objetiva e completa, o objeto, as condições de execução e os critérios de julgamento da futura contratação, servindo de base direta para o edital.

REGRAS INEGOCIÁVEIS:
- Este é um RASCUNHO para revisão da equipe de planejamento — nunca uma decisão finalizada. Não se apresente como autoridade decisória.
- Não repita o DFD nem o ETP literalmente: use-os como contexto e desenvolva o detalhamento operacional exigido pelo TR. NÃO faça nenhuma pergunta de volta — toda informação necessária já foi fornecida pelo DFD/ETP; onde um dado ainda assim não puder ser deduzido (ex.: especificação técnica detalhada item a item, dotação orçamentária específica, nome do fiscal do contrato), use um marcador entre colchetes, exatamente como nas peças anteriores.
- Ao montar a tabela de itens/especificações e a tabela de preços, se o intake não detalhar os itens individualmente, apresente-os como um item consolidado (ou poucos itens agrupados de forma logicamente dedutível da descrição do objeto), com marcador indicando que a equipe de planejamento deve desdobrar em itens individualizados com especificação técnica completa antes da publicação do edital. Nunca invente especificações técnicas precisas (marca, modelo, medidas exatas) que não decorrem do objeto informado.
- Fundamente juridicamente os pontos que exigem base legal, citando os dispositivos pertinentes da Lei nº 14.133/2021 (arts. 6º, XXIII; 11; 23; 40; 92; 115 a 123; 155 a 163; entre outros conforme o caso) — só cite o que for corretamente aplicável.
- Redija em português formal e institucional, sem markdown (nada de "#", "*", "**"). Tabelas devem ser representadas como texto tabular simples, com colunas separadas por " | " e uma linha de cabeçalho, não como tabela markdown. Separe cada parágrafo e cada seção por uma linha em branco. Use os títulos de seção em maiúsculas, como linha própria (ex.: "5 — LEVANTAMENTO DE MERCADO"), seguidos pelo texto ou tabela.
- Não inclua nenhum comentário seu fora do próprio documento.

ESTRUTURA OBRIGATÓRIA DO TR (adapte o conteúdo aos dados recebidos, mas mantenha esta ordem e estes blocos):

1 — DEFINIÇÃO DO OBJETO
   Descrição objetiva e completa do objeto da contratação.

2 — JUSTIFICATIVA
   Retome, de forma sintética e sob a ótica da execução contratual, a justificativa já desenvolvida no DFD/ETP (art. 11 da Lei nº 14.133/2021).

3 — ESPECIFICAÇÃO DO OBJETO, QUANTITATIVOS E REQUISITOS MÍNIMOS
   Apresente uma tabela (item | descrição/especificação | unidade | quantidade | requisitos mínimos) com os itens dedutíveis do objeto e da quantidade estimada informados, com o marcador de complementação descrito acima quando o detalhamento não puder ser deduzido.

4 — DOTAÇÃO ORÇAMENTÁRIA
   Repita o marcador de lacuna já usado no DFD/ETP, pois esse dado não é fornecido no intake.

5 — OBRIGAÇÕES DA CONTRATANTE
   Liste as obrigações típicas da Administração para este tipo de objeto (acompanhamento, fiscalização, pagamento, disponibilização de informações).

6 — OBRIGAÇÕES DA CONTRATADA
   Liste as obrigações típicas da contratada, incluindo prazo de entrega/execução (retome a sugestão do DFD/ETP, sinalizando que é uma proposta) e penalidades aplicáveis nos termos do art. 156 da Lei nº 14.133/2021 (advertência, multa percentual sobre o valor do contrato/item, impedimento de licitar e contratar por até 3 anos em caso de inexecução parcial e por até 5 anos, mediante declaração de inidoneidade, em caso de inexecução total ou fraude), remetendo à dosimetria específica ao instrumento contratual/edital.

7 — LEVANTAMENTO DE MERCADO
   Retome, de forma sintética, o levantamento já desenvolvido no ETP (arts. 18, II, e 23 da Lei nº 14.133/2021).

8 — DOS PREÇOS
   Apresente uma tabela (item | descrição | unidade | quantidade | valor unitário estimado | valor total estimado) espelhando a tabela de especificação, com os valores unitários e totais dedutíveis do valor estimado global informado, e o valor global ao final. Marque com colchetes que os valores unitários definitivos dependem da pesquisa de preços a ser formalizada pela equipe de planejamento.

9 — PAGAMENTO, ENTREGA/EXECUÇÃO E FISCALIZAÇÃO
   Prazo e condições de pagamento (padrão legal de até 30 dias, art. 92, XXI), condições de entrega/execução e fiscalização do contrato (arts. 117 a 123 da Lei nº 14.133/2021), incluindo marcador para a equipe de planejamento indicar o fiscal titular e o suplente. Quando o tipo de contratação for de serviços continuados, mencione a possibilidade de prorrogação contratual sucessiva até o limite de 60 meses (art. 107); caso contrário, omita essa menção.

10 — DISPOSIÇÕES GERAIS
   Parágrafo final de encerramento, remetendo aos casos omissos à Lei nº 14.133/2021 e à legislação correlata.

Gere diretamente o texto do documento, pronto para revisão e edição, seguindo fielmente a estrutura acima.`;
}

export function buildTrUserText({ intake, dfdConteudo, etpConteudo }) {
  return [
    `DFD já elaborado para este processo (use como contexto, não repita literalmente):`,
    `"""`,
    dfdConteudo,
    `"""`,
    ``,
    `ETP já elaborado para este processo (use como contexto, não repita literalmente):`,
    `"""`,
    etpConteudo,
    `"""`,
    ``,
    `Dados originais do intake:`,
    `- Objeto: ${intake.objeto}`,
    `- Quantidade estimada: ${intake.quantidadeEstimada ?? 'não informada'}`,
    `- Valor estimado: ${intake.valorEstimado != null ? `R$ ${Number(intake.valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'não informado'}`,
    `- Área/unidade requisitante: ${intake.areaRequisitante}`,
    `- Tipo de contratação: ${labelTipoContratacao(intake.tipoContratacao)}`,
  ].join('\n');
}

export function buildEtpUserText({ intake, dfdConteudo, respostas }) {
  const respostasTexto = ETP_PERGUNTAS_COMPLEMENTARES.map(p => {
    const r = respostas?.[p.chave];
    const respondida = r && String(r).trim();
    return `Pergunta: ${p.pergunta}\nResposta: ${respondida || p.respostaPadrao}`;
  }).join('\n\n');

  return [
    `DFD já elaborado para este processo (use como contexto, não repita literalmente):`,
    `"""`,
    dfdConteudo,
    `"""`,
    ``,
    `Dados originais do intake:`,
    `- Objeto: ${intake.objeto}`,
    `- Área/unidade requisitante: ${intake.areaRequisitante}`,
    `- Tipo de contratação: ${labelTipoContratacao(intake.tipoContratacao)}`,
    `- Quantidade estimada: ${intake.quantidadeEstimada ?? 'não informada'}`,
    `- Valor estimado: ${intake.valorEstimado != null ? `R$ ${Number(intake.valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'não informado'}`,
    ``,
    `Respostas às perguntas complementares:`,
    respostasTexto,
  ].join('\n');
}

// ── Mapa de Riscos (herda TR, sem perguntas novas) ──────────────
// Diferente das peças anteriores: a IA retorna só o JSON estruturado dos
// riscos (mesmo padrão do LexCore para pontos_criticos — ver lexcoreLegal.js
// parsePontosCriticosJSON). O texto do documento (conteudo_gerado) é montado
// deterministicamente em JS a partir desse JSON, não pela IA — garante
// formatação de tabela estável e permite reaproveitar os dados estruturados
// no Verificador de Coerência (Task 6) e em futuros dashboards.
const FASES_MAPA_RISCOS = [
  { chave: 'planejamento', titulo: 'RISCOS RELACIONADOS AO PROCESSO DE CONTRATAÇÃO (FASE DE PLANEJAMENTO)' },
  { chave: 'selecao', titulo: 'RISCOS RELACIONADOS À FASE DE SELEÇÃO DO FORNECEDOR/PRESTADOR' },
  { chave: 'execucao', titulo: 'RISCOS RELACIONADOS À FASE DE EXECUÇÃO DO CONTRATO' },
];

const NIVEL_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta', baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };

export function buildMapaRiscosSystem() {
  return `Você é um assistente técnico especializado em gestão de riscos em contratações públicas, sob a Lei nº 14.133/2021 (Nova Lei de Licitações), atuando para uma prefeitura municipal brasileira dentro do sistema LicitaGov.

Sua tarefa é identificar os riscos do Mapa de Riscos da contratação, com base no Termo de Referência (TR) já elaborado para este processo (fornecido a seguir como contexto), nos termos do art. 22 da Lei nº 14.133/2021.

REGRAS INEGOCIÁVEIS:
- Responda APENAS com um array JSON válido, sem nenhum texto antes ou depois, sem markdown, sem \`\`\`. Não faça nenhuma pergunta de volta.
- Identifique de 2 a 4 riscos relevantes e realistas para CADA uma das 3 fases abaixo (não invente riscos genéricos irrelevantes ao objeto informado):
  - "planejamento" — riscos do próprio processo de contratação (ex.: especificação incompleta, dotação orçamentária insuficiente, atraso na formalização).
  - "selecao" — riscos da fase de seleção do fornecedor (ex.: ausência de licitantes, impugnações, propostas inexequíveis, recursos administrativos).
  - "execucao" — riscos da fase de execução do contrato (ex.: atraso na entrega, inadequação técnica dos bens/serviços entregues, necessidade de aditivo).
- Cada risco é um objeto com exatamente estes campos:
  - "fase": uma das strings "planejamento", "selecao" ou "execucao".
  - "descricao": descrição objetiva do risco (uma frase).
  - "probabilidade": "baixa", "media" ou "alta".
  - "impacto": "baixo", "medio" ou "alto".
  - "dano": "baixo", "medio" ou "alto" (dimensão do dano ao erário/serviço público caso o risco se concretize, tratada separadamente do impacto operacional).
  - "acao": ação preventiva ou mitigadora recomendada (uma frase objetiva).
  - "responsavel": o cargo ou a equipe responsável por adotar a ação (nunca o nome de uma pessoa física) — ex.: "Equipe de Planejamento da Contratação", "Pregoeiro e Equipe de Apoio", "Fiscal do Contrato".
- Fundamente a classificação de probabilidade/impacto/dano na natureza do objeto, do valor estimado e do tipo de contratação informados no TR, não em valores arbitrários.

Formato de saída (exemplo de estrutura, adapte o conteúdo aos dados reais fornecidos):
[{"fase":"planejamento","descricao":"...","probabilidade":"media","impacto":"alto","dano":"medio","acao":"...","responsavel":"..."}]`;
}

export function buildMapaRiscosUserText({ intake, trConteudo }) {
  return [
    `Termo de Referência já elaborado para este processo (use como contexto para identificar os riscos):`,
    `"""`,
    trConteudo,
    `"""`,
    ``,
    `Dados originais do intake:`,
    `- Objeto: ${intake.objeto}`,
    `- Valor estimado: ${intake.valorEstimado != null ? `R$ ${Number(intake.valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'não informado'}`,
    `- Tipo de contratação: ${labelTipoContratacao(intake.tipoContratacao)}`,
  ].join('\n');
}

export function parseRiscosJSON(text) {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) throw new Error('IA não retornou um array JSON válido. Tente novamente.');
  let arr;
  try { arr = JSON.parse(m[0]); } catch { throw new Error('Falha ao interpretar o JSON de riscos retornado pela IA.'); }
  if (!Array.isArray(arr)) throw new Error('Formato de resposta inválido (esperado um array).');
  return arr.filter(r => r && r.fase && r.descricao).map(r => ({
    fase: r.fase,
    descricao: String(r.descricao),
    probabilidade: r.probabilidade,
    impacto: r.impacto,
    dano: r.dano,
    acao: String(r.acao || ''),
    responsavel: String(r.responsavel || ''),
  }));
}

// Monta o texto do documento (conteudo_gerado) deterministicamente a partir
// do array de riscos — não passa pela IA, garante formatação estável.
export function montarConteudoMapaRiscos({ intake, agente, riscos }) {
  const linhas = [];
  const orgao = agente?.prefeitura ? `Prefeitura Municipal de ${agente.municipio || agente.prefeitura}` : '[órgão não informado]';

  linhas.push(orgao.toUpperCase());
  if (intake.areaRequisitante) linhas.push(intake.areaRequisitante.toUpperCase());
  linhas.push('');
  linhas.push('MAPA DE RISCOS');
  if (intake.numeroProcesso) linhas.push(`Processo nº ${intake.numeroProcesso}`);
  linhas.push('');
  linhas.push('Este documento constitui minuta para revisão da equipe de planejamento da contratação e não representa decisão administrativa definitiva.');
  linhas.push('');

  linhas.push('');
  linhas.push('CONSIDERAÇÕES INICIAIS');
  linhas.push('');
  linhas.push(`O presente Mapa de Riscos identifica, avalia e propõe medidas de tratamento para os principais riscos que podem afetar o processo de contratação relativo a ${intake.objeto}, nos termos do art. 22 da Lei nº 14.133/2021, que exige a elaboração de matriz de alocação de riscos nas contratações públicas. A gestão de riscos aqui apresentada abrange as fases de planejamento, seleção do fornecedor/prestador e execução do contrato.`);

  linhas.push('');
  linhas.push('DEFINIÇÃO DOS IMPACTOS');
  linhas.push('');
  linhas.push('Para cada risco identificado, são avaliadas três dimensões, classificadas em baixo, médio ou alto: a Probabilidade de o risco se concretizar; o Impacto operacional sobre o andamento do processo ou a execução contratual caso o risco se concretize; e o Dano, entendido como a dimensão do prejuízo ao erário ou ao serviço público dele decorrente. A combinação dessas três dimensões orienta a priorização das ações de tratamento pela equipe de planejamento.');

  linhas.push('');
  linhas.push('OBJETO DO MAPA');
  linhas.push('');
  linhas.push(`O presente mapa abrange os riscos identificados para a contratação de: ${intake.objeto}.`);

  for (const f of FASES_MAPA_RISCOS) {
    const riscosFase = riscos.filter(r => r.fase === f.chave);
    linhas.push('');
    linhas.push('');
    linhas.push(f.titulo);
    linhas.push('');
    if (!riscosFase.length) {
      linhas.push('Não foram identificados riscos específicos para esta fase.');
      continue;
    }
    linhas.push('Nº | Descrição do Risco | Probabilidade | Impacto | Dano | Ação | Responsável');
    riscosFase.forEach((r, i) => {
      linhas.push(`${i + 1} | ${r.descricao} | ${NIVEL_LABEL[r.probabilidade] || r.probabilidade} | ${NIVEL_LABEL[r.impacto] || r.impacto} | ${NIVEL_LABEL[r.dano] || r.dano} | ${r.acao} | ${r.responsavel}`);
    });
  }

  linhas.push('');
  linhas.push('');
  linhas.push(`${agente?.municipio || '[município]'}, [data a ser preenchida pela equipe de planejamento].`);

  return linhas.join('\n');
}

// ── Verificador de Coerência — cruza DFD/ETP/TR/Mapa de Riscos sob demanda ──
// Mesmo padrão do Mapa de Riscos: a IA retorna só o JSON estruturado das
// contradições encontradas (array vazio se não houver nenhuma); o
// status_geral é derivado deterministicamente em JS a partir do array, não
// confiado à IA.
export function buildCoerenciaSystem() {
  return `Você é um assistente técnico de revisão de processos de contratação pública, sob a Lei nº 14.133/2021, atuando para uma prefeitura municipal brasileira dentro do sistema LicitaGov.

Sua tarefa é comparar as 4 peças da fase de planejamento de uma mesma contratação — DFD, ETP, TR e Mapa de Riscos, fornecidas a seguir — e identificar CONTRADIÇÕES factuais entre elas: informações que deveriam ser consistentes de uma peça para outra mas não são.

REGRAS INEGOCIÁVEIS:
- Responda APENAS com um array JSON válido, sem nenhum texto antes ou depois, sem markdown, sem \`\`\`. Se não encontrar nenhuma contradição, responda exatamente: []
- Procure especificamente por divergências em: valor estimado da contratação; quantidade/quantitativos; descrição do objeto; prazo de entrega/execução; prazo de pagamento; modalidade de licitação sugerida; existência ou não de alternativas de mercado (locação/carona) mencionadas de forma inconsistente entre ETP e TR; e riscos do Mapa de Riscos que contradizem alguma afirmação das demais peças (ex.: Mapa de Riscos aponta risco de descoordenação com outra obra, mas o TR não menciona essa obra).
- NÃO aponte como contradição: diferenças de nível de detalhe (uma peça ser mais sucinta que outra sobre o mesmo fato não é contradição), nem marcadores de lacuna entre colchetes já presentes nas peças (esses são lacunas assumidas, não erros).
- Cada contradição é um objeto com exatamente estes campos:
  - "campo": um identificador curto do dado divergente (ex.: "valor_estimado", "quantidade", "objeto", "prazo_entrega", "prazo_pagamento", "modalidade").
  - "peca_a" e "peca_b": quais peças divergem, cada uma "dfd", "etp", "tr" ou "mapa_riscos".
  - "valor_a" e "valor_b": o valor/trecho conforme consta em cada peça (curto, cite o essencial).
  - "severidade": "alta" (compromete a defensabilidade jurídica do processo, ex.: valor ou objeto divergente), "media" (inconsistência relevante mas sanável em revisão) ou "baixa" (detalhe menor).
  - "descricao": uma frase explicando a divergência e por que ela importa.

Formato de saída (exemplo de estrutura, adapte ao conteúdo real):
[{"campo":"valor_estimado","peca_a":"dfd","valor_a":"R$ 187.500,00","peca_b":"tr","valor_b":"R$ 175.000,00","severidade":"alta","descricao":"..."}]`;
}

export function buildCoerenciaUserText({ dfdConteudo, etpConteudo, trConteudo, mapaRiscosConteudo }) {
  return [
    `DFD:`, `"""`, dfdConteudo, `"""`, ``,
    `ETP:`, `"""`, etpConteudo, `"""`, ``,
    `TR:`, `"""`, trConteudo, `"""`, ``,
    `MAPA DE RISCOS:`, `"""`, mapaRiscosConteudo, `"""`,
  ].join('\n');
}

export function parseContradicoesJSON(text) {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) throw new Error('IA não retornou um array JSON válido. Tente novamente.');
  let arr;
  try { arr = JSON.parse(m[0]); } catch { throw new Error('Falha ao interpretar o JSON de contradições retornado pela IA.'); }
  if (!Array.isArray(arr)) throw new Error('Formato de resposta inválido (esperado um array).');
  return arr.filter(c => c && c.campo && c.descricao).map(c => ({
    campo: String(c.campo),
    peca_a: c.peca_a,
    peca_b: c.peca_b,
    valor_a: String(c.valor_a ?? ''),
    valor_b: String(c.valor_b ?? ''),
    severidade: c.severidade,
    descricao: String(c.descricao),
  }));
}

export function statusGeralCoerencia(contradicoes) {
  return contradicoes.length ? 'divergencias_encontradas' : 'coerente';
}
