import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing } from '@/shared/theme';
import { Button, Illustration, Screen, Text } from '@/shared/ui';

export interface SignInPromptProps {
  onLogin: () => void;
  onRegister: () => void;
}

/**
 * For tabs that need an account (Bookings, Profile) when browsing without a session: one compact
 * block, "Iniciar sesión" as the main action and "Crear cuenta" right under it.
 */
export function SignInPrompt({ onLogin, onRegister }: SignInPromptProps) {
  const { t } = useTranslation('auth');
  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.center}>
        <View style={styles.block}>
          <Illustration icon="person-circle-outline" />
          <Text variant="title" align="center">
            {t('signInPrompt.title')}
          </Text>
          <Text color="textSecondary" align="center">
            {t('signInPrompt.message')}
          </Text>
          <View style={styles.actions}>
            <Button label={t('login.submit')} onPress={onLogin} fullWidth />
            <Button label={t('register.submit')} variant="secondary" onPress={onRegister} fullWidth />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  block: { gap: spacing.md, width: '100%', maxWidth: sizes.maxContentWidth, alignSelf: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
