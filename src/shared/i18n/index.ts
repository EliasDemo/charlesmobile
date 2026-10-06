import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import common from './locales/es/common.json';
import errors from './locales/es/errors.json';

export const defaultNS = 'common';
export const resources = { es: { common, errors } } as const;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['es'];
  }
}

// Spanish only for now; adding a language means adding a folder under locales/ and an entry here.
const i18next = createInstance();
void i18next.use(initReactI18next).init({
  lng: 'es',
  fallbackLng: 'es',
  defaultNS,
  ns: ['common', 'errors'],
  resources,
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

export const i18n = i18next;
export { useTranslation };
