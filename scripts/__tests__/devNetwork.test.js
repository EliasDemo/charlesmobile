const { compare, detectWifiIp, readEnvValue, replaceApiHost } = require('../dev-network/logic');

// Real output of this computer: Wi-Fi plus VirtualBox, WSL, Bluetooth, idle Ethernet and a VPN.
const adapters = [
  {
    name: 'Ethernet 3',
    description: 'VirtualBox Host-Only Ethernet Adapter',
    ipv4: ['192.168.56.1'],
    gateway: null,
  },
  {
    name: 'vEthernet (WSL (Hyper-V firewall))',
    description: 'Hyper-V Virtual Ethernet Adapter',
    ipv4: ['192.168.208.1'],
    gateway: null,
  },
  {
    name: 'Wi-Fi',
    description: 'Intel(R) Wi-Fi 6E AX211 160MHz',
    ipv4: ['192.168.100.59'],
    gateway: '192.168.100.1',
  },
  {
    name: 'Conexión de red Bluetooth',
    description: 'Bluetooth Device (Personal Area Network)',
    ipv4: ['169.254.184.91'],
    gateway: null,
  },
  {
    name: 'Ethernet',
    description: 'Realtek PCIe GbE Family Controller',
    ipv4: ['169.254.54.147'],
    gateway: null,
  },
  { name: 'McAfee VPN', description: 'TAP-Windows Adapter V9', ipv4: ['169.254.22.253'], gateway: null },
];

describe('detectWifiIp', () => {
  it('picks the Wi-Fi adapter and ignores virtual ones and those without gateway', () => {
    expect(detectWifiIp(adapters)).toEqual({ ok: true, ip: '192.168.100.59', adapter: 'Wi-Fi' });
  });

  it('ignores a VPN even if it has a gateway', () => {
    const vpn = {
      name: 'Wi-Fi VPN',
      description: 'WireGuard Tunnel',
      ipv4: ['10.8.0.2'],
      gateway: '10.8.0.1',
    };
    expect(detectWifiIp([...adapters, vpn])).toMatchObject({ ok: true, ip: '192.168.100.59' });
  });

  it('is not sure when there is no Wi-Fi with gateway', () => {
    const offline = adapters.map((a) => ({ ...a, gateway: null }));
    expect(detectWifiIp(offline)).toEqual({ ok: false, reason: 'none', candidates: [] });
  });

  it('is not sure when two Wi-Fi addresses qualify', () => {
    const second = {
      name: 'Wi-Fi 2',
      description: 'USB Wireless',
      ipv4: ['192.168.0.20'],
      gateway: '192.168.0.1',
    };
    expect(detectWifiIp([...adapters, second])).toMatchObject({ ok: false, reason: 'ambiguous' });
  });

  it('skips link-local addresses', () => {
    const linkLocal = [
      { name: 'Wi-Fi', description: 'Intel', ipv4: ['169.254.1.1'], gateway: '192.168.1.1' },
    ];
    expect(detectWifiIp(linkLocal)).toMatchObject({ ok: false, reason: 'none' });
  });
});

describe('compare', () => {
  const detected = { ok: true, ip: '192.168.100.59', adapter: 'Wi-Fi' };

  it('reports a match or a mismatch', () => {
    expect(compare('http://192.168.100.59:3000', detected)).toMatchObject({ kind: 'match' });
    expect(compare('http://192.168.1.50:3000', detected)).toEqual({
      kind: 'mismatch',
      configuredHost: '192.168.1.50',
      detectedIp: '192.168.100.59',
    });
  });

  it('does not compare emulator, localhost or domain hosts', () => {
    expect(compare('http://10.0.2.2:3000', detected).kind).toBe('skip');
    expect(compare('http://localhost:3000', detected).kind).toBe('skip');
    expect(compare('https://abc.trycloudflare.com', detected).kind).toBe('skip');
  });

  it('only warns when the IP could not be determined', () => {
    expect(compare('http://192.168.1.50:3000', { ok: false, reason: 'none', candidates: [] }).kind).toBe(
      'unknown',
    );
  });

  it('flags an invalid URL', () => {
    expect(compare('not a url', detected).kind).toBe('invalid');
  });
});

describe('.env handling', () => {
  const content = '# comentario\r\nEXPO_PUBLIC_API_URL=http://192.168.1.50:3000\r\nOTRA=1\r\n';

  it('reads the configured URL', () => {
    expect(readEnvValue(content, 'EXPO_PUBLIC_API_URL')).toBe('http://192.168.1.50:3000');
    expect(readEnvValue('EXPO_PUBLIC_API_URL="http://1.2.3.4:3000"', 'EXPO_PUBLIC_API_URL')).toBe(
      'http://1.2.3.4:3000',
    );
    expect(readEnvValue(content, 'MISSING')).toBeNull();
  });

  it('replaces only the host, keeping port, comments and other variables', () => {
    expect(replaceApiHost(content, '192.168.100.59')).toBe(
      '# comentario\r\nEXPO_PUBLIC_API_URL=http://192.168.100.59:3000\r\nOTRA=1\r\n',
    );
  });
});
