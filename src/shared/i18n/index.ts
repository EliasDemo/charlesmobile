import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import auth from './locales/es/auth.json';
import barbershop from './locales/es/barbershop.json';
import booking from './locales/es/booking.json';
import common from './locales/es/common.json';
import errors from './locales/es/errors.json';
import favorites from './locales/es/favorites.json';
import profile from './locales/es/profile.json';
import search from './locales/es/search.json';
import type devTexts from './locales/es/dev.json';

export const defaultNS = 'common';
export const resources = {
  es: { common, errors, auth, profile, search, barbershop, favorites, booking },
} as const;

// Development-only texts: required inside a __DEV__ branch so release bundles do not contain them.
const devResources: { dev?: typeof devTexts } = __DEV__ ? { dev: require('./locales/es/dev.json') } : {};

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['es'] & { dev: typeof devTexts };
  }
}

// Spanish only for now; adding a language means adding a folder under locales/ and an entry here.
const i18next = createInstance();
void i18next.use(initReactI18next).init({
  lng: 'es',
  fallbackLng: 'es',
  defaultNS,
  ns: [...Object.keys(resources.es), ...Object.keys(devResources)],
  resources: { es: { ...resources.es, ...devResources } },
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

export const i18n = i18next;
export { useTranslation };
