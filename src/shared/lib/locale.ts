// Locale of numbers, money and dates, following the app language (set by shared/i18n).
// Hours are still always shown in the barbershop's time zone, whatever the language.

export type AppLanguage = 'es' | 'en';

const LOCALES: Record<AppLanguage, string> = { es: 'es-PE', en: 'en-US' };

let current: AppLanguage = 'es';

export const displayLocale = () => LOCALES[current];
export const displayLanguage = () => current;

export function setDisplayLanguage(language: AppLanguage) {
  current = language;
}
