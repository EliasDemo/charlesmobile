import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { z } from 'zod';

const appVariantSchema = z.enum(['development', 'preview', 'production']);
export type AppVariant = z.infer<typeof appVariantSchema>;

/** Why EXPO_PUBLIC_API_URL was rejected. Each reason has a text in the `config` translations. */
export type ConfigErrorReason = 'invalidUrl' | 'originOnly' | 'httpsRequired';

export type ApiUrlResult = { ok: true; apiUrl: string } | { ok: false; reason: ConfigErrorReason };

export function parseApiUrl(raw: string | undefined, appVariant: AppVariant): ApiUrlResult {
  const parsed = z.url({ protocol: /^https?$/ }).safeParse(raw);
  if (!parsed.success) return { ok: false, reason: 'invalidUrl' };
  const { pathname, search, hash } = new URL(parsed.data);
  if ((pathname !== '/' && pathname !== '') || search || hash) return { ok: false, reason: 'originOnly' };
  if (appVariant !== 'development' && !parsed.data.startsWith('https://')) {
    return { ok: false, reason: 'httpsRequired' };
  }
  return { ok: true, apiUrl: parsed.data.replace(/\/$/, '') };
}

/** Optional public link (e.g. terms). Invalid or missing values become null and the link is hidden. */
export function parseOptionalUrl(raw: string | undefined): string | null {
  const parsed = z.url({ protocol: /^https?$/ }).safeParse(raw);
  return parsed.success ? parsed.data : null;
}

const appVariant = appVariantSchema.catch('development').parse(Constants.expoConfig?.extra?.appVariant);
// Must be read literally so Expo inlines it at build time.
const apiUrlResult = parseApiUrl(process.env.EXPO_PUBLIC_API_URL, appVariant);

/**
 * Validated at startup. An invalid value does not crash the bundle: the root layout shows
 * a configuration error instead of the app (see app/_layout.tsx).
 */
export const env = {
  appVariant,
  isDevelopment: appVariant === 'development',
  apiUrl: apiUrlResult.ok ? apiUrlResult.apiUrl : '',
  configError: apiUrlResult.ok ? null : apiUrlResult.reason,
  // Provisional links until GET /auth/terms returns them (docs/pendientes-publicacion.md #9).
  termsUrl: parseOptionalUrl(process.env.EXPO_PUBLIC_TERMS_URL),
  privacyUrl: parseOptionalUrl(process.env.EXPO_PUBLIC_PRIVACY_URL),
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
  platform: Platform.OS,
} as const;
