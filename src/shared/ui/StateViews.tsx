import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useIsOnline } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { spacing, useTheme } from '@/shared/theme';
import { Button } from './Button';
import type { IconName } from './Icon';
import { Illustration } from './Illustration';
import { Text } from './Text';

export function LoadingState({ label }: { label?: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const text = label ?? t('states.loading');
  return (
    <View
      style={styles.center}
      accessibilityRole="progressbar"
      accessibilityLabel={text}
      testID="loading-state"
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text color="textSecondary">{text}</Text>
    </View>
  );
}

export interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  /** Illustration above the title (brand icon until the stock photos arrive). */
  icon?: IconName;
}

export function EmptyState({ title, message, action, icon }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.center} testID="empty-state">
      {icon ? <Illustration icon={icon} /> : null}
      <Text variant="subtitle" align="center">
        {title ?? t('states.emptyTitle')}
      </Text>
      {message ? (
        <Text color="textSecondary" align="center">
          {message}
        </Text>
      ) : null}
      {action ? <Button label={action.label} variant="secondary" onPress={action.onPress} /> : null}
    </View>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  /** Extra content under the message (e.g. development diagnostics). */
  children?: ReactNode;
}

export function ErrorState({ title, message, onRetry, retrying, children }: ErrorStateProps) {
  const { t } = useTranslation();
  // Without connection the cause is clear: say so, with its own illustration.
  const offline = !useIsOnline();
  return (
    <View style={styles.center} accessibilityLiveRegion="polite" testID="error-state">
      <Illustration
        icon={offline ? 'cloud-offline' : 'construct'}
        accents={offline ? ['wifi', 'cut', 'sparkles'] : ['cut', 'build', 'sparkles']}
      />
      <Text variant="subtitle" align="center">
        {title ?? (offline ? t('offline.title') : t('states.errorTitle'))}
      </Text>
      {offline ? (
        <Text color="textSecondary" align="center">
          {t('offline.hint')}
        </Text>
      ) : null}
      <Text color="textSecondary" align="center" selectable>
        {message}
      </Text>
      {children}
      {onRetry ? <Button label={t('actions.retry')} onPress={onRetry} loading={retrying} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});
