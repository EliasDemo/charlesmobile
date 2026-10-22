// Design tokens. The brand lives here: change the palette in one place.

const palette = {
  // Classic barbershop: copper / brass as the accent (actions), deep navy as the brand.
  copper50: '#FBF3EA',
  copper100: '#F4E2CF',
  copper200: '#E9C7A2',
  copper300: '#DDAA76',
  copper400: '#C88B52',
  copper500: '#A86F3A',
  copper600: '#8C5A2C',
  copper700: '#6E4521',
  navy50: '#EEF1F7',
  navy100: '#D6DDEA',
  navy300: '#8C9BBA',
  navy500: '#3A4F7A',
  navy700: '#1F3157',
  navy800: '#18264A',
  navy900: '#101A35',
  // Warm neutrals (cream and sand in light; charcoal with a navy tint in dark).
  neutral0: '#FFFFFF',
  cream: '#FFFDF9',
  neutral25: '#FAF7F2',
  neutral50: '#F4EFE7',
  neutral100: '#EAE3D8',
  neutral200: '#DDD3C4',
  neutral300: '#C5B9A7',
  neutral400: '#9C9182',
  neutral500: '#6E665B',
  neutral600: '#4E483F',
  neutral700: '#2B3242',
  neutral750: '#222938',
  neutral800: '#1A2030',
  neutral850: '#141A27',
  neutral900: '#0C111C',
  ink: '#14213D',
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
  /** Brand surfaces (headers, hero areas): deep navy, with its text color. */
  brand: string;
  onBrand: string;
  /** Copper accent on the navy brand surfaces. */
  brandAccent: string;
  /** Second color of two-tone titles ("Tu día / de un vistazo"). */
  accentText: string;
  /** Ranking medals (1st, 2nd, 3rd). */
  medalGold: string;
  medalSilver: string;
  medalBronze: string;
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
    surface: palette.cream,
    surfaceElevated: palette.neutral0,
    surfaceMuted: palette.neutral25,
    border: palette.neutral200,
    textPrimary: palette.ink,
    textSecondary: palette.neutral600,
    textMuted: palette.neutral500,
    primary: palette.copper600,
    primaryPressed: palette.copper700,
    onPrimary: palette.neutral0,
    brand: palette.navy800,
    onBrand: palette.cream,
    brandAccent: palette.copper300,
    accentText: palette.copper600,
    medalGold: '#C9921A',
    medalSilver: '#7D8791',
    medalBronze: '#A0612E',
    primarySoft: palette.copper50,
    danger: palette.red600,
    dangerPressed: palette.red700,
    disabledBackground: palette.neutral100,
    onDisabled: palette.neutral600,
    success: palette.green600,
    warning: palette.amber700,
    onStatus: palette.neutral0,
    focus: palette.copper500,
    backdrop: 'rgba(16, 26, 53, 0.5)',
    shadow: 'rgba(20, 33, 61, 0.10)',
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
    textPrimary: '#F5F0E8',
    textSecondary: palette.neutral300,
    textMuted: palette.neutral400,
    primary: palette.copper300,
    primaryPressed: palette.copper200,
    onPrimary: palette.neutral900,
    brand: palette.navy800,
    onBrand: palette.cream,
    brandAccent: palette.copper300,
    accentText: palette.copper300,
    medalGold: '#E8B84A',
    medalSilver: '#B9C2CB',
    medalBronze: '#D08A50',
    primarySoft: '#2A1F14',
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
  /** Elegant serif for big titles only; the rest stays in Inter. */
  serif: 'PlayfairDisplay_700Bold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  hero: { fontFamily: fontFamily.serif, fontSize: 40, lineHeight: 48 },
  display: { fontFamily: fontFamily.serif, fontSize: 30, lineHeight: 38 },
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
