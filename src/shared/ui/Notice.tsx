import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Text } from './Text';

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

export interface NoticeProps {
  tone?: NoticeTone;
  title?: string;
  message: string;
  /** Optional action under the message (e.g. a button). */
  children?: ReactNode;
}

const TEXT_COLOR = { info: 'primary', success: 'success', warning: 'warning', danger: 'danger' } as const;

/** Inline message inside a screen (form errors, "check your email", feature not active yet…). */
export function Notice({ tone = 'info', title, message, children }: NoticeProps) {
  const theme = useTheme();
  const accent = theme.colors[TEXT_COLOR[tone]];
  return (
    <View
      accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
      style={[
        styles.notice,
        { borderColor: accent, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md },
      ]}
    >
      {title ? (
        <Text variant="bodyStrong" color={TEXT_COLOR[tone]}>
          {title}
        </Text>
      ) : null}
      <Text color="textPrimary">{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { gap: spacing.xs, padding: spacing.md, borderWidth: sizes.borderWidth, borderLeftWidth: 4 },
});
