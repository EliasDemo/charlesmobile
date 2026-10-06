// Fails when the committed API types differ from what docs/api/openapi.json produces.
import { readFile } from 'node:fs/promises';
import { TYPES_PATH, generateTypes, normalize } from './api-types.mjs';

const expected = normalize(await generateTypes());
let actual = '';
try {
  actual = normalize(await readFile(TYPES_PATH, 'utf8'));
} catch {
  // Missing file is reported below as a mismatch.
}

if (actual !== expected) {
  console.error('Los tipos de la API no coinciden con docs/api/openapi.json. Ejecuta `pnpm sync:api`.');
  process.exit(1);
}
console.log('Tipos de la API al día.');
