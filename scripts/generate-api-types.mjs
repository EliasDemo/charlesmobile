// Regenerates the API types from the current docs/api/openapi.json without copying from the backend.
import { writeFile } from 'node:fs/promises';
import { TYPES_PATH, generateTypes } from './api-types.mjs';

await writeFile(TYPES_PATH, await generateTypes(), 'utf8');
console.log(`Tipos generados en ${TYPES_PATH}`);
