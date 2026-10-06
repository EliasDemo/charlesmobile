// Copies ..\charles\docs\mobile\ into docs/api/ (replacing it entirely) and regenerates the API types.
import { cp, rm, stat, writeFile } from 'node:fs/promises';
import { DOCS_DIR, SOURCE_DIR, TYPES_PATH, generateTypes } from './api-types.mjs';

try {
  await stat(SOURCE_DIR);
} catch {
  console.error(`No se encontró ${SOURCE_DIR}. ¿Está el backend en ..\charles?`);
  process.exit(1);
}

await rm(DOCS_DIR, { recursive: true, force: true });
await cp(SOURCE_DIR, DOCS_DIR, { recursive: true });
await writeFile(TYPES_PATH, await generateTypes(), 'utf8');
console.log(`docs/api actualizada y tipos generados en ${TYPES_PATH}`);
