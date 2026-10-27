import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import auth from './locales/es/auth.json';
import barbershop from './locales/es/barbershop.json';
import booking from './locales/es/booking.json';
import common from './locales/es/common.json';
import errors from './locales/es/errors.json';
import onboarding from './locales/es/onboarding.json';
import favorites from './locales/es/favorites.json';
import profile from './locales/es/profile.json';
import search from './locales/es/search.json';
import shop from './locales/es/shop.json';
import agenda from './locales/es/agenda.json';
import notifications from './locales/es/notifications.json';
import support from './locales/es/support.json';
import reviews from './locales/es/reviews.json';
import gallery from './locales/es/gallery.json';
import promotions from './locales/es/promotions.json';
import messages from './locales/es/messages.json';
import career from './locales/es/career.json';
import jobs from './locales/es/jobs.json';
import videos from './locales/es/videos.json';
import ads from './locales/es/ads.json';
import plans from './locales/es/plans.json';
import memberships from './locales/es/memberships.json';
import business from './locales/es/business.json';
import face from './locales/es/face.json';
import tour from './locales/es/tour.json';
import community from './locales/es/community.json';
import type devTexts from './locales/es/dev.json';
import en_common from './locales/en/common.json';
import en_errors from './locales/en/errors.json';
import en_auth from './locales/en/auth.json';
import en_profile from './locales/en/profile.json';
import en_search from './locales/en/search.json';
import en_barbershop from './locales/en/barbershop.json';
import en_favorites from './locales/en/favorites.json';
import en_booking from './locales/en/booking.json';
import en_onboarding from './locales/en/onboarding.json';
import en_shop from './locales/en/shop.json';
import en_agenda from './locales/en/agenda.json';
import en_notifications from './locales/en/notifications.json';
import en_support from './locales/en/support.json';
import en_reviews from './locales/en/reviews.json';
import en_gallery from './locales/en/gallery.json';
import en_promotions from './locales/en/promotions.json';
import en_messages from './locales/en/messages.json';
import en_career from './locales/en/career.json';
import en_jobs from './locales/en/jobs.json';
import en_videos from './locales/en/videos.json';
import en_ads from './locales/en/ads.json';
import en_plans from './locales/en/plans.json';
import en_memberships from './locales/en/memberships.json';
import en_business from './locales/en/business.json';
import en_face from './locales/en/face.json';
import en_tour from './locales/en/tour.json';
import en_community from './locales/en/community.json';
import { onLanguageChange } from './language';

export const defaultNS = 'common';
export const resources = {
  es: {
    common,
    errors,
    auth,
    profile,
    search,
    barbershop,
    favorites,
    booking,
    onboarding,
    shop,
    agenda,
    notifications,
    support,
    reviews,
    gallery,
    promotions,
    messages,
    career,
    jobs,
    videos,
    ads,
    plans,
    memberships,
    business,
    face,
    tour,
    community,
  },
  en: {
    common: en_common,
    errors: en_errors,
    auth: en_auth,
    profile: en_profile,
    search: en_search,
    barbershop: en_barbershop,
    favorites: en_favorites,
    booking: en_booking,
    onboarding: en_onboarding,
    shop: en_shop,
    agenda: en_agenda,
    notifications: en_notifications,
    support: en_support,
    reviews: en_reviews,
    gallery: en_gallery,
    promotions: en_promotions,
    messages: en_messages,
    career: en_career,
    jobs: en_jobs,
    videos: en_videos,
    ads: en_ads,
    plans: en_plans,
    memberships: en_memberships,
    business: en_business,
    face: en_face,
    tour: en_tour,
    community: en_community,
  },
} as const;

// Development-only texts: required inside a __DEV__ branch so release bundles do not contain them.
const devResources: { dev?: typeof devTexts } = __DEV__ ? { dev: require('./locales/es/dev.json') } : {};
const devResourcesEn: { dev?: typeof devTexts } = __DEV__ ? { dev: require('./locales/en/dev.json') } : {};

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['es'] & { dev: typeof devTexts };
  }
}

// Spanish (main) and English; adding a language means a folder under locales/ and an entry here.
// The language is applied from the saved preference at start (loadLanguagePreference).
const i18next = createInstance();
void i18next.use(initReactI18next).init({
  lng: 'es',
  fallbackLng: 'es',
  defaultNS,
  ns: [...Object.keys(resources.es), ...Object.keys(devResources)],
  resources: { es: { ...resources.es, ...devResources }, en: { ...resources.en, ...devResourcesEn } },
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

export const i18n = i18next;
onLanguageChange((language) => void i18next.changeLanguage(language));
export {
  loadLanguagePreference,
  resolveLanguage,
  systemLanguage,
  useLanguage,
  type LanguagePreference,
} from './language';
export { useTranslation };
