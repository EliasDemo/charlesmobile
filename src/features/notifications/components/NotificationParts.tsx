import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Button, ConfirmDialog, Icon, Notice, Text, useWiggle } from '@/shared/ui';
import { usePushPrompt, useUnreadCount } from '../hooks/useNotifications';

/** Bell with the unread count, for the top right of Explorar and Mi barbería. Only with a session. */
export function NotificationBell({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('notifications');
  const theme = useTheme();
  const { authenticated, count } = useUnreadCount();
  const wiggle = useWiggle(count);
  if (!authenticated) return null;
  const label = count > 0 ? t('bellUnread', { count }) : t('bell');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={spacing.sm}
      style={styles.bell}
      testID="notification-bell"
    >
      <Animated.View style={wiggle}>
        <Icon name="notifications-outline" size={sizes.icon} color={theme.colors.textPrimary} />
      </Animated.View>
      {count > 0 ? (
        <View
          style={[styles.badge, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.pill }]}
        >
          <Text variant="caption" color="onPrimary">
            {count > MAX_BADGE ? `${MAX_BADGE}+` : String(count)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const MAX_BADGE = 99;

/**
 * Explains why the app wants to send notifications, then asks the system. Shown once, at a
 * meaningful moment (the first confirmed booking).
 */
export function PushPermissionPrompt({ when }: { when: boolean }) {
  const { t } = useTranslation('notifications');
  const prompt = usePushPrompt(when);
  return (
    <ConfirmDialog
      visible={prompt.visible}
      title={t('prompt.title')}
      message={t('prompt.message')}
      confirmLabel={t('prompt.accept')}
      onConfirm={() => void prompt.accept()}
      onCancel={prompt.later}
    />
  );
}

/** In Preferences: when push is refused, explain it and offer the system settings. */
export function PushPermissionNotice() {
  const { t } = useTranslation('notifications');
  const prompt = usePushPrompt(true);
  if (prompt.permission !== 'denied' && prompt.permission !== 'blocked') return null;
  return (
    <Notice tone="info" message={t('blocked')}>
      <Button label={t('openSettings')} variant="secondary" onPress={prompt.openSettings} />
    </Notice>
  );
}

const styles = StyleSheet.create({
  bell: {
    minWidth: touchTarget,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: spacing.xxs,
    right: spacing.xxs,
    minWidth: sizes.badge,
    paddingHorizontal: spacing.xxs,
    alignItems: 'center',
  },
});
