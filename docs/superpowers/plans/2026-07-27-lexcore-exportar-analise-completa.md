# LexCore — Exportar Análise Completa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a button "Exportar Análise Completa" na tela de detalhe de uma análise LexCore (`LexcoreAnalise` em `src/App.jsx`) que baixa um `.docx` informal com TODOS os pontos críticos da análise (independente de seleção/checkbox), sem criar registro em `lexcore_pecas` (não é uma peça jurídica formal).

**Architecture:** Gerador `.docx` Node-only novo (`src/lib/lexcoreAnaliseDocx.js`, biblioteca `docx` — mesma já usada em `lexcoreDocx.js`, **não** `docxtemplater`/`pizzip`), endpoint serverless novo (`api/lexcore-analise-exportar.js`, service role, sobe no bucket `lexcore-docs` já existente), uma tabela nova mínima de audit log (`lexcore_export_logs`), e um botão novo na UI ao lado de "Gerar Peça Jurídica". Nada do fluxo de peça jurídica existente é alterado.

**Tech Stack:** React 18 (sem TypeScript), Supabase (Postgres + Storage), `docx` npm package (já instalado — **nenhuma dependência nova**), Vercel serverless functions.

## Global Constraints

- **Não usar `docxtemplater`/`pizzip`.** O prompt original da feature supunha que esse fosse o "padrão já usado no projeto" — não é. O padrão real e comprovado em produção é a biblioteca `docx` (`src/lib/lexcoreDocx.js`, `src/lib/dispensaDocx.js`). `docxtemplater`/`pizzip` aparecem só como dependências não commitadas no `package.json` local (trabalho incompleto de outra sessão, branch `feat/lexcore-resposta-impugnacao`) — não usar, não remover, não mexer nelas.
- **`git add` só os arquivos que cada task lista.** O working tree tem mudanças não commitadas pré-existentes de outra sessão (`package.json`, `package-lock.json`, `src/lib/dispensaProcesso.js`, `supabase/migration_multitenancy.sql`, ícones deletados) — não commitar nem tocar nelas.
- Nomes de tabela/coluna em `snake_case`; chaves de objeto JS retornadas por funções `sb*` em `camelCase` (convenção já usada em `analiseFromDb`/`pontoFromDb` de `lexcoreDb.js`).
- Multi-tenancy já está em produção (`migration_multitenancy.sql` aplicada — tabela `tenants`, trigger `set_tenant_id_from_auth()`, funções `is_super_admin()`/`current_tenant_id()`, policy `tenant_isolation`). Qualquer tabela nova precisa seguir esse padrão (coluna `tenant_id` + trigger reusando `set_tenant_id_from_auth()` + policy `tenant_isolation`), não o `allow_auth` antigo.
- **Achado importante (bug conhecido, não corrigir aqui):** "Acessar como" (impersonação) não troca a sessão real do Supabase Auth — `auth.uid()` continua sendo o do super_admin. Isso significa que o trigger `set_tenant_id_from_auth()` **não pode ser usado como única fonte de verdade para o audit log** enquanto o super_admin estiver impersonando uma prefeitura (o trigger resolveria pro tenant errado). Por isso o endpoint desta feature recebe `tenantId` explícito do cliente (que já sabe corretamente qual tenant está sendo visualizado, via `impersonating`) em vez de depender só do trigger.
- Migrations neste projeto são aplicadas manualmente (colar no SQL Editor do Supabase, projeto `xqlrfsrjvqmucchzpapk`) — não há runner automatizado.
- Sem framework de testes unitários (sem jest/vitest). Módulos de lógica pura são verificados com scripts standalone `node:assert` (`node scripts/*.mjs`), seguindo o padrão já existente (`scripts/diag-lexcore.mjs`). UI é verificada com `npm run build` + checagem manual no navegador.
- Nomes de arquivo/keys de Storage **precisam ser sanitizados** — nomes de edital em PT-BR quase sempre têm acento ("Pregão", "Licitação"), e o Supabase Storage rejeita esses bytes na key do objeto com erro `"Invalid key"` (bug real corrigido em `api/lexcore-upload.js` no commit `9f66562`, mesma classe de problema se reaparece aqui se não for tratado).
- Reaproveitar componentes visuais já existentes: `Btn`, `IconBtn`, `Icon`, `KpiCard`, cores `C`/`SX`, fonte Inter — não introduzir um novo sistema visual.

---

## Task 1: Utilitário compartilhado de sanitização de nome de arquivo

**Files:**
- Create: `src/lib/storageSafeName.js`
- Modify: `api/lexcore-upload.js` (troca a sanitização inline já existente por este util — comportamento idêntico, zero mudança funcional)
- Create: `scripts/verify-storage-safe-name.mjs`

**Interfaces:**
- Produces: `sanitizeStorageFileName(fileName: string): string` — remove acentos (NFD + strip de diacríticos U+0300–U+036F) e substitui qualquer caractere fora de `[a-zA-Z0-9.\-_]` por `_`. Usado por Task 1 (upload de edital) e Task 3 (nome do relatório de análise).

- [ ] **Step 1: Criar o utilitário**

Crie `src/lib/storageSafeName.js`:

```js
// Sanitiza nomes de arquivo antes de virarem key de objeto no Supabase
// Storage. Nomes de edital em PT-BR quase sempre têm acento ("Pregão",
// "Licitação", "nº") — o Storage rejeita esses bytes na key com "Invalid
// key". Normaliza pra ASCII seguro (NFD + strip de diacríticos, depois
// troca qualquer caractere fora de [a-zA-Z0-9.\-_] por "_").
const DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g');

export function sanitizeStorageFileName(fileName) {
  return String(fileName)
    .normalize('NFD').replace(DIACRITICS_RE, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');
}
```

- [ ] **Step 2: Escrever o script de verificação**

Crie `scripts/verify-storage-safe-name.mjs`:

```js
// Verificação standalone (sem dependências externas) do sanitizador de
// nome de arquivo. Uso: node scripts/verify-storage-safe-name.mjs
import assert from 'node:assert/strict';
import { sanitizeStorageFileName } from '../src/lib/storageSafeName.js';

assert.equal(
  sanitizeStorageFileName('Edital Pregão Eletrônico nº 012_2026.pdf'),
  'Edital_Pregao_Eletronico_n__012_2026.pdf'
);
assert.equal(sanitizeStorageFileName('edital-teste.pdf'), 'edital-teste.pdf');
assert.equal(sanitizeStorageFileName('Relatório/Município (2026).docx'), 'Relatorio_Municipio__2026_.docx');
assert.equal(sanitizeStorageFileName(''), '');

console.log('OK: sanitizeStorageFileName cobre acentos, barra, parênteses e espaço.');
```

- [ ] **Step 3: Rodar o script e confirmar que passa**

Run: `node scripts/verify-storage-safe-name.mjs`
Expected: `OK: sanitizeStorageFileName cobre acentos, barra, parênteses e espaço.` sem erro de assert.

- [ ] **Step 4: Refatorar `api/lexcore-upload.js` pra usar o util**

Abra `api/lexcore-upload.js`. Troque:

```js
const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const BUCKET = 'lexcore-docs';
const DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g');
```

por:

```js
import { sanitizeStorageFileName } from '../src/lib/storageSafeName.js';

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const BUCKET = 'lexcore-docs';
```

(o import vai no topo do arquivo, junto com `import { createClient } from '@supabase/supabase-js';`). E troque o corpo do `try`:

```js
    const safeName = fileName
      .normalize('NFD').replace(DIACRITICS_RE, '')
      .replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `editais/${crypto.randomUUID()}-${safeName}`;
```

por:

```js
    const safeName = sanitizeStorageFileName(fileName);
    const path = `editais/${crypto.randomUUID()}-${safeName}`;
```

- [ ] **Step 5: Confirmar que o comportamento em produção não mudou**

Run (mesmo teste manual já usado pra confirmar o fix original):
```bash
node -e "
const fs = require('fs');
const buf = fs.readFileSync('tests/fixtures/edital-teste.pdf');
const b64 = buf.toString('base64');
fetch('https://licitagov-one.vercel.app/api/lexcore-upload', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileName: 'Edital Pregão Eletrônico nº 012_2026.pdf', fileType: 'application/pdf', fileBase64: b64 }),
}).then(r => r.json()).then(j => console.log(JSON.stringify(j)));
"
```
Expected (só depois do deploy — pode rodar de novo após o Task 6 fazer o deploy final): `{"url":"https://xqlrfsrjvqmucchzpapk.supabase.co/storage/v1/object/public/lexcore-docs/editais/...-Edital_Pregao_Eletronico_n__012_2026.pdf"}` — mesmo resultado de antes da refatoração, só a origem do sanitizador mudou.

- [ ] **Step 6: Commit**

```bash
git add src/lib/storageSafeName.js scripts/verify-storage-safe-name.mjs api/lexcore-upload.js
git commit -m "refactor(lexcore): extrai sanitizeStorageFileName pra util compartilhado"
```

---

## Task 2: Tabela de audit log `lexcore_export_logs`

**Files:**
- Create: `supabase/migration_lexcore_export_logs.sql`
- Create: `scripts/verify-lexcore-export-logs-db.mjs`

**Interfaces:**
- Produces: tabela `lexcore_export_logs(id uuid, analise_id uuid, tenant_id uuid, usuario_id uuid, usuario_email text, created_at timestamptz)`, trigger `trg_set_tenant_id` (reusa `set_tenant_id_from_auth()`), policy `tenant_isolation` (reusa `current_tenant_id()`/`is_super_admin()` — ambas já existem em produção desde `migration_multitenancy.sql`).

- [ ] **Step 1: Escrever a migration**

Crie `supabase/migration_lexcore_export_logs.sql`:

```sql
-- ============================================================
-- LexCore — Audit log de exportação de Análise Completa
-- Projeto: xqlrfsrjvqmucchzpapk
-- Execute no SQL Editor: https://supabase.com/dashboard/project/xqlrfsrjvqmucchzpapk/sql/new
--
-- Pré-requisito: migration_multitenancy.sql já aplicada (usa
-- set_tenant_id_from_auth(), current_tenant_id(), is_super_admin()).
-- ============================================================

create table if not exists lexcore_export_logs (
  id            uuid primary key default gen_random_uuid(),
  analise_id    uuid not null references lexcore_analises(id) on delete cascade,
  tenant_id     uuid references tenants(id),
  usuario_id    uuid references auth.users(id),
  usuario_email text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_lexcore_export_logs_analise on lexcore_export_logs(analise_id);
create index if not exists idx_lexcore_export_logs_tenant  on lexcore_export_logs(tenant_id);

alter table lexcore_export_logs enable row level security;

drop trigger if exists trg_set_tenant_id on lexcore_export_logs;
create trigger trg_set_tenant_id before insert on lexcore_export_logs
  for each row execute function set_tenant_id_from_auth();

drop policy if exists tenant_isolation on lexcore_export_logs;
create policy tenant_isolation on lexcore_export_logs for all to authenticated
  using (tenant_id = current_tenant_id() or is_super_admin())
  with check (tenant_id = current_tenant_id() or is_super_admin());

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Aplicar a migration**

Cole o conteúdo do arquivo no SQL Editor do Supabase (link no cabeçalho do arquivo) e execute. Confirme que não retornou erro.

- [ ] **Step 3: Escrever o script de verificação**

Crie `scripts/verify-lexcore-export-logs-db.mjs`:

```js
// Verificação manual (usa Supabase real) — confirma que a tabela
// lexcore_export_logs existe e aceita insert via service role com o
// schema esperado pelo endpoint api/lexcore-analise-exportar.js.
// Uso: node scripts/verify-lexcore-export-logs-db.mjs
// Pré-requisito: SUPABASE_SERVICE_KEY no .env, migration já aplicada,
// e pelo menos uma linha em lexcore_analises (usa a mais recente).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: analise, error: eA } = await sb.from('lexcore_analises').select('id, tenant_id').limit(1).single();
assert.equal(eA, null, `precisa de pelo menos 1 lexcore_analises pra testar: ${eA?.message}`);

const { data: created, error: eCreate } = await sb.from('lexcore_export_logs').insert({
  analise_id: analise.id,
  tenant_id: analise.tenant_id,
  usuario_id: null,
  usuario_email: 'verify-script@teste.local',
}).select().single();
assert.equal(eCreate, null, `insert falhou: ${eCreate?.message}`);
console.log('OK: insert em lexcore_export_logs —', created.id);

await sb.from('lexcore_export_logs').delete().eq('id', created.id);
console.log('OK: linha de teste removida.');
```

- [ ] **Step 4: Rodar e confirmar**

Run: `node scripts/verify-lexcore-export-logs-db.mjs`
Expected: duas linhas `OK:` sem erro de assert.

- [ ] **Step 5: Commit**

```bash
git add supabase/migration_lexcore_export_logs.sql scripts/verify-lexcore-export-logs-db.mjs
git commit -m "feat(lexcore): tabela lexcore_export_logs (audit log de exportação)"
```

---

## Task 3: Gerador do `.docx` da Análise Completa

**Files:**
- Create: `src/lib/lexcoreAnaliseDocx.js`
- Create: `scripts/verify-lexcore-analise-docx.mjs`

**Interfaces:**
- Consumes: `sanitizeStorageFileName` de `./storageSafeName.js` (Task 1); `TIPOS_PROBLEMA`, `labelTipoProblema` de `./lexcoreLegal.js` (já existe).
- Produces: `buildLexcoreAnaliseDocx({ nomeEdital, numeroProcesso, dataAnaliseISO, orgaoNome, pontos }): Promise<Buffer>` e `nomeArquivoAnalise({ nomeEdital, numeroProcesso }): string`. `pontos` é array no formato camelCase de `pontoFromDb` (`lexcoreDb.js`): `{ trechoEdital, tipoProblema, descricaoProblema, fundamentacaoLegal, artigoLei, nivelRisco }` — **não** o formato snake_case cru da IA (mesma distinção documentada em `lexcoreLegal.js`).

- [ ] **Step 1: Criar o gerador**

Crie `src/lib/lexcoreAnaliseDocx.js`:

```js
// LexCore — gerador do .docx de "Análise Completa" (relatório informal
// com todos os pontos críticos de uma análise, independente de seleção).
// Node/Vercel only. Não confundir com lexcoreDocx.js (esse gera a peça
// jurídica formal — Impugnação/Recurso/Contrarrazões/Petição).
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageNumber, Footer } from "docx";
import { sanitizeStorageFileName } from "./storageSafeName.js";
import { TIPOS_PROBLEMA, labelTipoProblema } from "./lexcoreLegal.js";

const NIVEIS_RISCO = ["alto", "medio", "baixo"];
const RISCO_LABEL = { alto: "RISCO ALTO", medio: "RISCO MÉDIO", baixo: "RISCO BAIXO" };
// Mesmos tons de RISCO_COLOR em src/App.jsx, sem o "#" (TextRun.color espera hex puro).
const RISCO_COLOR_HEX = { alto: "b91c1c", medio: "b45309", baixo: "15803d" };

function contarPorNivel(pontos) {
  return NIVEIS_RISCO.map(nivel => ({ nivel, itens: pontos.filter(p => p.nivelRisco === nivel) }));
}

function formatarData(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? "—" : d.toLocaleDateString("pt-BR");
}

export async function buildLexcoreAnaliseDocx({ nomeEdital, numeroProcesso, dataAnaliseISO, orgaoNome, pontos }) {
  const grupos = contarPorNivel(pontos);
  const children = [
    new Paragraph({
      children: [new TextRun({ text: "ANÁLISE DE EDITAL — RELATÓRIO DE PONTOS CRÍTICOS", bold: true, size: 26 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `${nomeEdital || "Edital sem nome"} — Processo nº ${numeroProcesso || "Sem número"}`,
        size: 20, italics: true,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `Órgão: ${orgaoNome || "não informado"}    |    Data da análise: ${formatarData(dataAnaliseISO)}`,
        size: 18, color: "555555",
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "RESUMO EXECUTIVO", bold: true, size: 22 })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Total de pontos críticos identificados: ${pontos.length}`, size: 20 })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `Risco Alto: ${grupos.find(g => g.nivel === "alto").itens.length}   |   Risco Médio: ${grupos.find(g => g.nivel === "medio").itens.length}   |   Risco Baixo: ${grupos.find(g => g.nivel === "baixo").itens.length}`,
        size: 20,
      })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: TIPOS_PROBLEMA.map(t => `${t.label}: ${pontos.filter(p => p.tipoProblema === t.value).length}`).join("   |   "),
        size: 20,
      })],
      spacing: { after: 300 },
    }),
  ];

  grupos.filter(g => g.itens.length > 0).forEach(g => {
    children.push(new Paragraph({
      children: [new TextRun({ text: `${RISCO_LABEL[g.nivel]} (${g.itens.length})`, bold: true, size: 22, color: RISCO_COLOR_HEX[g.nivel] })],
      spacing: { before: 200, after: 120 },
    }));

    g.itens.forEach(p => {
      children.push(new Paragraph({
        children: [new TextRun({
          text: `${labelTipoProblema(p.tipoProblema)}${p.artigoLei ? ` — ${p.artigoLei}` : ""}`,
          bold: true, size: 20,
        })],
        spacing: { after: 60 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: p.descricaoProblema, size: 20 })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 80, line: 300 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: `"${p.trechoEdital}"`, italics: true, size: 19, color: "555555" })],
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: 400 },
        spacing: { after: 80, line: 300 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: `Fundamentação: ${p.fundamentacaoLegal}`, size: 19 })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 240, line: 300 },
      }));
    });
  });

  const doc = new Document({
    creator: "LicitaGov — LexCore",
    title: `Análise de Edital — ${nomeEdital || "sem nome"}`,
    styles: {
      default: { document: { run: { font: "Calibri" } } },
    },
    sections: [{
      properties: { page: { margin: { top: 1700, bottom: 1700, left: 1700, right: 1134 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              text: `Documento gerado por LexCore — GovCore em ${new Date().toLocaleString("pt-BR")} — página `,
              size: 15, color: "888888",
            }), new TextRun({ children: [PageNumber.CURRENT], size: 15, color: "888888" })],
          })],
        }),
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}

export function nomeArquivoAnalise({ nomeEdital, numeroProcesso }) {
  const dataSlug = new Date().toISOString().slice(0, 10);
  const base = sanitizeStorageFileName(nomeEdital || "edital");
  const proc = numeroProcesso ? sanitizeStorageFileName(String(numeroProcesso)) : "sem_numero";
  return `Analise_${base}_${proc}_${dataSlug}.docx`;
}
```

- [ ] **Step 2: Escrever o script de verificação**

Crie `scripts/verify-lexcore-analise-docx.mjs`:

```js
// Verificação standalone (sem Supabase) — confirma que
// buildLexcoreAnaliseDocx gera um buffer .docx válido (assinatura ZIP/PK)
// e que nomeArquivoAnalise sanitiza corretamente.
// Uso: node scripts/verify-lexcore-analise-docx.mjs
import assert from 'node:assert/strict';
import { buildLexcoreAnaliseDocx, nomeArquivoAnalise } from '../src/lib/lexcoreAnaliseDocx.js';

const pontosDeTeste = [
  { trechoEdital: "Exige-se capital social de 30%.", tipoProblema: "ilegal", descricaoProblema: "Extrapola o limite legal.", fundamentacaoLegal: "Art. 69, I da Lei 14.133/2021.", artigoLei: "Art. 69, I", nivelRisco: "alto" },
  { trechoEdital: "Prazo de entrega de 2 dias úteis.", tipoProblema: "restritivo", descricaoProblema: "Prazo exíguo demais.", fundamentacaoLegal: "Princípio da competitividade.", artigoLei: "", nivelRisco: "medio" },
];

const buf = await buildLexcoreAnaliseDocx({
  nomeEdital: "Pregão Eletrônico nº 004/2026",
  numeroProcesso: "2026.004.0001",
  dataAnaliseISO: new Date().toISOString(),
  orgaoNome: "Prefeitura de Teste",
  pontos: pontosDeTeste,
});
assert.ok(Buffer.isBuffer(buf), "esperado um Buffer");
assert.ok(buf.length > 1000, "buffer parece pequeno demais pra um .docx válido");
assert.equal(buf.slice(0, 2).toString(), "PK", "assinatura ZIP/PK ausente — .docx inválido");
console.log(`OK: .docx gerado, ${buf.length} bytes, assinatura PK válida.`);

const buf0 = await buildLexcoreAnaliseDocx({ nomeEdital: "Teste vazio", numeroProcesso: null, dataAnaliseISO: null, orgaoNome: null, pontos: [] });
assert.ok(buf0.length > 500, "deve gerar documento mesmo com 0 pontos");
console.log("OK: gera .docx mesmo com 0 pontos críticos.");

const nome = nomeArquivoAnalise({ nomeEdital: "Pregão Eletrônico nº 004/2026", numeroProcesso: "2026.004.0001" });
assert.match(nome, /^Analise_Pregao_Eletronico_n__004_2026_2026_004_0001_\d{4}-\d{2}-\d{2}\.docx$/);
console.log("OK: nomeArquivoAnalise —", nome);

const nomeSemProcesso = nomeArquivoAnalise({ nomeEdital: "Edital X", numeroProcesso: "" });
assert.match(nomeSemProcesso, /^Analise_Edital_X_sem_numero_\d{4}-\d{2}-\d{2}\.docx$/);
console.log("OK: nomeArquivoAnalise sem número de processo —", nomeSemProcesso);
```

- [ ] **Step 3: Rodar e confirmar**

Run: `node scripts/verify-lexcore-analise-docx.mjs`
Expected: quatro linhas `OK:`, sem erro de assert. Se o regex do nome de arquivo não bater exatamente, ajuste o assert pro output real impresso (a lógica de sanitização é a fonte de verdade, não o regex do teste).

- [ ] **Step 4: Commit**

```bash
git add src/lib/lexcoreAnaliseDocx.js scripts/verify-lexcore-analise-docx.mjs
git commit -m "feat(lexcore): gerador .docx da Análise Completa (todos os pontos críticos)"
```

---

## Task 4: Endpoint serverless `api/lexcore-analise-exportar.js`

**Files:**
- Create: `api/lexcore-analise-exportar.js`

**Interfaces:**
- Consumes: `buildLexcoreAnaliseDocx`, `nomeArquivoAnalise` de `../src/lib/lexcoreAnaliseDocx.js` (Task 3).
- Produces: `POST /api/lexcore-analise-exportar` — body `{ analiseId, nomeEdital, numeroProcesso, orgaoNome, dataAnaliseISO, pontos, tenantId, usuarioId, usuarioEmail }` → `200 { docxUrl }` ou `4xx/5xx { error }`.

- [ ] **Step 1: Criar o endpoint**

Crie `api/lexcore-analise-exportar.js`:

```js
import { createClient } from '@supabase/supabase-js';
import { buildLexcoreAnaliseDocx, nomeArquivoAnalise } from '../src/lib/lexcoreAnaliseDocx.js';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const BUCKET = 'lexcore-docs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel' });

  const { analiseId, nomeEdital, numeroProcesso, orgaoNome, dataAnaliseISO, pontos, tenantId, usuarioId, usuarioEmail } = req.body || {};
  if (!analiseId) return res.status(400).json({ error: 'analiseId é obrigatório' });
  if (!Array.isArray(pontos)) return res.status(400).json({ error: 'pontos precisa ser um array (pode ser vazio)' });

  const sb = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let docxUrl;
  try {
    const docxBuf = await buildLexcoreAnaliseDocx({ nomeEdital, numeroProcesso, dataAnaliseISO, orgaoNome, pontos });
    const nomeArquivo = nomeArquivoAnalise({ nomeEdital, numeroProcesso });
    const path = `analises/${analiseId}/${nomeArquivo}`;

    const upload = await sb.storage.from(BUCKET).upload(path, docxBuf, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });
    if (upload.error) throw upload.error;

    docxUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }

  // Audit log é best-effort: se falhar, não deve impedir o download do
  // relatório que já foi gerado com sucesso — só loga no console do Vercel.
  try {
    await sb.from('lexcore_export_logs').insert({
      analise_id: analiseId,
      tenant_id: tenantId || null,
      usuario_id: usuarioId || null,
      usuario_email: usuarioEmail || null,
    });
  } catch (logErr) {
    console.error('lexcore-analise-exportar: falha ao gravar audit log', logErr);
  }

  return res.json({ docxUrl });
}
```

- [ ] **Step 2: Testar manualmente contra produção (depois do deploy do Task 6)**

Este endpoint depende do deploy (Vercel), então o teste real só é possível depois que o código estiver em produção. Fica marcado aqui como pendência a validar junto do checklist do Task 7 — não bloqueia o commit deste arquivo isoladamente.

- [ ] **Step 3: Commit**

```bash
git add api/lexcore-analise-exportar.js
git commit -m "feat(lexcore): endpoint /api/lexcore-analise-exportar (gera e sobe o .docx)"
```

---

## Task 5: Client data layer — `exportarAnaliseDocx`

**Files:**
- Modify: `src/lib/lexcoreDb.js`

**Interfaces:**
- Consumes: `getSupabase` (já importado no topo do arquivo).
- Produces: `exportarAnaliseDocx({ analiseId, nomeEdital, numeroProcesso, orgaoNome, dataAnaliseISO, pontos, tenantId }): Promise<string>` — retorna `docxUrl` ou lança erro (mesmo padrão de `exportarPecaDocx`, que já lança em vez de retornar `{error}`).

- [ ] **Step 1: Adicionar a função**

Abra `src/lib/lexcoreDb.js`. Adicione, logo depois da função `exportarPecaDocx` existente (final do arquivo):

```js
// ── Exportação da Análise Completa (relatório informal, todos os pontos) ─
// Diferente de exportarPecaDocx: não cria/atualiza registro em
// lexcore_pecas — é um download direto, sem passar pelo fluxo de peça
// jurídica formal. Busca o usuário autenticado aqui (mesmo padrão de
// sbCreateLexcoreAnalise) porque o endpoint roda com service role e não
// tem acesso à sessão do usuário.
export async function exportarAnaliseDocx({ analiseId, nomeEdital, numeroProcesso, orgaoNome, dataAnaliseISO, pontos, tenantId }) {
  const sb = getSupabase();
  const { data: userData } = await sb.auth.getUser();

  const resp = await fetch('/api/lexcore-analise-exportar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analiseId, nomeEdital, numeroProcesso, orgaoNome, dataAnaliseISO,
      pontos: pontos.map(p => ({
        trechoEdital: p.trechoEdital,
        tipoProblema: p.tipoProblema,
        descricaoProblema: p.descricaoProblema,
        fundamentacaoLegal: p.fundamentacaoLegal,
        artigoLei: p.artigoLei,
        nivelRisco: p.nivelRisco,
      })),
      tenantId: tenantId || null,
      usuarioId: userData?.user?.id || null,
      usuarioEmail: userData?.user?.email || null,
    }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || 'Erro ao exportar análise completa');
  return json.docxUrl;
}
```

- [ ] **Step 2: Checar que o arquivo ainda importa/exporta sem erro de sintaxe**

Run: `node --check src/lib/lexcoreDb.js`
Expected: sem output (sucesso silencioso — `node --check` só imprime em caso de erro de sintaxe).

- [ ] **Step 3: Commit**

```bash
git add src/lib/lexcoreDb.js
git commit -m "feat(lexcore): exportarAnaliseDocx em lexcoreDb.js"
```

---

## Task 6: UI — botão "Exportar Análise Completa"

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `exportarAnaliseDocx` de `./lib/lexcoreDb.js` (Task 5); `useAuth` de `./contexts/AuthContext.jsx` (já importado no arquivo).
- Produces: nada consumido por outra task — é a ponta final da feature.

- [ ] **Step 1: Adicionar o ícone "download" ao sistema de ícones**

No objeto `d` dentro de `function Icon({ name, size=16, ... })` (por volta da linha 135, junto dos outros ícones), adicione uma entrada nova. Localize a linha do ícone `install`:

```js
    install:    <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
```

E logo abaixo dela adicione:

```js
    download:   <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
```

(mesmo desenho do `install` — visualmente é o glifo padrão de "download"; nome separado por clareza semântica, já que `install` é usado especificamente pro prompt de instalação do PWA em outro lugar do arquivo.)

- [ ] **Step 2: Importar `exportarAnaliseDocx`**

Localize o bloco de import de `lexcoreDb.js` no topo do arquivo (por volta da linha 26-28):

```js
  sbListLexcoreAnalises, sbCreateLexcoreAnalise, sbUpdateLexcoreAnalise, sbDeleteLexcoreAnalise,
  sbGetLexcoreAnalise, sbListPontosCriticos, sbInsertPontosCriticos, sbSetPontoSelecionado,
```

Adicione `exportarAnaliseDocx` na lista de nomes importados desse mesmo `import { ... } from "./lib/lexcoreDb.js"` (não crie um segundo `import` — é o mesmo bloco existente, só acrescenta o nome).

- [ ] **Step 3: Passar `impersonating` até `TabLexCore`**

Localize a linha (por volta de 4705):

```jsx
              {tab==="lexcore" && <TabLexCore toast={showToast} />}
```

Troque por:

```jsx
              {tab==="lexcore" && <TabLexCore toast={showToast} impersonating={impersonating} />}
```

(`impersonating` já está em escopo em `AuthedApp`, é o mesmo state usado no banner "Visualizando como" logo acima nesse componente.)

- [ ] **Step 4: Receber e repassar `impersonating` dentro de `TabLexCore`**

Localize `function TabLexCore({ toast }) {` (linha 2957) e troque por:

```jsx
function TabLexCore({ toast, impersonating }) {
```

Dentro do corpo de `TabLexCore`, localize onde `<LexcoreAnalise` é renderizado (por volta da linha 3029):

```jsx
      <LexcoreAnalise
```

Adicione a prop `impersonating={impersonating}` nessa chamada, junto das outras props já passadas (`analiseId`, `isMobile`, `toast`, `onVoltar`, `onAbrirPeca`, `onIrGerarPeca`).

- [ ] **Step 5: Adicionar o botão e o handler em `LexcoreAnalise`**

Localize a assinatura (linha 3343):

```jsx
function LexcoreAnalise({ analiseId, isMobile, toast, onVoltar, onAbrirPeca, onIrGerarPeca }) {
```

Troque por:

```jsx
function LexcoreAnalise({ analiseId, isMobile, toast, onVoltar, onAbrirPeca, onIrGerarPeca, impersonating }) {
```

Logo depois da linha `const [loading, setLoading] = useState(true);` (linha 3347), adicione:

```jsx
  const [exportando, setExportando] = useState(false);
  const { prefeitura, tenantId: meuTenantId } = useAuth();
  const orgaoNome = impersonating?.nome || prefeitura;
  const tenantIdParaLog = impersonating?.tenantId || meuTenantId;
```

Depois da função `togglePonto` (antes de `const selecionados = pontos.filter(p => p.selecionado);`, linha ~3370), adicione:

```jsx
  const exportarCompleta = async () => {
    setExportando(true);
    try {
      const docxUrl = await exportarAnaliseDocx({
        analiseId,
        nomeEdital: analise.nomeEdital,
        numeroProcesso: analise.numeroProcesso,
        orgaoNome,
        dataAnaliseISO: analise.createdAt,
        pontos,
        tenantId: tenantIdParaLog,
      });
      window.open(docxUrl, "_blank", "noopener");
      toast("Análise completa exportada");
    } catch (err) {
      toast("Erro ao exportar análise: " + err.message, "error");
    } finally {
      setExportando(false);
    }
  };
```

Agora localize o bloco da barra de ações sticky (linhas 3406-3417):

```jsx
      {pontos.length > 0 && (
        <div style={{
          position: isMobile ? "static" : "sticky", bottom: isMobile ? "auto" : 0,
          background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16,
          display:"flex", gap:12, alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", marginTop:8, boxShadow:"0 -2px 12px rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontSize:12.5, color:C.sub }}>{selecionados.length} ponto(s) selecionado(s) para gerar peça</div>
          <Btn color={SX.laranja} onClick={() => onIrGerarPeca(analiseId)} disabled={selecionados.length === 0}>
            <Icon name="sparkle" size={14} /> Gerar Peça Jurídica
          </Btn>
        </div>
      )}
```

Troque por (a condição do bloco passa a incluir status "concluida" mesmo com 0 pontos, e o botão novo fica ao lado do existente, sem depender de `selecionados`):

```jsx
      {(pontos.length > 0 || analise.status === "concluida") && (
        <div style={{
          position: isMobile ? "static" : "sticky", bottom: isMobile ? "auto" : 0,
          background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16,
          display:"flex", gap:12, alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", marginTop:8, boxShadow:"0 -2px 12px rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontSize:12.5, color:C.sub }}>{selecionados.length} ponto(s) selecionado(s) para gerar peça</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <Btn variant="outline" color={SX.laranja} onClick={exportarCompleta} disabled={exportando}>
              <Icon name="download" size={14} /> {exportando ? "Exportando..." : "Exportar Análise Completa"}
            </Btn>
            {pontos.length > 0 && (
              <Btn color={SX.laranja} onClick={() => onIrGerarPeca(analiseId)} disabled={selecionados.length === 0}>
                <Icon name="sparkle" size={14} /> Gerar Peça Jurídica
              </Btn>
            )}
          </div>
        </div>
      )}
```

- [ ] **Step 6: Build local**

Run: `npm run build`
Expected: build termina sem erro (mesmo processo já usado em toda mudança anterior do LexCore — `vite build` reclama de qualquer erro de sintaxe/import quebrado).

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "feat(lexcore): botão Exportar Análise Completa na tela de detalhe da análise"
```

- [ ] **Step 8: Push (deploy automático via Vercel)**

```bash
git push
```

---

## Task 7: Checklist de teste manual (validar antes de considerar pronto)

Depois do deploy (Task 6, Step 8), aguardar o Vercel concluir e validar manualmente em produção (`https://licitagov-one.vercel.app`):

- [ ] Login como super_admin → "Minha Área" (ou como um usuário `cliente` direto) → aba LexCore → abrir uma análise já `concluida` com pontos críticos.
- [ ] Botão "Exportar Análise Completa" aparece ao lado de "Gerar Peça Jurídica", com ícone de download.
- [ ] Clicar sem selecionar nenhum checkbox → o `.docx` baixa mesmo assim (não depende de seleção).
- [ ] Abrir o `.docx` baixado — conferir: título, nome do edital, número de processo, nome do órgão, data da análise, resumo executivo com as contagens corretas, pontos agrupados por risco (Alto primeiro), cada ponto com categoria/artigo/descrição/trecho citado/fundamentação, rodapé com "Documento gerado por LexCore — GovCore" + data/hora.
- [ ] Nome do arquivo baixado segue o padrão `Analise_{nome}_{numero-ou-sem_numero}_{data}.docx`, sem acentos quebrados.
- [ ] Testar numa análise sem número de processo → cabeçalho do `.docx` mostra "Sem número" e o nome do arquivo usa "sem_numero".
- [ ] Testar numa análise com nome de edital cheio de acento (ex.: "Pregão Eletrônico nº 004/2026 — Prefeitura de São Gonçalo") → download funciona sem erro `Invalid key`.
- [ ] Conferir na tabela `lexcore_export_logs` (via `scripts/verify-lexcore-export-logs-db.mjs` adaptado, ou SQL Editor) que uma linha nova foi criada com `usuario_email` correto após cada exportação.
- [ ] Testar com "Acessar como" uma prefeitura ativo → exportar → conferir que `tenant_id` gravado em `lexcore_export_logs` é o da prefeitura impersonada, **não** o do super_admin (valida que o workaround do tenantId explícito funcionou).
- [ ] Simular erro (ex.: desligar a internet no meio do clique, ou revisar código temporariamente pra forçar falha) → confirma que aparece toast de erro claro e o botão volta ao estado normal (não fica travado em "Exportando...").
- [ ] Testar em mobile (viewport estreito) → botões não quebram o layout, ambos continuam clicáveis.
- [ ] `npm run build` limpo (já coberto no Task 6, Step 6, mas reconfirmar depois de qualquer ajuste feito durante a validação manual).

---

## Riscos e limitações conhecidas (não resolvidos por este plano)

- O bug de "Acessar como" gravar dados no tenant errado (ver Global Constraints) **continua existindo pra todo o resto do LexCore** (análises, peças) — este plano só evita que o *audit log novo* sofra do mesmo problema, passando `tenantId` explícito. Corrigir o bug na raiz (fazer "Acessar como" trocar a sessão de verdade) é fora de escopo aqui.
- Não há UI pra visualizar `lexcore_export_logs` — a spec pediu só "registrar", não "exibir". Se quiser uma tela de auditoria depois, é uma feature separada.
