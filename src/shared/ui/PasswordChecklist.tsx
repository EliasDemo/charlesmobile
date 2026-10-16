import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { PASSWORD_RULES, passwordChecks } from '@/shared/lib';
import { spacing, useTheme } from '@/shared/theme';
import { Icon } from './Icon';
import { Text } from './Text';

/** Live requirements under a new password, each one checked while typing. */
export function PasswordChecklist({ password }: { password: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const checks = passwordChecks(password);
  return (
    <View style={styles.container} accessibilityLiveRegion="polite" testID="password-requirements">
      {PASSWORD_RULES.map((rule) => {
        const ok = checks[rule];
        const label = t(`passwordRules.${rule}`, { count: password.length });
        return (
          <View
            key={rule}
            style={styles.row}
            accessible
            accessibilityLabel={`${label}: ${ok ? t('passwordRules.met') : t('passwordRules.notMet')}`}
          >
            <Icon
              name={ok ? 'checkmark-circle' : 'ellipse-outline'}
              size={theme.typography.caption.fontSize + 2}
              color={ok ? theme.colors.success : theme.colors.textMuted}
            />
            <Text variant="caption" color={ok ? 'success' : 'textSecondary'}>
              {label}
            </Text>
          </View>
        );
      })}
      <Text variant="caption" color="textMuted">
        {t('passwordRules.common')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
