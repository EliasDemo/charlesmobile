import { Stack } from 'expo-router';
import { useTranslation } from '@/shared/i18n';
import { useStackScreenOptions } from '@/shared/ui';

export default function AuthLayout() {
  const { t } = useTranslation();
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="login" options={{ title: t('nav.login') }} />
    </Stack>
  );
}
