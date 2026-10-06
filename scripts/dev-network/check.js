// Runs before `pnpm start` (development only): compares this computer's Wi-Fi IPv4 with
// EXPO_PUBLIC_API_URL in .env and checks that the backend answers. Never blocks the start.
const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { compare, detectWifiIp, readEnvValue, replaceApiHost } = require('./logic');

const ENV_PATH = path.resolve(__dirname, '..', '..', '.env');
const HEALTH_TIMEOUT_MS = 3000;

const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

function readAdapters() {
  if (process.platform !== 'win32') return null;
  const script =
    'Get-NetIPConfiguration | Where-Object { $_.IPv4Address } | ForEach-Object { [pscustomobject]@{ ' +
    'name = $_.InterfaceAlias; description = $_.InterfaceDescription; ipv4 = @($_.IPv4Address.IPAddress); ' +
    'gateway = $_.IPv4DefaultGateway.NextHop } } | ConvertTo-Json -Compress';
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
      encoding: 'utf8',
      timeout: 10_000,
    }).trim();
    if (!out) return [];
    const parsed = JSON.parse(out);
    return (Array.isArray(parsed) ? parsed : [parsed]).map((a) => ({
      ...a,
      ipv4: Array.isArray(a.ipv4) ? a.ipv4 : [a.ipv4].filter(Boolean),
    }));
  } catch {
    return null;
  }
}

async function ask(question) {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    return /^s(i|í)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

async function checkHealth(apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/api/v1/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (response.ok) {
      console.log(green(`✔ El backend responde en ${apiUrl}`));
      return;
    }
    console.warn(
      yellow(`⚠ El backend en ${apiUrl} respondió con estado ${response.status}. Revisa sus registros.`),
    );
  } catch {
    console.warn(
      red(`✖ El backend no responde en ${apiUrl}/api/v1/health.`) +
        '\n  Causas probables:' +
        '\n   • El backend está apagado (en ..\\charles: pnpm --filter api start:dev).' +
        '\n   • El firewall de Windows bloquea el puerto (permite Node en redes privadas).' +
        '\n   • La IP de .env es de otra red wifi distinta a la actual.',
    );
  }
}

async function main() {
  if (!existsSync(ENV_PATH)) {
    console.warn(yellow('⚠ No existe .env. Copia .env.example a .env y pon la IP de tu computadora.'));
    return;
  }
  let content = readFileSync(ENV_PATH, 'utf8');
  let apiUrl = readEnvValue(content, 'EXPO_PUBLIC_API_URL');
  if (!apiUrl) {
    console.warn(yellow('⚠ .env no define EXPO_PUBLIC_API_URL.'));
    return;
  }

  const adapters = readAdapters();
  const detection = adapters ? detectWifiIp(adapters) : { ok: false, reason: 'none', candidates: [] };
  const result = compare(apiUrl, detection);

  switch (result.kind) {
    case 'invalid':
      console.warn(yellow(`⚠ EXPO_PUBLIC_API_URL no es una URL válida: ${apiUrl}`));
      return;
    case 'unknown':
      console.warn(
        yellow('⚠ No pude determinar con seguridad la IP wifi de este equipo; no cambio nada.') +
          (detection.candidates?.length ? `\n  Candidatas: ${detection.candidates.join(', ')}` : '') +
          `\n  Configurada en .env: ${result.configuredHost}`,
      );
      break;
    case 'mismatch': {
      console.warn(
        yellow('⚠ La IP de .env no coincide con la de tu wifi actual.') +
          `\n  Configurada en .env: ${result.configuredHost}` +
          `\n  Detectada (wifi):    ${result.detectedIp}`,
      );
      if (await ask('  ¿Actualizo .env con la IP detectada? (s/N) ')) {
        content = replaceApiHost(content, result.detectedIp);
        writeFileSync(ENV_PATH, content, 'utf8');
        apiUrl = readEnvValue(content, 'EXPO_PUBLIC_API_URL');
        console.log(green(`✔ .env actualizado: ${apiUrl}`));
      } else {
        console.log('  .env sin cambios.');
      }
      break;
    }
    case 'match':
      console.log(green(`✔ La IP de .env coincide con tu wifi (${result.detectedIp}).`));
      break;
    case 'skip':
      break;
  }

  await checkHealth(apiUrl);
}

// Never fail `pnpm start`: warnings only. The process ends on its own (process.exit can crash libuv on Windows).
main().catch((error) => console.warn(yellow(`⚠ No se pudo comprobar la red: ${error.message}`)));
