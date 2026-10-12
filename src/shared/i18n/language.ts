import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { setDisplayLanguage, type AppLanguage } from '@/shared/lib/locale';

export type LanguagePreference = 'system' | AppLanguage;

// A UI preference on the device (not sensitive), like the theme.
const KEY = 'charles.language';
const SUPPORTED: readonly AppLanguage[] = ['es', 'en'];

/** The phone language when supported; Spanish otherwise (the app's main language). */
export function systemLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode ?? 'es';
  return (SUPPORTED as readonly string[]).includes(code) ? (code as AppLanguage) : 'es';
}

export const resolveLanguage = (preference: LanguagePreference): AppLanguage =>
  preference === 'system' ? systemLanguage() : preference;

interface LanguageState {
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
}

/** Applies a language to texts, number/date formats and the API (Accept-Language). */
let applyToI18n: (language: AppLanguage) => void = () => undefined;
export function onLanguageChange(apply: (language: AppLanguage) => void) {
  applyToI18n = apply;
}

function apply(preference: LanguagePreference) {
  const language = resolveLanguage(preference);
  setDisplayLanguage(language);
  applyToI18n(language);
}

export const useLanguage = create<LanguageState>((set) => ({
  preference: 'system',
  setPreference: (preference) => {
    set({ preference });
    apply(preference);
    void SecureStore.setItemAsync(KEY, preference).catch(() => undefined);
  },
}));

/** Reads the saved choice at start (system language when there is none). */
export async function loadLanguagePreference(): Promise<void> {
  let saved: string | null = null;
  try {
    saved = await SecureStore.getItemAsync(KEY);
  } catch {
    // Keep the system language.
  }
  const preference: LanguagePreference = saved === 'es' || saved === 'en' ? saved : 'system';
  useLanguage.setState({ preference });
  apply(preference);
}
