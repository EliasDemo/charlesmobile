// Design tokens. The brand lives here: change the palette in one place.

const palette = {
  copper50: '#FBF3EC',
  copper200: '#EBC6A3',
  copper300: '#DDA673',
  copper400: '#C98A4E',
  copper500: '#B07236',
  copper600: '#8E5A28',
  copper700: '#744920',
  neutral0: '#FFFFFF',
  neutral50: '#F7F5F2',
  neutral100: '#EEEBE6',
  neutral200: '#DEDAD3',
  neutral400: '#A39D94',
  neutral500: '#6E685F',
  neutral600: '#5C5750',
  neutral700: '#3A3631',
  neutral800: '#26231F',
  neutral850: '#1D1B18',
  neutral900: '#141210',
  red300: '#F5A49A',
  red400: '#F07B6E',
  red600: '#B3261E',
  red700: '#8C1D18',
  green400: '#6FCF8E',
  green600: '#1E7A3E',
  amber400: '#F2C14E',
  amber700: '#8A5A00',
} as const;

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
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
    border: palette.neutral200,
    textPrimary: palette.neutral900,
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
    backdrop: 'rgba(20, 18, 16, 0.5)',
    statusPendingBg: '#FFF4D6',
    statusPendingFg: '#7A4F00',
    statusSuccessBg: '#E3F4E8',
    statusSuccessFg: '#1E6B37',
    statusNeutralBg: palette.neutral100,
    statusNeutralFg: '#4A453F',
    statusDangerBg: '#FBE4E2',
    statusDangerFg: '#A3231C',
  },
  dark: {
    background: palette.neutral900,
    surface: palette.neutral850,
    surfaceElevated: palette.neutral800,
    border: palette.neutral700,
    textPrimary: palette.neutral50,
    textSecondary: palette.neutral200,
    textMuted: palette.neutral400,
    primary: palette.copper300,
    primaryPressed: palette.copper200,
    onPrimary: palette.neutral900,
    primarySoft: palette.neutral800,
    danger: palette.red400,
    dangerPressed: palette.red300,
    disabledBackground: palette.neutral700,
    onDisabled: palette.neutral200,
    success: palette.green400,
    warning: palette.amber400,
    onStatus: palette.neutral900,
    focus: palette.copper200,
    backdrop: 'rgba(0, 0, 0, 0.6)',
    statusPendingBg: '#3A2E12',
    statusPendingFg: palette.amber400,
    statusSuccessBg: '#173322',
    statusSuccessFg: palette.green400,
    statusNeutralBg: '#2E2B27',
    statusNeutralFg: '#CFC9C0',
    statusDangerBg: '#3D1D1A',
    statusDangerFg: palette.red300,
  },
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

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
  cover: 160,
  mapPreview: 320,
  illustration: 120,
  welcomeImage: 320,
  /** Unread counter on the notifications bell. */
  badge: 18,
} as const;
