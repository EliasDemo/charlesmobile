import type { ThemeColors } from './tokens';

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two #RRGGBB colors (1 to 21). */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

type ColorToken = keyof ThemeColors;

/** WCAG AA for normal text. */
export const MIN_TEXT_CONTRAST = 4.5;
/** WCAG AA for UI component boundaries (e.g. an outlined button's border). */
export const MIN_UI_CONTRAST = 3;

/** Every text color the UI draws, on every background it is drawn on. */
export const TEXT_PAIRS: readonly [ColorToken, ColorToken][] = [
  ...(
    ['textPrimary', 'textSecondary', 'textMuted', 'primary', 'danger', 'success', 'warning'] as const
  ).flatMap((text) =>
    (['background', 'surface', 'surfaceElevated'] as const).map((bg): [ColorToken, ColorToken] => [text, bg]),
  ),
  // Buttons: normal, pressed, loading (same colors as normal) and disabled.
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryPressed'],
  ['onStatus', 'danger'],
  ['onStatus', 'dangerPressed'],
  ['primary', 'primarySoft'],
  ['onDisabled', 'disabledBackground'],
  // Offline banner.
  ['onStatus', 'warning'],
  // Status pills: text and icon on their soft background, and on plain surfaces.
  ['statusPendingFg', 'statusPendingBg'],
  ['statusSuccessFg', 'statusSuccessBg'],
  ['statusNeutralFg', 'statusNeutralBg'],
  ['statusDangerFg', 'statusDangerBg'],
  ['statusPendingFg', 'surface'],
  ['statusDangerFg', 'surface'],
];

export const UI_PAIRS: readonly [ColorToken, ColorToken][] = [
  ['primary', 'background'],
  ['primary', 'surface'],
  ['focus', 'surface'],
  ['danger', 'surface'],
];
