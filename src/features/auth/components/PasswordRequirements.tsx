import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { Text } from '@/shared/ui';
import { passwordLengthOk } from '../schemas/authSchemas';

/** Live requirements under the password field, updated while typing. */
export function PasswordRequirements({ password }: { password: string }) {
  const { t } = useTranslation('auth');
  const lengthOk = passwordLengthOk(password);
  return (
    <View style={styles.container} accessibilityLiveRegion="polite" testID="password-requirements">
      <Text variant="caption" color="textSecondary">
        {t('passwordRules.title')}
      </Text>
      <Text
        variant="caption"
        color={lengthOk ? 'success' : 'textSecondary'}
        accessibilityLabel={`${t('passwordRules.length', { count: password.length })}: ${
          lengthOk ? t('passwordRules.met') : t('passwordRules.notMet')
        }`}
      >
        {lengthOk ? '✓ ' : '• '}
        {t('passwordRules.length', { count: password.length })}
      </Text>
      <Text variant="caption" color="textSecondary">
        {'• '}
        {t('passwordRules.common')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xxs },
});
