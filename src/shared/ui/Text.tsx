import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme, type ThemeColors, type TypographyVariant } from '@/shared/theme';

type TextColor = keyof Pick<
  ThemeColors,
  | 'textPrimary'
  | 'textSecondary'
  | 'textMuted'
  | 'primary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'onPrimary'
  | 'onStatus'
>;

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
}

const HEADINGS: TypographyVariant[] = ['hero', 'display', 'title', 'subtitle'];

/** All text goes through here: theme typography and system font scaling (never disabled). */
export function Text({ variant = 'body', color = 'textPrimary', align, style, ...props }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      accessibilityRole={HEADINGS.includes(variant) ? 'header' : undefined}
      maxFontSizeMultiplier={2}
      style={[theme.typography[variant], { color: theme.colors[color], textAlign: align }, style]}
      {...props}
    />
  );
}
