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
