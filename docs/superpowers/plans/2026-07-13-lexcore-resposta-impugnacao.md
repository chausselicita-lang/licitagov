# LexCore — Respostas a Impugnação/Recurso Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second, fully independent section inside the LexCore tab where the user attaches the PDF of an impugnação or recurso they *received* and the AI drafts the órgão's resposta/contrarrazão defending the edital — with zero dependency on the existing edital-analysis flow.

**Architecture:** New Supabase table `lexcore_respostas` (no FK to `lexcore_analises`), a parallel set of lib files (`lexcoreRespostaLegal.js`, `lexcoreRespostaDb.js`) mirroring the existing `lexcoreLegal.js`/`lexcoreDb.js` patterns, a new export API route, and three new React components wired into `TabLexCore` behind a section toggle. The existing análise-de-edital flow (`LexcoreNova`, `LexcoreAnalise`, `LexcorePeca`, `lexcoreDb.js`, `lexcoreLegal.js`, `api/lexcore-exportar.js`, `api/lexcore-upload.js`, `lexcore_pecas` table) is not modified except for one additive line in `lexcoreDocx.js`.

**Tech Stack:** React 18 (no build step beyond Vite, no TypeScript), Supabase (Postgres + Storage), Claude API via `/api/claude` proxy (Vercel serverless), `docx` npm package for .docx generation, Playwright for manual E2E.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-13-lexcore-resposta-impugnacao-design.md` — read it before starting; this plan implements it 1:1.
- Do not edit `LexcoreNova`, `LexcoreAnalise`, `LexcorePeca`, `src/lib/lexcoreDb.js`, `src/lib/lexcoreLegal.js`, `api/lexcore-exportar.js`, `api/lexcore-upload.js`, `supabase/migration_lexcore.sql`. The only permitted touch to an existing file's *content* is one additive line in `src/lib/lexcoreDocx.js` (Task 3) and the `TabLexCore` function body in `src/App.jsx` (Task 6) — nothing else in those files changes.
- No new npm dependencies — everything needed (`@supabase/supabase-js`, `docx`) is already installed.
- All Supabase table/column names use `snake_case`; all JS object keys returned to components use `camelCase` (matches the existing `pecaFromDb`/`analiseFromDb` convention in `lexcoreDb.js`).
- `git add` only the exact files each task lists — the working tree has unrelated pre-existing uncommitted changes (from other work) that must not be staged or committed.
- This project has no unit-test framework installed (no jest/vitest) — pure-logic files are verified with small standalone `node:assert` scripts run via `node scripts/*.mjs`, matching the existing `scripts/diag-lexcore.mjs` convention. UI is verified via `npm run build` + manual browser check + the Playwright E2E in Task 7 (real APIs, manual-only, matches `tests/lexcore-flow.spec.mjs`).

---

## Task 1: Database table `lexcore_respostas`

**Files:**
- Create: `supabase/migration_lexcore_respostas.sql`
- Create: `scripts/verify-lexcore-resposta-db.mjs`

**Interfaces:**
- Produces: table `lexcore_respostas` with columns `id, tipo_resposta, nome_referencia, numero_processo, arquivo_origem_url, conteudo_gerado, status, versao, arquivo_docx_url, criado_por, created_at, updated_at`. `tipo_resposta` check constraint accepts exactly `'resposta_impugnacao'` and `'contrarrazoes'`. `status` check constraint accepts `'rascunho'` and `'finalizada'`. RLS policy `allow_auth` (same simple pattern as the other LexCore tables).

- [ ] **Step 1: Write the verification script (fails until the migration is applied)**

Create `scripts/verify-lexcore-resposta-db.mjs`:

```js
// Verificação manual (usa Supabase real) — cria, lê, atualiza e apaga uma
// resposta de teste na tabela lexcore_respostas para confirmar que a
// migration foi aplicada e o schema bate com lexcoreRespostaDb.js.
// Uso: node scripts/verify-lexcore-resposta-db.mjs
// Pré-requisito: SUPABASE_SERVICE_KEY no .env (mesmo usado por diag-lexcore.mjs)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
);

const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY não encontrada no .env');

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: created, error: eCreate } = await sb.from('lexcore_respostas').insert({
  tipo_resposta: 'resposta_impugnacao',
  nome_referencia: 'Pregão de teste — verify script',
  numero_processo: '2026.999.VERIFY',
  conteudo_gerado: 'Conteúdo de teste gerado pelo script de verificação.',
}).select().single();
assert.equal(eCreate, null, `insert falhou: ${eCreate?.message}`);
assert.equal(created.status, 'rascunho');
console.log('OK: insert em lexcore_respostas —', created.id);

const { data: fetched, error: eGet } = await sb.from('lexcore_respostas').select('*').eq('id', created.id).single();
assert.equal(eGet, null);
assert.equal(fetched.tipo_resposta, 'resposta_impugnacao');
console.log('OK: select por id');

const { data: updated, error: eUpdate } = await sb.from('lexcore_respostas')
  .update({ status: 'finalizada' }).eq('id', created.id).select().single();
assert.equal(eUpdate, null);
assert.equal(updated.status, 'finalizada');
console.log('OK: update de status');

const { error: eDelete } = await sb.from('lexcore_respostas').delete().eq('id', created.id);
assert.equal(eDelete, null);
console.log('OK: delete');

console.log('\n✅ Tabela lexcore_respostas validada de ponta a ponta (insert/select/update/delete)');
```

- [ ] **Step 2: Run it to confirm it fails (table doesn't exist yet)**

Run: `node scripts/verify-lexcore-resposta-db.mjs`
Expected: FAIL — error message containing `relation "lexcore_respostas" does not exist` (or similar Postgres "does not exist" error surfaced via `eCreate`/the thrown assertion).

- [ ] **Step 3: Write the migration**

Create `supabase/migration_lexcore_respostas.sql`:

```sql
-- ============================================================
-- LicitaGov — LexCore: Respostas a Impugnação/Recurso
-- Projeto: xqlrfsrjvqmucchzpapk
--
-- Card independente da análise de edital: o usuário anexa o PDF de uma
-- impugnação ou recurso RECEBIDO e a IA redige a resposta/contrarrazão de
-- defesa em nome do órgão licitante. Sem FK para lexcore_analises —
-- independência real do fluxo de análise (ver
-- docs/superpowers/specs/2026-07-13-lexcore-resposta-impugnacao-design.md).
-- ============================================================

create table if not exists lexcore_respostas (
  id                  uuid primary key default gen_random_uuid(),
  tipo_resposta       text not null
                        check (tipo_resposta in ('resposta_impugnacao', 'contrarrazoes')),
  nome_referencia     text,
  numero_processo     text,
  arquivo_origem_url  text,
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

-- Reaproveita o bucket "lexcore-docs" já criado em migration_lexcore.sql —
-- não precisa de bucket novo nem de policy nova de storage.

notify pgrst, 'reload schema';
```

- [ ] **Step 4: Apply the migration**

This project has no CLI migration runner — SQL migrations are applied manually via the Supabase Dashboard SQL Editor (same process used for `supabase/migration_lexcore.sql`). Open the Supabase Dashboard for project `xqlrfsrjvqmucchzpapk` → SQL Editor → paste the contents of `supabase/migration_lexcore_respostas.sql` → Run.

- [ ] **Step 5: Run the verification script again to confirm it passes**

Run: `node scripts/verify-lexcore-resposta-db.mjs`
Expected:
```
OK: insert em lexcore_respostas — <uuid>
OK: select por id
OK: update de status
OK: delete

✅ Tabela lexcore_respostas validada de ponta a ponta (insert/select/update/delete)
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migration_lexcore_respostas.sql scripts/verify-lexcore-resposta-db.mjs
git commit -m "feat: adiciona tabela lexcore_respostas (card independente de Respostas a Impugnação/Recurso)"
```

---

## Task 2: `lexcoreRespostaLegal.js` — tipos e prompts de IA

**Files:**
- Create: `src/lib/lexcoreRespostaLegal.js`
- Create: `scripts/test-lexcore-resposta-legal.mjs`
- Test: `scripts/test-lexcore-resposta-legal.mjs` (same file — pure `node:assert` script, no framework)

**Interfaces:**
- Consumes: nothing (pure module, no imports beyond none needed).
- Produces (used by Task 6's UI components and Task 4's exports):
  - `TIPOS_RESPOSTA: Array<{value: 'resposta_impugnacao'|'contrarrazoes', label: string}>`
  - `labelTipoResposta(tipo: string): string`
  - `buildRespostaSystem(tipoRespostaLabel: string): string`
  - `buildRespostaUserText({ tipoRespostaLabel, nomeReferencia, numeroProcesso }): string`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-lexcore-resposta-legal.mjs`:

```js
// Teste unitário puro (sem rede) — src/lib/lexcoreRespostaLegal.js
// Uso: node scripts/test-lexcore-resposta-legal.mjs
import assert from 'node:assert/strict';
import {
  TIPOS_RESPOSTA, labelTipoResposta, buildRespostaSystem, buildRespostaUserText,
} from '../src/lib/lexcoreRespostaLegal.js';

// TIPOS_RESPOSTA tem exatamente os 2 valores aceitos pelo check constraint
// de lexcore_respostas.tipo_resposta (supabase/migration_lexcore_respostas.sql)
assert.deepEqual(TIPOS_RESPOSTA.map(t => t.value), ['resposta_impugnacao', 'contrarrazoes']);
console.log('OK: TIPOS_RESPOSTA bate com o check constraint da migration');

assert.equal(labelTipoResposta('resposta_impugnacao'), 'Resposta à Impugnação');
assert.equal(labelTipoResposta('contrarrazoes'), 'Contrarrazões');
assert.equal(labelTipoResposta('tipo_inexistente'), 'tipo_inexistente');
console.log('OK: labelTipoResposta');

const sys = buildRespostaSystem('Resposta à Impugnação');
assert.ok(sys.includes('ÓRGÃO LICITANTE'), 'system prompt deve deixar claro que a IA fala pelo órgão, não pelo impugnante');
assert.ok(sys.includes('Resposta à Impugnação'));
console.log('OK: buildRespostaSystem');

const userText = buildRespostaUserText({ tipoRespostaLabel: 'Contrarrazões', nomeReferencia: 'Pregão 01/2026', numeroProcesso: '2026.1' });
assert.ok(userText.includes('Pregão 01/2026'));
assert.ok(userText.includes('2026.1'));
assert.ok(userText.includes('Contrarrazões'));
console.log('OK: buildRespostaUserText com campos preenchidos');

const userTextVazio = buildRespostaUserText({ tipoRespostaLabel: 'Contrarrazões', nomeReferencia: '', numeroProcesso: '' });
assert.ok(userTextVazio.includes('não informado'));
console.log('OK: buildRespostaUserText com campos vazios');

console.log('\n✅ Todos os testes de lexcoreRespostaLegal.js passaram');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/test-lexcore-resposta-legal.mjs`
Expected: FAIL — `Cannot find module '.../src/lib/lexcoreRespostaLegal.js'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/lexcoreRespostaLegal.js`:

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node scripts/test-lexcore-resposta-legal.mjs`
Expected:
```
OK: TIPOS_RESPOSTA bate com o check constraint da migration
OK: labelTipoResposta
OK: buildRespostaSystem
OK: buildRespostaUserText com campos preenchidos
OK: buildRespostaUserText com campos vazios

✅ Todos os testes de lexcoreRespostaLegal.js passaram
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/lexcoreRespostaLegal.js scripts/test-lexcore-resposta-legal.mjs
git commit -m "feat: adiciona prompts de IA do fluxo de Respostas a Impugnação/Recurso"
```

---

## Task 3: `lexcoreDocx.js` — título para o novo tipo de peça

**Files:**
- Modify: `src/lib/lexcoreDocx.js:4-9` (only additive — one new key in `TITULOS_PECA`)
- Create: `scripts/test-lexcore-docx-titulos.mjs`

**Interfaces:**
- Consumes: `nomeArquivoPeca({ tipoPeca, numeroProcesso })` (already exported by this file, unchanged signature).
- Produces: `TITULOS_PECA['resposta_impugnacao'] === "RESPOSTA À IMPUGNAÇÃO"` (internal, not exported — verified indirectly through `nomeArquivoPeca`). The existing `TITULOS_PECA['contrarrazoes']` entry is reused as-is for the `contrarrazoes` resposta type (Task 5's export API passes `tipoResposta` straight through as `tipoPeca`).

- [ ] **Step 1: Write the failing test**

Create `scripts/test-lexcore-docx-titulos.mjs`:

```js
// Teste unitário puro (sem rede) — confirma que a nova entrada em
// TITULOS_PECA (src/lib/lexcoreDocx.js) foi adicionada sem quebrar as
// existentes. TITULOS_PECA não é exportado, então testamos indiretamente
// via nomeArquivoPeca, que é a função pública que a usa.
// Uso: node scripts/test-lexcore-docx-titulos.mjs
import assert from 'node:assert/strict';
import { nomeArquivoPeca } from '../src/lib/lexcoreDocx.js';

assert.equal(nomeArquivoPeca({ tipoPeca: 'resposta_impugnacao' }), 'resposta-impugna-o.docx');
console.log('OK: novo tipo resposta_impugnacao gera nome de arquivo correto');

assert.equal(nomeArquivoPeca({ tipoPeca: 'contrarrazoes' }), 'contrarraz-es-de-recurso.docx');
console.log('OK: tipo contrarrazoes existente continua funcionando (reaproveitado pela resposta)');

assert.equal(nomeArquivoPeca({ tipoPeca: 'impugnacao' }), 'impugna-o-ao-edital.docx');
console.log('OK: tipo impugnacao existente (fluxo de análise, intocado) continua funcionando');

console.log('\n✅ Todos os testes de TITULOS_PECA em lexcoreDocx.js passaram');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/test-lexcore-docx-titulos.mjs`
Expected: FAIL on the first assertion — actual value is `'peca.docx'` (the fallback), not `'resposta-impugna-o.docx'`, because the `resposta_impugnacao` key doesn't exist in `TITULOS_PECA` yet.

- [ ] **Step 3: Add the one new key**

In `src/lib/lexcoreDocx.js`, the current `TITULOS_PECA` map (lines 4-9) reads:

```js
const TITULOS_PECA = {
  impugnacao: "IMPUGNAÇÃO AO EDITAL",
  razoes_recurso: "RAZÕES DE RECURSO ADMINISTRATIVO",
  contrarrazoes: "CONTRARRAZÕES DE RECURSO",
  peticao: "PETIÇÃO",
};
```

Change it to (only the `resposta_impugnacao` line is new — every other line is untouched):

```js
const TITULOS_PECA = {
  impugnacao: "IMPUGNAÇÃO AO EDITAL",
  razoes_recurso: "RAZÕES DE RECURSO ADMINISTRATIVO",
  contrarrazoes: "CONTRARRAZÕES DE RECURSO",
  peticao: "PETIÇÃO",
  resposta_impugnacao: "RESPOSTA À IMPUGNAÇÃO",
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node scripts/test-lexcore-docx-titulos.mjs`
Expected:
```
OK: novo tipo resposta_impugnacao gera nome de arquivo correto
OK: tipo contrarrazoes existente continua funcionando (reaproveitado pela resposta)
OK: tipo impugnacao existente (fluxo de análise, intocado) continua funcionando

✅ Todos os testes de TITULOS_PECA em lexcoreDocx.js passaram
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/lexcoreDocx.js scripts/test-lexcore-docx-titulos.mjs
git commit -m "feat: adiciona titulo RESPOSTA A IMPUGNACAO ao gerador de docx do LexCore"
```

---

## Task 4: `lexcoreRespostaDb.js` — CRUD e helpers de upload/export

**Files:**
- Create: `src/lib/lexcoreRespostaDb.js`

**Interfaces:**
- Consumes: `getSupabase()` from `./supabase.js` (existing, unchanged); `/api/lexcore-upload` (existing endpoint, unchanged); `/api/lexcore-resposta-exportar` (Task 5, produced next — this task's `exportarRespostaDocx` calls it by URL string, so it can be written before Task 5 exists).
- Produces (used by Task 6's UI components):
  - `sbListRespostas(): Promise<{data: Resposta[], error}>`
  - `sbCreateResposta({ tipoResposta, nomeReferencia, numeroProcesso, arquivoOrigemUrl, conteudoGerado }): Promise<{data: Resposta, error}>`
  - `sbGetResposta(id): Promise<{data: Resposta, error}>`
  - `sbUpdateResposta(id, patch: { conteudoGerado?, status?, arquivoDocxUrl?, versao? }): Promise<{data: Resposta, error}>`
  - `sbDeleteResposta(id): Promise<{error}>`
  - `uploadDocumentoRecebido(file: File): Promise<{url: string|null, error}>`
  - `exportarRespostaDocx({ respostaId, tipoResposta, conteudoGerado, nomeReferencia, numeroProcesso }): Promise<{resposta: Resposta, docxUrl: string}>` (throws on non-2xx)
  - `Resposta` shape: `{ id, tipoResposta, nomeReferencia, numeroProcesso, arquivoOrigemUrl, conteudoGerado, status, versao, arquivoDocxUrl, createdAt, updatedAt }`

This is a thin Supabase wrapper mirroring `src/lib/lexcoreDb.js` 1:1 in structure (already a proven, working pattern in production). It has no isolated automated test — like `lexcoreDb.js` itself, it's covered end-to-end by the Playwright test in Task 7, which exercises every function in this file through the real UI against the real database.

- [ ] **Step 1: Write the implementation**

Create `src/lib/lexcoreRespostaDb.js`:

```js
import { getSupabase } from './supabase.js';

function respostaFromDb(row) {
  return {
    id: row.id,
    tipoResposta: row.tipo_resposta,
    nomeReferencia: row.nome_referencia || '',
    numeroProcesso: row.numero_processo || '',
    arquivoOrigemUrl: row.arquivo_origem_url || '',
    conteudoGerado: row.conteudo_gerado || '',
    status: row.status || 'rascunho',
    versao: row.versao || 1,
    arquivoDocxUrl: row.arquivo_docx_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Respostas ──────────────────────────────────────────────────
export async function sbListRespostas() {
  const sb = getSupabase();
  const { data, error } = await sb.from('lexcore_respostas').select('*').order('created_at', { ascending: false });
  if (error) return { data: [], error };
  return { data: data.map(respostaFromDb), error: null };
}

export async function sbCreateResposta({ tipoResposta, nomeReferencia, numeroProcesso, arquivoOrigemUrl, conteudoGerado }) {
  const sb = getSupabase();
  const { data: userData } = await sb.auth.getUser();
  const { data, error } = await sb.from('lexcore_respostas').insert({
    tipo_resposta: tipoResposta,
    nome_referencia: nomeReferencia || null,
    numero_processo: numeroProcesso || null,
    arquivo_origem_url: arquivoOrigemUrl || null,
    conteudo_gerado: conteudoGerado,
    status: 'rascunho',
    criado_por: userData?.user?.id || null,
  }).select().single();
  return { data: data ? respostaFromDb(data) : null, error };
}

export async function sbGetResposta(id) {
  const sb = getSupabase();
  const { data, error } = await sb.from('lexcore_respostas').select('*').eq('id', id).single();
  if (error) return { data: null, error };
  return { data: respostaFromDb(data), error: null };
}

export async function sbUpdateResposta(id, patch) {
  const sb = getSupabase();
  const payload = { updated_at: new Date().toISOString() };
  if ('conteudoGerado' in patch) payload.conteudo_gerado = patch.conteudoGerado;
  if ('status' in patch) payload.status = patch.status;
  if ('arquivoDocxUrl' in patch) payload.arquivo_docx_url = patch.arquivoDocxUrl;
  if ('versao' in patch) payload.versao = patch.versao;
  const { data, error } = await sb.from('lexcore_respostas').update(payload).eq('id', id).select().single();
  return { data: data ? respostaFromDb(data) : null, error };
}

export async function sbDeleteResposta(id) {
  const sb = getSupabase();
  return sb.from('lexcore_respostas').delete().eq('id', id);
}

// ── Upload do documento recebido (impugnação/recurso) ────────────
// Reaproveita o endpoint /api/lexcore-upload já existente (genérico: recebe
// fileName/fileType/fileBase64 e devolve a URL pública no bucket
// lexcore-docs) — endpoint não é alterado por este arquivo.
export async function uploadDocumentoRecebido(file) {
  try {
    const fileBase64 = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = e => resolve(e.target.result.split(',')[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const resp = await fetch('/api/lexcore-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, fileType: file.type, fileBase64 }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { url: null, error: new Error(json.error || 'Erro ao enviar o documento') };
    return { url: json.url, error: null };
  } catch (error) {
    return { url: null, error };
  }
}

// ── Chama a API serverless que gera o .docx e faz upload ────────
export async function exportarRespostaDocx({ respostaId, tipoResposta, conteudoGerado, nomeReferencia, numeroProcesso }) {
  const resp = await fetch('/api/lexcore-resposta-exportar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ respostaId, tipoResposta, conteudoGerado, nomeReferencia, numeroProcesso }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(json.error || 'Erro ao exportar resposta');
    err.payload = json;
    throw err;
  }
  return { resposta: json.resposta ? respostaFromDb(json.resposta) : null, docxUrl: json.docxUrl };
}
```

- [ ] **Step 2: Sanity-check the module loads and exports the expected functions**

Run:
```bash
node -e "import('./src/lib/lexcoreRespostaDb.js').then(m => console.log(Object.keys(m)))"
```
Expected: `[ 'sbListRespostas', 'sbCreateResposta', 'sbGetResposta', 'sbUpdateResposta', 'sbDeleteResposta', 'uploadDocumentoRecebido', 'exportarRespostaDocx' ]`

- [ ] **Step 3: Commit**

```bash
git add src/lib/lexcoreRespostaDb.js
git commit -m "feat: adiciona CRUD e helpers de upload/export do fluxo de Respostas do LexCore"
```

---

## Task 5: `api/lexcore-resposta-exportar.js` — endpoint de exportação .docx

**Files:**
- Create: `api/lexcore-resposta-exportar.js`

**Interfaces:**
- Consumes: `buildLexcorePecaDocx`, `nomeArquivoPeca` from `../src/lib/lexcoreDocx.js` (existing exports, unchanged signatures — see Task 3). `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SERVICE_KEY` env var (same as `api/lexcore-exportar.js`, already configured in Vercel).
- Produces: `POST /api/lexcore-resposta-exportar` — request body `{ respostaId, tipoResposta, conteudoGerado, nomeReferencia?, numeroProcesso? }`, response `{ resposta: <raw snake_case row>, docxUrl: string }` on success, `{ error: string }` with 4xx/5xx on failure. Consumed by `exportarRespostaDocx` in Task 4 (which transforms `resposta` to camelCase before returning it to the UI).

- [ ] **Step 1: Write the implementation**

Create `api/lexcore-resposta-exportar.js`:

```js
import { createClient } from '@supabase/supabase-js';
import { buildLexcorePecaDocx, nomeArquivoPeca } from '../src/lib/lexcoreDocx.js';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const BUCKET = 'lexcore-docs';
const TIPOS_VALIDOS = ['resposta_impugnacao', 'contrarrazoes'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel' });

  const { respostaId, tipoResposta, conteudoGerado, nomeReferencia, numeroProcesso } = req.body || {};
  if (!respostaId || !tipoResposta || !conteudoGerado) {
    return res.status(400).json({ error: 'respostaId, tipoResposta e conteudoGerado são obrigatórios' });
  }
  if (!TIPOS_VALIDOS.includes(tipoResposta)) {
    return res.status(400).json({ error: `tipoResposta inválido: ${tipoResposta}` });
  }

  const sb = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const docxBuf = await buildLexcorePecaDocx({ tipoPeca: tipoResposta, conteudoGerado, nomeEdital: nomeReferencia, numeroProcesso });
    const nomeArquivo = nomeArquivoPeca({ tipoPeca: tipoResposta, numeroProcesso });
    const path = `respostas/${respostaId}/${nomeArquivo}`;

    const upload = await sb.storage.from(BUCKET).upload(path, docxBuf, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });
    if (upload.error) throw upload.error;

    const docxUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    const { data: row, error } = await sb.from('lexcore_respostas')
      .update({ arquivo_docx_url: docxUrl, status: 'finalizada', updated_at: new Date().toISOString() })
      .eq('id', respostaId)
      .select()
      .single();
    if (error) throw error;

    return res.json({ resposta: row, docxUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
```

- [ ] **Step 2: Verify it mirrors the proven pattern**

Run a diff against the existing, already-working endpoint to confirm the only differences are the renamed identifiers (table/field/param names) and the `respostas/` storage prefix:

```bash
diff api/lexcore-exportar.js api/lexcore-resposta-exportar.js
```
Expected: only lines differing are the ones renaming `peca`→`resposta`, `pecaId`→`respostaId`, `tipoPeca`→`tipoResposta`, the `TIPOS_VALIDOS` list, the storage path prefix (`pecas/`→`respostas/`), and the table name (`lexcore_pecas`→`lexcore_respostas`). No structural differences (this is a manual read-through check, not an automated assertion — there's no test framework to encode a diff assertion in, and this endpoint's real behavior is validated end-to-end by Task 7).

- [ ] **Step 3: Commit**

```bash
git add api/lexcore-resposta-exportar.js
git commit -m "feat: adiciona endpoint de exportacao .docx para Respostas a Impugnacao/Recurso"
```

---

## Task 6: UI — alternador de seção em `TabLexCore` + 3 componentes novos

**Files:**
- Modify: `src/App.jsx:26-30` (add two import lines)
- Modify: `src/App.jsx:2873-3003` (replace the `TabLexCore` function body — `LexcoreNova`, `LexcoreAnalise`, `LexcorePeca` immediately below it, lines 3005-3356, are NOT touched)
- Modify: `src/App.jsx` (insert 3 new component functions right after `LexcorePeca`'s closing brace, currently line 3356, before the `RelProcessos` comment at line 3358)

**Interfaces:**
- Consumes: `TIPOS_RESPOSTA`, `labelTipoResposta`, `buildRespostaSystem`, `buildRespostaUserText` (Task 2); `sbListRespostas`, `sbCreateResposta`, `sbGetResposta`, `sbUpdateResposta`, `sbDeleteResposta`, `uploadDocumentoRecebido`, `exportarRespostaDocx` (Task 4); existing in-file helpers `anthropicFetch`, `SX`, `C`, `Icon`, `Btn`, `IconBtn`, `Badge`, `Input`, `Select`, `EmptyState`, `fmtDate`, `useMobileCD` (all already defined earlier in `App.jsx`, unchanged).
- Produces: three new components — `LexcoreRespostaLista({ toast, isMobile, onAbrir })`, `LexcoreRespostaNova({ toast, onCancel, onCriada })`, `LexcoreRespostaDetalhe({ respostaId, toast, onVoltar })` — used only by the modified `TabLexCore`.

- [ ] **Step 1: Add the two new imports**

In `src/App.jsx`, the current import block (lines 26-30) reads:

```js
  sbListLexcoreAnalises, sbCreateLexcoreAnalise, sbUpdateLexcoreAnalise, sbDeleteLexcoreAnalise,
  sbGetLexcoreAnalise, sbListPontosCriticos, sbInsertPontosCriticos, sbSetPontoSelecionado,
  sbListPecas, sbCreatePeca, sbGetPeca, sbUpdatePeca, sbDeletePeca, uploadEditalOriginal, exportarPecaDocx,
} from './lib/lexcoreDb.js';
import { ANALISE_SYSTEM, buildPecaSystem, buildPecaUserPrompt, parsePontosCriticosJSON, TIPOS_PECA, labelTipoPeca, labelTipoProblema } from './lib/lexcoreLegal.js';
```

Add two lines immediately after the `lexcoreLegal.js` import line:

```js
  sbListLexcoreAnalises, sbCreateLexcoreAnalise, sbUpdateLexcoreAnalise, sbDeleteLexcoreAnalise,
  sbGetLexcoreAnalise, sbListPontosCriticos, sbInsertPontosCriticos, sbSetPontoSelecionado,
  sbListPecas, sbCreatePeca, sbGetPeca, sbUpdatePeca, sbDeletePeca, uploadEditalOriginal, exportarPecaDocx,
} from './lib/lexcoreDb.js';
import { ANALISE_SYSTEM, buildPecaSystem, buildPecaUserPrompt, parsePontosCriticosJSON, TIPOS_PECA, labelTipoPeca, labelTipoProblema } from './lib/lexcoreLegal.js';
import {
  sbListRespostas, sbCreateResposta, sbGetResposta, sbUpdateResposta, sbDeleteResposta,
  uploadDocumentoRecebido, exportarRespostaDocx,
} from './lib/lexcoreRespostaDb.js';
import { TIPOS_RESPOSTA, labelTipoResposta, buildRespostaSystem, buildRespostaUserText } from './lib/lexcoreRespostaLegal.js';
```

- [ ] **Step 2: Replace the `TabLexCore` function**

Replace the entire `TabLexCore` function (`src/App.jsx:2873-3003`, from `function TabLexCore({ toast }) {` through its matching closing `}`) with:

```jsx
function TabLexCore({ toast }) {
  const isMobile = useMobileCD();
  const [secao, setSecao] = useState("analise"); // "analise" | "resposta"

  const [view, setView] = useState("lista"); // lista | nova | analise | peca
  const [analiseId, setAnaliseId] = useState(null);
  const [pecaId, setPecaId] = useState(null);
  const [analises, setAnalises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [respostaView, setRespostaView] = useState("lista"); // lista | nova | detalhe
  const [respostaId, setRespostaId] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sbListLexcoreAnalises();
    if (error) toast("Erro ao carregar análises: " + error.message, "error");
    setAnalises(data);
    setLoading(false);
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirAnalise = (id) => { setAnaliseId(id); setView("analise"); };

  const deletar = async (id) => {
    if (!window.confirm("Excluir esta análise? Os pontos críticos e peças geradas serão perdidos.")) return;
    const { error } = await sbDeleteLexcoreAnalise(id);
    if (error) { toast("Erro ao excluir: " + error.message, "error"); return; }
    setAnalises(prev => prev.filter(a => a.id !== id));
    toast("Análise excluída");
  };

  if (view === "nova") {
    return (
      <LexcoreNova
        isMobile={isMobile}
        toast={toast}
        onCancel={() => setView("lista")}
        onCriada={(id) => { carregar(); abrirAnalise(id); }}
      />
    );
  }

  if (view === "analise" && analiseId) {
    return (
      <LexcoreAnalise
        analiseId={analiseId}
        isMobile={isMobile}
        toast={toast}
        onVoltar={() => { setView("lista"); carregar(); }}
        onAbrirPeca={(id) => { setPecaId(id); setView("peca"); }}
      />
    );
  }

  if (view === "peca" && pecaId) {
    return (
      <LexcorePeca
        pecaId={pecaId}
        toast={toast}
        onVoltar={() => setView("analise")}
      />
    );
  }

  if (respostaView === "nova") {
    return (
      <LexcoreRespostaNova
        toast={toast}
        onCancel={() => setRespostaView("lista")}
        onCriada={(id) => { setRespostaId(id); setRespostaView("detalhe"); }}
      />
    );
  }

  if (respostaView === "detalhe" && respostaId) {
    return (
      <LexcoreRespostaDetalhe
        respostaId={respostaId}
        toast={toast}
        onVoltar={() => setRespostaView("lista")}
      />
    );
  }

  const filtered = analises.filter(a => {
    const s = search.toLowerCase();
    return (a.nomeEdital || "").toLowerCase().includes(s) || (a.numeroProcesso || "").toLowerCase().includes(s);
  });

  const statusInfo = (status) => ({
    processando: { label: "Processando", color: undefined },
    concluida: { label: "Concluída", color: "#15803d" },
    erro: { label: "Erro", color: "#b91c1c" },
  }[status] || { label: status, color: undefined });

  return (
    <div>
      <div style={{
        background: `linear-gradient(135deg, ${SX.preto} 0%, ${SX.pretoSoft} 100%)`,
        border: `1px solid ${SX.laranja}33`, borderRadius: 12, padding: "18px 20px",
        marginBottom: 16, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12,
      }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff", fontFamily:"Inter,system-ui,sans-serif", display:"flex", alignItems:"center", gap:8 }}>
            <Icon name="lexcore" size={18} color={SX.laranja} />
            LexCore
          </div>
          <div style={{ fontSize:12, color:SX.prata, marginTop:3 }}>Análise de editais frente à Lei 14.133/2021 e geração de peças jurídicas (impugnação, recursos, contrarrazões)</div>
        </div>
        {secao === "analise" ? (
          <Btn color={SX.laranja} onClick={() => setView("nova")}>
            <Icon name="plus" size={14} /> Nova Análise
          </Btn>
        ) : (
          <Btn color={SX.laranja} onClick={() => setRespostaView("nova")}>
            <Icon name="plus" size={14} /> Nova Resposta
          </Btn>
        )}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <button onClick={() => setSecao("analise")} style={{
          padding:"8px 16px", borderRadius:8, border:`1px solid ${secao==="analise" ? SX.laranja : C.border}`,
          background: secao==="analise" ? `${SX.laranja}1a` : "transparent",
          color: secao==="analise" ? SX.laranjaEsc : C.sub, fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
        }}>Análise de Editais</button>
        <button onClick={() => setSecao("resposta")} style={{
          padding:"8px 16px", borderRadius:8, border:`1px solid ${secao==="resposta" ? SX.laranja : C.border}`,
          background: secao==="resposta" ? `${SX.laranja}1a` : "transparent",
          color: secao==="resposta" ? SX.laranjaEsc : C.sub, fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
        }}>Respostas a Impugnação/Recurso</button>
      </div>

      {secao === "analise" ? (
        <>
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome do edital ou processo..."
              style={{ flex:1, minWidth:150, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none" }}
              onFocus={e=>{ e.target.style.borderColor=SX.laranja; e.target.style.boxShadow=`0 0 0 3px ${SX.laranja}22`; }}
              onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
          </div>

          {loading ? (
            <div style={{ padding:40, textAlign:"center", color:C.sub, fontSize:13 }}>Carregando análises...</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="lexcore" title="Nenhuma análise de edital" sub='Clique em "Nova Análise" para enviar um edital em PDF e identificar pontos críticos frente à Lei 14.133/2021' />
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {filtered.map(a => {
                const st = statusInfo(a.status);
                return (
                  <div key={a.id} onClick={() => abrirAnalise(a.id)} style={{
                    background:C.card, border:`1px solid ${C.border}`, borderLeft:`4px solid ${a.status==="erro"?C.red:SX.laranja}`,
                    borderRadius:12, padding:16, boxShadow:"0 1px 3px rgba(0,0,0,0.06)", cursor:"pointer",
                    display:"flex", flexDirection: isMobile ? "column" : "row", gap:10, alignItems: isMobile ? "flex-start" : "center", justifyContent:"space-between",
                  }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                        <span style={{ fontSize:14, fontWeight:700, color:SX.laranjaEsc, fontFamily:"Inter,system-ui,sans-serif" }}>{a.nomeEdital}</span>
                        <Badge label={st.label} color={st.color} />
                      </div>
                      <div style={{ fontSize:12, color:C.sub }}>{a.numeroProcesso ? `Processo ${a.numeroProcesso}` : "Sem número de processo"} · {fmtDate(a.createdAt)}</div>
                    </div>
                    <div style={{ display:"flex", gap:8 }} onClick={e=>e.stopPropagation()}>
                      <IconBtn name="trash" color={C.red} title="Excluir" onClick={() => deletar(a.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <LexcoreRespostaLista toast={toast} isMobile={isMobile} onAbrir={(id) => { setRespostaId(id); setRespostaView("detalhe"); }} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Insert the three new components after `LexcorePeca`**

`LexcorePeca`'s closing brace is currently at `src/App.jsx:3356`, immediately followed by a blank line and the `RelProcessos` comment block at line 3358. Insert the following three functions in that gap (after `LexcorePeca`'s `}`, before the `RelProcessos` comment) — do not modify a single line of `LexcorePeca` itself:

```jsx
function LexcoreRespostaLista({ toast, isMobile, onAbrir }) {
  const [respostas, setRespostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sbListRespostas();
    if (error) toast("Erro ao carregar respostas: " + error.message, "error");
    setRespostas(data);
    setLoading(false);
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const deletar = async (id) => {
    if (!window.confirm("Excluir esta resposta?")) return;
    const { error } = await sbDeleteResposta(id);
    if (error) { toast("Erro ao excluir: " + error.message, "error"); return; }
    setRespostas(prev => prev.filter(r => r.id !== id));
    toast("Resposta excluída");
  };

  const filtered = respostas.filter(r => {
    const s = search.toLowerCase();
    return (r.nomeReferencia || "").toLowerCase().includes(s) || (r.numeroProcesso || "").toLowerCase().includes(s);
  });

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por edital/objeto ou processo..."
          style={{ flex:1, minWidth:150, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none" }}
          onFocus={e=>{ e.target.style.borderColor=SX.laranja; e.target.style.boxShadow=`0 0 0 3px ${SX.laranja}22`; }}
          onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:"center", color:C.sub, fontSize:13 }}>Carregando respostas...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="lexcore" title="Nenhuma resposta gerada" sub='Clique em "Nova Resposta" para anexar o PDF de uma impugnação ou recurso recebido e gerar a defesa' />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(r => (
            <div key={r.id} onClick={() => onAbrir(r.id)} style={{
              background:C.card, border:`1px solid ${C.border}`, borderLeft:`4px solid ${SX.laranja}`,
              borderRadius:12, padding:16, boxShadow:"0 1px 3px rgba(0,0,0,0.06)", cursor:"pointer",
              display:"flex", flexDirection: isMobile ? "column" : "row", gap:10, alignItems: isMobile ? "flex-start" : "center", justifyContent:"space-between",
            }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                  <span style={{ fontSize:14, fontWeight:700, color:SX.laranjaEsc, fontFamily:"Inter,system-ui,sans-serif" }}>{labelTipoResposta(r.tipoResposta)}</span>
                  <Badge label={r.status === "finalizada" ? "Finalizada" : "Rascunho"} color={r.status === "finalizada" ? C.green : undefined} />
                </div>
                <div style={{ fontSize:12, color:C.sub }}>
                  {r.nomeReferencia || "Sem edital/objeto informado"}{r.numeroProcesso ? ` · Processo ${r.numeroProcesso}` : ""} · {fmtDate(r.createdAt)}
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }} onClick={e=>e.stopPropagation()}>
                <IconBtn name="trash" color={C.red} title="Excluir" onClick={() => deletar(r.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LexcoreRespostaNova({ toast, onCancel, onCriada }) {
  const [tipoResposta, setTipoResposta] = useState(TIPOS_RESPOSTA[0].value);
  const [nomeReferencia, setNomeReferencia] = useState("");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [file, setFile] = useState(null);
  const [gerando, setGerando] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.type !== "application/pdf") { toast("Envie o documento em formato PDF", "error"); return; }
    if (f.size > 20*1024*1024) { toast("Arquivo muito grande (máx. 20 MB)", "warn"); return; }
    setFile(f);
  };

  const gerar = async () => {
    if (!file) { toast("Selecione o PDF da impugnação ou do recurso recebido", "error"); return; }
    setGerando(true);
    try {
      const { url: arquivoOrigemUrl, error: upErr } = await uploadDocumentoRecebido(file);
      if (upErr) throw upErr;

      const label = labelTipoResposta(tipoResposta);
      const fileData = await new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(file); });
      const b64 = fileData.split(",")[1];

      const res = await anthropicFetch(null, {
        method: "POST",
        headers: { "anthropic-version": "2023-06-01", "content-type": "application/json", "anthropic-beta": "pdfs-2024-09-25" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 4096, system: buildRespostaSystem(label),
          messages: [{ role: "user", content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
            { type: "text", text: buildRespostaUserText({ tipoRespostaLabel: label, nomeReferencia: nomeReferencia.trim(), numeroProcesso: numeroProcesso.trim() }) },
          ] }],
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error?.message || `Erro HTTP ${res.status}`); }
      const json = await res.json();
      if (json.stop_reason === "max_tokens") throw new Error("Documento muito extenso para gerar a resposta de uma vez.");
      const conteudo = json.content?.[0]?.text || "";
      if (!conteudo.trim()) throw new Error("IA não retornou conteúdo para a resposta.");

      const { data: resposta, error } = await sbCreateResposta({
        tipoResposta, nomeReferencia: nomeReferencia.trim(), numeroProcesso: numeroProcesso.trim(),
        arquivoOrigemUrl, conteudoGerado: conteudo,
      });
      if (error) throw error;
      toast("Resposta gerada com sucesso!");
      onCriada(resposta.id);
    } catch (err) {
      toast("Erro ao gerar resposta: " + err.message, "error");
    } finally {
      setGerando(false);
    }
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <IconBtn name="back" color={C.text} title="Voltar" onClick={onCancel} />
        <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:"Inter,system-ui,sans-serif" }}>Nova Resposta a Impugnação/Recurso</div>
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, maxWidth:640, display:"flex", flexDirection:"column", gap:14 }}>
        <Select label="Tipo de resposta" value={tipoResposta} onChange={setTipoResposta} options={TIPOS_RESPOSTA} />
        <Input label="Edital/Objeto de referência (opcional)" value={nomeReferencia} onChange={setNomeReferencia} placeholder="Ex.: Pregão Eletrônico nº 012/2026 — Aquisição de material de expediente" />
        <Input label="Número do Processo (opcional)" value={numeroProcesso} onChange={setNumeroProcesso} placeholder="Ex.: 2026.001.0034" />

        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <label style={{ fontSize:12, color:C.sub, fontWeight:500 }}>Impugnação ou Recurso recebido (PDF)</label>
          <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFile} style={{ display:"none" }} />
          <Btn variant="outline" color={SX.laranja} onClick={() => fileRef.current?.click()} style={{ alignSelf:"flex-start" }}>
            <Icon name="attach" size={14} /> {file ? file.name : "Selecionar PDF recebido"}
          </Btn>
        </div>

        <div style={{
          background:"#fff1e6", border:`1px solid ${SX.laranja}55`, borderRadius:8, padding:"12px 14px",
          display:"flex", gap:10, alignItems:"flex-start", fontSize:12.5, color:"#7c2d12", lineHeight:1.5,
        }}>
          <Icon name="warning" size={16} color={SX.laranjaEsc} />
          A IA lê o PDF anexado diretamente e redige a resposta em nome do órgão licitante, defendendo o edital ou a decisão frente aos argumentos apresentados. Independente de qualquer análise de edital salva.
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="outline" color={C.sub} onClick={onCancel} disabled={gerando}>Cancelar</Btn>
          <Btn color={SX.laranja} onClick={gerar} disabled={gerando}>
            {gerando ? "Gerando resposta..." : (<><Icon name="sparkle" size={14} /> Gerar Resposta</>)}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function LexcoreRespostaDetalhe({ respostaId, toast, onVoltar }) {
  const [resposta, setResposta] = useState(null);
  const [conteudo, setConteudo] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let ativo = true;
    sbGetResposta(respostaId).then(({ data, error }) => {
      if (!ativo) return;
      if (error) toast("Erro ao carregar resposta: " + error.message, "error");
      setResposta(data);
      setConteudo(data?.conteudoGerado || "");
      setLoading(false);
    });
    return () => { ativo = false; };
  }, [respostaId, toast]);

  const salvar = async () => {
    setSalvando(true);
    const { data, error } = await sbUpdateResposta(respostaId, { conteudoGerado: conteudo });
    setSalvando(false);
    if (error) { toast("Erro ao salvar: " + error.message, "error"); return; }
    setResposta(data);
    toast("Rascunho salvo");
  };

  const exportar = async () => {
    setExportando(true);
    try {
      await salvar();
      const { resposta: atualizada, docxUrl } = await exportarRespostaDocx({
        respostaId, tipoResposta: resposta.tipoResposta, conteudoGerado: conteudo,
        nomeReferencia: resposta.nomeReferencia, numeroProcesso: resposta.numeroProcesso,
      });
      setResposta(atualizada);
      toast("Resposta exportada em .docx");
      window.open(docxUrl, "_blank", "noopener");
    } catch (err) {
      toast("Erro ao exportar: " + err.message, "error");
    } finally {
      setExportando(false);
    }
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.sub, fontSize:13 }}>Carregando resposta...</div>;
  if (!resposta) return <EmptyState icon="lexcore" title="Resposta não encontrada" sub="" />;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <IconBtn name="back" color={C.text} title="Voltar" onClick={onVoltar} />
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.text, fontFamily:"Inter,system-ui,sans-serif" }}>{labelTipoResposta(resposta.tipoResposta)}</div>
          <div style={{ fontSize:12, color:C.sub }}>{resposta.nomeReferencia || "Sem edital/objeto informado"} · <Badge label={resposta.status === "finalizada" ? "Finalizada" : "Rascunho"} color={resposta.status === "finalizada" ? C.green : undefined} /></div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="outline" color={SX.laranja} onClick={salvar} disabled={salvando || exportando}>{salvando ? "Salvando..." : "Salvar Rascunho"}</Btn>
          <Btn color={SX.laranja} onClick={exportar} disabled={exportando}>
            {exportando ? "Exportando..." : (<><Icon name="file" size={14} /> Exportar .docx</>)}
          </Btn>
        </div>
      </div>

      {resposta.arquivoDocxUrl && (
        <div style={{ marginBottom:12 }}>
          <a href={resposta.arquivoDocxUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:12.5, color:SX.laranjaEsc, textDecoration:"none", fontWeight:600 }}>
            <Icon name="externallink" size={12} /> Última versão exportada — abrir .docx
          </a>
        </div>
      )}

      <textarea value={conteudo} onChange={e => setConteudo(e.target.value)} rows={28}
        style={{
          width:"100%", boxSizing:"border-box", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8,
          padding:"16px 18px", color:C.text, fontSize:13.5, lineHeight:1.7, fontFamily:"'Times New Roman',serif",
          outline:"none", resize:"vertical",
        }}
        onFocus={e=>{ e.target.style.borderColor=SX.laranja; e.target.style.boxShadow=`0 0 0 3px ${SX.laranja}22`; }}
        onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Build to catch syntax errors**

Run: `npm run build`
Expected: builds successfully (exit code 0), no JSX/import errors. This won't catch logic bugs (no TypeScript in this project) but will catch typos, unbalanced JSX tags, and missing imports.

- [ ] **Step 5: Manual browser check**

Run: `npm run dev`, open the printed local URL, log in, click the LexCore tab, then:
1. Confirm the "Análise de Editais" / "Respostas a Impugnação/Recurso" toggle appears and the "Análise de Editais" section looks and behaves exactly as before (list, search, "Nova Análise" button).
2. Click "Respostas a Impugnação/Recurso" — confirm the empty state and "Nova Resposta" button render.
3. Click "Nova Resposta" — confirm the form (tipo select, two optional text inputs, PDF attach button) renders and the "Voltar" back button returns to the list.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: adiciona secao Respostas a Impugnacao/Recurso na aba LexCore"
```

---

## Task 7: E2E Playwright test + push

**Files:**
- Create: `tests/lexcore-resposta-flow.spec.mjs`

**Interfaces:**
- Consumes: the deployed app at `LEXCORE_APP_URL` (defaults to `https://licitagov-one.vercel.app`), real Supabase (`SUPABASE_SERVICE_ROLE_KEY` env var), real Anthropic API (configured server-side in Vercel), and reuses the existing fixture `tests/fixtures/edital-teste.pdf` as the stand-in "documento recebido" PDF (its content doesn't matter for flow validation — the assertions check that a peça of plausible length is generated and exported, matching the rigor of the existing `tests/lexcore-flow.spec.mjs`, not that the legal content is substantively correct).

This test requires the feature to be deployed (Vercel picks up pushes to `main` automatically, per this repo's existing setup — confirmed by `tests/lexcore-flow.spec.mjs` hitting prod directly). Deploy (push) *before* running it.

- [ ] **Step 1: Write the test**

Create `tests/lexcore-resposta-flow.spec.mjs`:

```js
/**
 * Teste E2E — LexCore: fluxo de Resposta a Impugnação/Recurso
 *   anexar PDF de impugnação/recurso recebido -> gerar resposta via IA ->
 *   editar -> exportar em .docx
 *
 * Independente do fluxo de análise de edital (tests/lexcore-flow.spec.mjs) —
 * não depende de nenhuma análise ou peça salva.
 *
 * Sem mock — usa a API Anthropic real via produção e o Supabase real do
 * projeto. Cada execução:
 *   - consome tokens reais da API Anthropic (1 chamada: geração da resposta)
 *   - cria um registro real em lexcore_respostas
 *   - envia um arquivo real para o bucket "lexcore-docs"
 * Por isso este teste NÃO roda em CI nem automaticamente — apenas manual.
 *
 * Uso:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
 *   node "G:\Desktop\AUTOMAÇÕES\licitaGov\node_modules\@playwright\test\cli.js" test lexcore-resposta-flow --config "G:\Desktop\AUTOMAÇÕES\licitaGov\playwright.config.mjs" --reporter=line
 *
 * Pré-requisito: supabase/migration_lexcore_respostas.sql precisa já ter
 * sido aplicada no projeto e a variável ANTHROPIC_API_KEY precisa estar
 * configurada no ambiente do Vercel.
 */
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://xqlrfsrjvqmucchzpapk.supabase.co";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL        = process.env.LEXCORE_TEST_EMAIL || "chausselicita@gmail.com";
const PROD_URL     = process.env.LEXCORE_APP_URL || "https://licitagov-one.vercel.app";
const DOC_PDF      = path.join(__dirname, "fixtures", "edital-teste.pdf");

test.setTimeout(120000); // geração via IA pode levar ~1min

function followRedirect(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      const loc = res.headers["location"];
      resolve(loc || url);
      res.resume();
    }).on("error", reject);
  });
}

test("fluxo completo Resposta a Impugnação/Recurso: anexar -> gerar -> editar -> docx", async ({ browser }) => {
  if (!SERVICE_KEY) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY antes de rodar o teste.");

  // 1. Login via magic link (mesmo padrão dos demais specs deste projeto)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink", email: EMAIL, options: { redirectTo: PROD_URL },
  });
  if (error) throw new Error("generateLink falhou: " + error.message);
  let appUrl = await followRedirect(data.properties.action_link);
  if (appUrl.startsWith("https://xqlrfsrjvqmucchzpapk")) appUrl = await followRedirect(appUrl);

  const page = await browser.newPage();
  await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  // 2. Navegar para a aba LexCore e trocar para a seção de Respostas
  await page.locator("text=LexCore").first().click();
  await page.waitForTimeout(500);
  await expect(page.locator("text=Respostas a Impugnação/Recurso")).toBeVisible({ timeout: 8000 });
  await page.locator("text=Respostas a Impugnação/Recurso").first().click();
  console.log("✅ Seção de Respostas aberta");

  // 3. Iniciar nova resposta — SEM nenhuma análise de edital envolvida
  await page.locator("button", { hasText: "Nova Resposta" }).first().click();
  await expect(page.locator("text=Nova Resposta a Impugnação/Recurso")).toBeVisible({ timeout: 8000 });

  await page.locator("select").selectOption("contrarrazoes");
  await page.locator("input[placeholder*='Pregão Eletrônico']").fill("Pregão Eletrônico nº 001/2026 — Teste Resposta");
  await page.locator("input[placeholder*='2026.001']").fill("2026.999.0002-TESTE");

  const fileInput = page.locator('input[type="file"][accept="application/pdf"]');
  await fileInput.setInputFiles(DOC_PDF);
  await expect(page.locator("text=edital-teste.pdf")).toBeVisible({ timeout: 5000 });
  console.log("✅ PDF do documento recebido anexado");

  // 4. Disparar geração por IA e aguardar o editor da resposta
  await page.locator("button", { hasText: "Gerar Resposta" }).first().click();
  console.log("Gerando resposta via IA...");
  await expect(page.locator("textarea")).toBeVisible({ timeout: 60000 });
  console.log("✅ Resposta gerada — editor exibido");

  const textoGerado = await page.locator("textarea").inputValue();
  expect(textoGerado.length).toBeGreaterThan(50);
  await page.screenshot({ path: path.join(__dirname, "lexcore-resposta.png") });

  // 5. Exportar em .docx
  await page.locator("button", { hasText: "Exportar .docx" }).first().click();
  await expect(page.locator("text=abrir .docx")).toBeVisible({ timeout: 30000 });
  console.log("✅ Resposta exportada em .docx com sucesso");

  // 6. Voltar à lista e confirmar que a seção de Análise de Editais permanece intacta
  await page.locator('[title="Voltar"]').first().click();
  await expect(page.locator("text=Análise de Editais")).toBeVisible({ timeout: 8000 });
  await page.locator("text=Análise de Editais").first().click();
  await expect(page.locator("text=Nova Análise")).toBeVisible({ timeout: 8000 });
  console.log("✅ Seção de Análise de Editais continua funcionando normalmente");

  console.log("✅ FLUXO COMPLETO RESPOSTA VALIDADO: anexar → gerar → editar → exportação, independente da análise de edital");
});
```

- [ ] **Step 2: Commit the test file**

```bash
git add tests/lexcore-resposta-flow.spec.mjs
git commit -m "test: adiciona E2E do fluxo de Respostas a Impugnacao/Recurso do LexCore"
```

- [ ] **Step 3: Push to origin/main**

```bash
git push origin main
```

This triggers the existing Vercel auto-deploy from `main` (same mechanism used by every prior LexCore commit).

- [ ] **Step 4: Run the E2E test against the deployed app**

Run:
```bash
$env:SUPABASE_SERVICE_ROLE_KEY="<service role key>"
node "G:\Desktop\AUTOMAÇÕES\licitaGov\node_modules\@playwright\test\cli.js" test lexcore-resposta-flow --config "G:\Desktop\AUTOMAÇÕES\licitaGov\playwright.config.mjs" --reporter=line
```
Expected: all `console.log("✅ ...")` lines print and the test reports 1 passed. If it fails on the "Nova Resposta" button or the section toggle not being found, re-check Task 6's Step 5 manual browser check was actually done against this same deployment.

- [ ] **Step 5: Manually read the generated resposta text once**

Open the screenshot `tests/lexcore-resposta.png` (or re-run and read `textoGerado` from the console/screenshot) and confirm by eye that the generated text argues *in favor of* the edital/decision (defesa), not against it — this is the one thing no automated assertion in this plan checks (matching the spec's "Testes / verificação" section), because grading legal argument direction requires human judgment, not a string match.

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), lib files (Tasks 2, 4), docx title (Task 3), export API (Task 5), UI (Task 6), AI prompt behavior (Tasks 2 + 6), "análise de edital flow untouched" claim (verified in Task 7 Step 6's regression check) — every section of the spec maps to a task.
- **No placeholders:** every step has literal file content or an exact command with expected output.
- **Type/name consistency check performed:** `tipoResposta`/`TIPOS_RESPOSTA` values (`resposta_impugnacao`, `contrarrazoes`) match across the migration's check constraint (Task 1), `lexcoreRespostaLegal.js` (Task 2), `lexcoreDocx.js`'s `TITULOS_PECA` keys (Task 3), the export API's `TIPOS_VALIDOS` (Task 5), and every UI call site (Task 6). `exportarRespostaDocx`'s return shape (`{ resposta, docxUrl }`, camelCased via `respostaFromDb`) matches what `LexcoreRespostaDetalhe.exportar()` destructures in Task 6.
