# LexCore — Respostas a Impugnação/Recurso (card independente)

Data: 2026-07-13

## Contexto

O módulo LexCore (`src/App.jsx`, componente `TabLexCore`) hoje tem um único
fluxo: enviar o PDF de um edital → IA identifica pontos críticos frente à
Lei 14.133/2021 (`LexcoreAnalise`) → usuário seleciona pontos → IA gera uma
peça jurídica (impugnação, razões de recurso, contrarrazões ou petição)
"atacando" o edital, com base nos pontos selecionados (`LexcorePeca`).

Esse fluxo pressupõe que o usuário é quem desafia o edital. Mas o usuário
também precisa do caso inverso: quando o **órgão licitante recebe** uma
impugnação ou um recurso de um licitante/terceiro e precisa redigir a
**resposta à impugnação** ou as **contrarrazões** de defesa. Hoje não há
como fazer isso sem simular uma análise de edital que não existe.

## Objetivo

Adicionar, dentro da aba LexCore, uma segunda seção completamente
independente da análise de edital: o usuário anexa o PDF da impugnação ou
do recurso que recebeu, escolhe o tipo de resposta, e a IA redige a
resposta/contrarrazão de defesa — sem nenhuma dependência de uma análise de
edital salva, pontos críticos ou peças já geradas.

**Fora de escopo / não muda:** o fluxo atual de análise de edital → pontos
críticos → gerar peça (`LexcoreNova`, `LexcoreAnalise`, `LexcorePeca`,
`lexcoreDb.js`, `lexcoreLegal.js`, `api/lexcore-exportar.js`,
`api/lexcore-upload.js`, tabela `lexcore_pecas`, `migration_lexcore.sql`)
permanece exatamente como está, sem nenhuma edição.

## Modelo de dados

Nova tabela `lexcore_respostas`, sem chave estrangeira para
`lexcore_analises` (independência real, não FK nula):

```sql
create table if not exists lexcore_respostas (
  id                  uuid primary key default gen_random_uuid(),
  tipo_resposta       text not null
                        check (tipo_resposta in ('resposta_impugnacao', 'contrarrazoes')),
  nome_referencia     text,          -- nome do edital/objeto (opcional)
  numero_processo     text,          -- opcional
  arquivo_origem_url  text,          -- PDF da impugnação/recurso anexado
  conteudo_gerado     text not null,
  status              text not null default 'rascunho' check (status in ('rascunho', 'finalizada')),
  versao              int not null default 1,
  arquivo_docx_url    text,
  criado_por          uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table lexcore_respostas enable row level security;
drop policy if exists allow_auth on lexcore_respostas;
create policy allow_auth on lexcore_respostas for all to authenticated using (true) with check (true);
```

Reaproveita o bucket de storage `lexcore-docs` já existente (criado em
`migration_lexcore.sql`) — não precisa de bucket novo nem de policy nova de
storage (a policy de leitura pública já cobre o bucket inteiro, e o upload
já é feito via API com service role, mesmo padrão do fluxo de análise).

## Arquivos novos (tudo aditivo)

| Arquivo | Papel |
|---|---|
| `supabase/migration_lexcore_respostas.sql` | Cria só a tabela `lexcore_respostas` + policy RLS acima |
| `src/lib/lexcoreRespostaDb.js` | CRUD: `sbListRespostas`, `sbCreateResposta`, `sbGetResposta`, `sbUpdateResposta`, `sbDeleteResposta`, `uploadDocumentoRecebido(file)` (chama `/api/lexcore-upload`, endpoint existente, sem alterá-lo), `exportarRespostaDocx(...)` (chama o novo endpoint abaixo) |
| `src/lib/lexcoreRespostaLegal.js` | `TIPOS_RESPOSTA` (`resposta_impugnacao` \| `contrarrazoes`), `buildRespostaSystem(tipoLabel)`, `labelTipoResposta(tipo)` |
| `api/lexcore-resposta-exportar.js` | Espelha `api/lexcore-exportar.js`: recebe `respostaId`, `tipoResposta`, `conteudoGerado`, gera o .docx e faz upload, mas atualiza a tabela `lexcore_respostas` (endpoint separado — `lexcore-exportar.js` não é tocado) |

**Única edição em arquivo existente:** em `src/lib/lexcoreDocx.js`,
acrescentar uma chave nova no mapa `TITULOS_PECA`:
`resposta_impugnacao: "RESPOSTA À IMPUGNAÇÃO"`. A chave `contrarrazoes`
(`"CONTRARRAZÕES DE RECURSO"`) já existe no mapa e é reaproveitada tal como
está — `tipo_resposta` usa o mesmo valor `'contrarrazoes'` de propósito,
para que o título e o nome de arquivo saiam corretos sem duplicar entradas.
`buildLexcorePecaDocx` e `nomeArquivoPeca` são reaproveitados sem nenhuma
outra alteração — já são genéricos o suficiente (recebem `tipoPeca`,
`conteudoGerado`, `nomeEdital`, `numeroProcesso`), bastando passar
`tipoResposta` no lugar de `tipoPeca`.

## Prompt de IA

`buildRespostaSystem(tipoRespostaLabel)` — mesmo padrão de
`buildPecaSystem`, mas instruindo a IA a:
- Ler o PDF anexado (impugnação ou recurso recebido) diretamente — mesmo
  mecanismo multimodal já usado em "Nova Análise" (`anthropic-beta:
  pdfs-2024-09-25`, `type: "document"`), sem passo intermediário de JSON de
  pontos críticos.
- Redigir a peça de defesa **em nome do órgão licitante** (não do
  impugnante/recorrente): síntese da petição recebida, rebate ponto a
  ponto dos argumentos, fundamentação na Lei 14.133/2021, pedido de
  indeferimento da impugnação/recurso e manutenção do edital ou da decisão
  recorrida.
- Usar `nomeReferencia`/`numeroProcesso` (se informados) apenas como
  contexto de cabeçalho — nunca como fonte de pontos críticos.

Uma única chamada à API da Claude por resposta gerada (PDF → texto final da
peça), análoga à chamada de "Nova Análise" mas sem parsing de JSON
intermediário — o retorno já é o texto final da peça, como em `gerarPeca`.

## UI

Tudo dentro de `TabLexCore` (`src/App.jsx`). Três componentes novos,
inseridos depois de `LexcorePeca` no arquivo — `LexcoreNova`,
`LexcoreAnalise` e `LexcorePeca` não sofrem nenhuma edição:

- **`TabLexCore`**: cabeçalho ganha um alternador de seção (dois botões/tab
  pills): **"Análise de Editais"** (default, comportamento atual 100%
  preservado) e **"Respostas a Impugnação/Recurso"** (novo). A troca de
  seção é só um novo `useState("analise" | "resposta")` que decide qual
  bloco renderizar abaixo do cabeçalho — a árvore de `view` (`lista | nova
  | analise | peca`) existente para a seção de análise fica intacta.
- **`LexcoreRespostaLista`**: lista de respostas geradas (mesmo padrão
  visual dos cards de `TabLexCore` — nome de referência, tipo, status,
  data, excluir), com botão "Nova Resposta".
- **`LexcoreRespostaNova`**: formulário — seletor (`Resposta à Impugnação`
  / `Contrarrazões`), campo opcional "Edital/Objeto de referência", campo
  opcional "Número do Processo", upload do PDF (impugnação/recurso
  recebido, valida `application/pdf`, máx. 20 MB — mesmo padrão de
  `LexcoreNova`), botão "Gerar Resposta". Ao concluir, chama
  `onCriada(id)`.
- **`LexcoreRespostaDetalhe`**: mesmo padrão de `LexcorePeca` — textarea
  editável, "Salvar Rascunho", "Exportar .docx", link pra última versão
  exportada.

## Testes / verificação

- Gerar uma resposta a partir de um PDF de impugnação de teste e conferir
  que o texto gerado defende o edital (não ataca).
- Confirmar que a seção "Análise de Editais" continua funcionando
  exatamente como antes (regressão manual rápida: nova análise → pontos
  críticos → gerar peça → exportar .docx).
- Exportar .docx da resposta nova e confirmar título correto
  ("RESPOSTA À IMPUGNAÇÃO" / "CONTRARRAZÕES DE RECURSO") e nome de arquivo.
- Confirmar que a tabela `lexcore_pecas` e a tabela `lexcore_respostas` não
  se misturam (nenhuma peça antiga aparece na lista de respostas e
  vice-versa).
