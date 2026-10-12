// Design tokens. The brand lives here: change the palette in one place.

const palette = {
  // Renewed copper: warmer and brighter, the brand color.
  copper50: '#FDF1E8',
  copper100: '#FBE2D0',
  copper200: '#F7C4A0',
  copper300: '#F2A06B',
  copper400: '#E8823F',
  copper500: '#C8641F',
  copper600: '#A5501A',
  copper700: '#843F15',
  // Cool neutrals (light) and blue-tinted near-black (dark): cleaner, more modern.
  neutral0: '#FFFFFF',
  neutral25: '#FAFBFC',
  neutral50: '#F4F6F8',
  neutral100: '#EAEDF1',
  neutral200: '#D9DEE5',
  neutral300: '#C1C8D2',
  neutral400: '#98A2B3',
  neutral500: '#667085',
  neutral600: '#475467',
  neutral700: '#2B3340',
  neutral750: '#232933',
  neutral800: '#1B2029',
  neutral850: '#151920',
  neutral900: '#0D1015',
  ink: '#101828',
  red300: '#FDA29B',
  red400: '#F97066',
  red600: '#C4320A',
  red700: '#9A2508',
  green400: '#47CD89',
  green600: '#067647',
  amber400: '#FDB022',
  amber700: '#93370D',
} as const;

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  /** Subtle surface inside cards (stat tiles, timeline rail, inputs). */
  surfaceMuted: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primarySoft: string;
  danger: string;
  dangerPressed: string;
  /** Disabled controls keep readable text (no opacity tricks). */
  disabledBackground: string;
  onDisabled: string;
  success: string;
  warning: string;
  onStatus: string;
  focus: string;
  /** Dimmed layer behind dialogs. */
  backdrop: string;
  /** Soft shadow of cards and sheets. */
  shadow: string;
  /**
   * Status colors (bookings and other states): soft background + text/icon color. Always shown
   * together with a label or icon, never as color alone.
   */
  statusPendingBg: string;
  statusPendingFg: string;
  statusSuccessBg: string;
  statusSuccessFg: string;
  statusNeutralBg: string;
  statusNeutralFg: string;
  statusDangerBg: string;
  statusDangerFg: string;
}

export type StatusTone = 'pending' | 'success' | 'neutral' | 'danger';

export const colors: Record<ColorScheme, ThemeColors> = {
  light: {
    background: palette.neutral50,
    surface: palette.neutral0,
    surfaceElevated: palette.neutral0,
    surfaceMuted: palette.neutral25,
    border: palette.neutral200,
    textPrimary: palette.ink,
    textSecondary: palette.neutral600,
    textMuted: palette.neutral500,
    primary: palette.copper600,
    primaryPressed: palette.copper700,
    onPrimary: palette.neutral0,
    primarySoft: palette.copper50,
    danger: palette.red600,
    dangerPressed: palette.red700,
    disabledBackground: palette.neutral100,
    onDisabled: palette.neutral600,
    success: palette.green600,
    warning: palette.amber700,
    onStatus: palette.neutral0,
    focus: palette.copper500,
    backdrop: 'rgba(16, 24, 40, 0.45)',
    shadow: 'rgba(16, 24, 40, 0.10)',
    statusPendingBg: '#FFF4E0',
    statusPendingFg: '#93370D',
    statusSuccessBg: '#DCFAE6',
    statusSuccessFg: '#067647',
    statusNeutralBg: palette.neutral100,
    statusNeutralFg: palette.neutral600,
    statusDangerBg: '#FEE4E2',
    statusDangerFg: '#B42318',
  },
  dark: {
    background: palette.neutral900,
    surface: palette.neutral850,
    surfaceElevated: palette.neutral800,
    surfaceMuted: palette.neutral750,
    border: palette.neutral700,
    textPrimary: '#F2F4F7',
    textSecondary: palette.neutral300,
    textMuted: palette.neutral400,
    primary: palette.copper300,
    primaryPressed: palette.copper200,
    onPrimary: palette.neutral900,
    primarySoft: '#2E1D12',
    danger: palette.red400,
    dangerPressed: palette.red300,
    disabledBackground: palette.neutral700,
    onDisabled: palette.neutral300,
    success: palette.green400,
    warning: palette.amber400,
    onStatus: palette.neutral900,
    focus: palette.copper200,
    backdrop: 'rgba(0, 0, 0, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.5)',
    statusPendingBg: '#3B2A0E',
    statusPendingFg: palette.amber400,
    statusSuccessBg: '#0F2E1F',
    statusSuccessFg: palette.green400,
    statusNeutralBg: palette.neutral750,
    statusNeutralFg: palette.neutral300,
    statusDangerBg: '#3A1715',
    statusDangerFg: palette.red300,
  },
};

/** `gutter`: side margin of every screen. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  gutter: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 } as const;

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  hero: { fontFamily: fontFamily.bold, fontSize: 40, lineHeight: 48 },
  display: { fontFamily: fontFamily.bold, fontSize: 30, lineHeight: 36 },
  title: { fontFamily: fontFamily.semibold, fontSize: 22, lineHeight: 28 },
  subtitle: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Minimum touch target in points (accessibility). */
export const touchTarget = 44;

export const sizes = {
  icon: 20,
  iconLarge: 40,
  maxContentWidth: 560,
  borderWidth: 1,
  avatar: 56,
  avatarSmall: 40,
  /** Own photo on the profile. */
  avatarLarge: 96,
  cover: 160,
  mapPreview: 320,
  illustration: 120,
  welcomeImage: 320,
  /** Unread counter on the notifications bell. */
  badge: 18,
} as const;
