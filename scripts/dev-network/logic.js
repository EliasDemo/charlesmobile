// Pure logic of the development network check (no I/O), so it can be unit tested.
// Development only: never imported by the app bundle.

const VIRTUAL_ADAPTER =
  /vEthernet|WSL|Hyper-V|VirtualBox|VMware|VPN|TAP-Windows|Tunnel|Loopback|Bluetooth|Docker|ZeroTier|Tailscale|WireGuard|OpenVPN|Fortinet|AnyConnect|Npcap/i;
const WIFI_ADAPTER = /Wi-?Fi|Wireless|WLAN|802\.11/i;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** Hosts that are not this computer's LAN address and must not be compared (emulator, tunnels…). */
const SPECIAL_HOSTS = new Set(['10.0.2.2', 'localhost', '127.0.0.1']);

const isUsableIpv4 = (ip) => IPV4.test(ip) && !ip.startsWith('169.254.') && !ip.startsWith('127.');

/**
 * @typedef {{ name: string, description?: string | null, ipv4: string[], gateway?: string | null }} Adapter
 * @returns {{ ok: true, ip: string, adapter: string } | { ok: false, reason: 'none' | 'ambiguous', candidates: string[] }}
 */
function detectWifiIp(adapters) {
  const candidates = adapters
    .filter((a) => a.gateway && !VIRTUAL_ADAPTER.test(`${a.name} ${a.description ?? ''}`))
    .filter((a) => WIFI_ADAPTER.test(`${a.name} ${a.description ?? ''}`))
    .flatMap((a) => a.ipv4.filter(isUsableIpv4).map((ip) => ({ ip, adapter: a.name })));
  if (candidates.length === 1) return { ok: true, ...candidates[0] };
  return {
    ok: false,
    reason: candidates.length === 0 ? 'none' : 'ambiguous',
    candidates: candidates.map((c) => `${c.ip} (${c.adapter})`),
  };
}

/** Reads KEY=VALUE pairs from a .env file content. */
function readEnvValue(content, key) {
  const line = content.split(/\r?\n/).find((l) => l.trim().startsWith(`${key}=`));
  if (!line) return null;
  return line
    .slice(line.indexOf('=') + 1)
    .trim()
    .replace(/^["']|["']$/g, '');
}

/** Replaces the host of EXPO_PUBLIC_API_URL keeping protocol, port and the rest of the file. */
function replaceApiHost(content, newHost) {
  return content.replace(/^(\s*EXPO_PUBLIC_API_URL=["']?)([^"'\r\n]*)/m, (match, prefix, value) => {
    const url = new URL(value);
    url.hostname = newHost;
    return prefix + url.origin;
  });
}

/**
 * Decides what to tell the developer.
 * @returns {{ kind: 'match' | 'mismatch' | 'skip' | 'unknown' | 'invalid', configuredHost?: string, detectedIp?: string }}
 */
function compare(apiUrl, detection) {
  let host;
  try {
    host = new URL(apiUrl).hostname;
  } catch {
    return { kind: 'invalid' };
  }
  if (SPECIAL_HOSTS.has(host) || !IPV4.test(host)) return { kind: 'skip', configuredHost: host };
  if (!detection.ok) return { kind: 'unknown', configuredHost: host };
  return {
    kind: host === detection.ip ? 'match' : 'mismatch',
    configuredHost: host,
    detectedIp: detection.ip,
  };
}

module.exports = { detectWifiIp, readEnvValue, replaceApiHost, compare };
