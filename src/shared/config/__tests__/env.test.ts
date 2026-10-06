import { env, parseApiUrl, parseOptionalUrl } from '../env';

describe('parseApiUrl', () => {
  it('accepts an HTTP origin in development', () => {
    expect(parseApiUrl('http://192.168.1.50:3000', 'development')).toEqual({
      ok: true,
      apiUrl: 'http://192.168.1.50:3000',
    });
    expect(parseApiUrl('https://api.charles.pe/', 'production')).toEqual({
      ok: true,
      apiUrl: 'https://api.charles.pe',
    });
  });

  it('rejects missing or invalid values', () => {
    expect(parseApiUrl(undefined, 'development')).toEqual({ ok: false, reason: 'invalidUrl' });
    expect(parseApiUrl('not a url', 'development')).toEqual({ ok: false, reason: 'invalidUrl' });
    expect(parseApiUrl('ftp://host', 'development')).toEqual({ ok: false, reason: 'invalidUrl' });
  });

  it('requires only the origin, without /api/v1', () => {
    expect(parseApiUrl('http://192.168.1.50:3000/api/v1', 'development')).toEqual({
      ok: false,
      reason: 'originOnly',
    });
    expect(parseApiUrl('http://host?x=1', 'development')).toEqual({ ok: false, reason: 'originOnly' });
  });

  it('requires HTTPS outside development', () => {
    expect(parseApiUrl('http://api.charles.pe', 'production')).toEqual({
      ok: false,
      reason: 'httpsRequired',
    });
    expect(parseApiUrl('http://api.charles.pe', 'preview')).toEqual({ ok: false, reason: 'httpsRequired' });
  });
});

describe('env', () => {
  it('is loaded from EXPO_PUBLIC_API_URL', () => {
    expect(env.apiUrl).toBe('http://api.test');
    expect(env.configError).toBeNull();
  });
});

describe('parseOptionalUrl', () => {
  it('keeps valid links and hides missing or invalid ones', () => {
    expect(parseOptionalUrl('https://charlesapp.pe/terminos')).toBe('https://charlesapp.pe/terminos');
    expect(parseOptionalUrl(undefined)).toBeNull();
    expect(parseOptionalUrl('javascript:alert(1)')).toBeNull();
  });
});
