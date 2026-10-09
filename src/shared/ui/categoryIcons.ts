import type { IconName } from './Icon';

/**
 * Icon per service category key, as the API sends them (GET /service-categories). Presentation
 * only: an unknown or new key falls back to a generic icon.
 */
const CATEGORY_ICONS: Record<string, IconName> = {
  haircut: 'cut',
  beard: 'man',
  haircut_beard: 'people',
  kids_haircut: 'happy',
  hair_color: 'color-palette',
  hair_treatment: 'water',
  shave: 'sparkles',
  eyebrows: 'eye',
  other: 'ellipsis-horizontal-circle',
};

export const GENERIC_CATEGORY_ICON: IconName = 'storefront';

export function categoryIcon(key: string | null | undefined): IconName {
  return (key && CATEGORY_ICONS[key]) || GENERIC_CATEGORY_ICON;
}
