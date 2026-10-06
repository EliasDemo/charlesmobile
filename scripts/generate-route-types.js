// Generates types/generated/router.d.ts from app/ (Expo Router typed routes) without starting Metro,
// so `pnpm typecheck` always checks hrefs against the real routes, even on a fresh clone.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
// Must be set before expo-router's helpers load: they read it at import time.
process.env.EXPO_ROUTER_APP_ROOT = path.join(root, 'app');

const { requireContext } = require('expo-router/internal/testing');
const { EXPO_ROUTER_CTX_IGNORE } = require('expo-router/_ctx-shared');
const { getTypedRoutesDeclarationFile } = require('@expo/router-server/build/typed-routes/generate');

const ctx = requireContext(process.env.EXPO_ROUTER_APP_ROOT, true, EXPO_ROUTER_CTX_IGNORE);
const file = getTypedRoutesDeclarationFile(ctx, {});
if (!file) {
  console.error('No se pudieron generar los tipos de rutas.');
  process.exit(1);
}

// Own folder (not .expo/types): a running dev server rewrites that one on its own schedule.
const outDir = path.join(root, 'types', 'generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'router.d.ts'), file);
