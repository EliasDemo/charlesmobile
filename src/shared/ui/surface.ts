import { sizes, useTheme, type StatusTone } from '@/shared/theme';

/** Soft shadow of cards (light theme). */
const CARD_SHADOW = {
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 12,
  shadowOpacity: 1,
  elevation: 2,
};

/**
 * Look of a card: in light theme a white surface with a soft shadow and no border; in dark theme
 * a slightly lighter surface with a thin border (shadows do not read on dark backgrounds).
 */
export function useSurfaceStyle() {
  const theme = useTheme();
  const light = theme.scheme === 'light';
  return {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: light ? 0 : sizes.borderWidth,
    borderColor: theme.colors.border,
    ...(light ? { ...CARD_SHADOW, shadowColor: theme.colors.shadow } : {}),
  };
}

export const TONE_COLORS = {
  pending: ['statusPendingBg', 'statusPendingFg'],
  success: ['statusSuccessBg', 'statusSuccessFg'],
  neutral: ['statusNeutralBg', 'statusNeutralFg'],
  danger: ['statusDangerBg', 'statusDangerFg'],
} as const satisfies Record<StatusTone, readonly [string, string]>;
