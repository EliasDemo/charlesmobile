import { Stack } from 'expo-router';
import { useTranslation } from '@/shared/i18n';

export default function AuthLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: t('nav.login') }} />
    </Stack>
  );
}
