import { Stack } from 'expo-router';
import { useTranslation } from '@/shared/i18n';

export default function PublicLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="design-system" options={{ title: t('designSystem.title') }} />
    </Stack>
  );
}
