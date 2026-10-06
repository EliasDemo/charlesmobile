import { Stack } from 'expo-router';
import { useTranslation } from '@/shared/i18n';
import { useStackScreenOptions } from '@/shared/ui';

export default function AuthLayout() {
  const { t } = useTranslation();
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="login" options={{ title: t('nav.login') }} />
      <Stack.Screen name="register" options={{ title: t('nav.register') }} />
      <Stack.Screen name="verify-email" options={{ title: t('nav.verifyEmail') }} />
      <Stack.Screen name="forgot-password" options={{ title: t('nav.forgotPassword') }} />
      <Stack.Screen name="reset-password" options={{ title: t('nav.resetPassword') }} />
    </Stack>
  );
}
