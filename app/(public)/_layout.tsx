import { Stack } from 'expo-router';
import { useTranslation } from '@/shared/i18n';
import { useStackScreenOptions } from '@/shared/ui';

export default function PublicLayout() {
  const { t } = useTranslation();
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="design-system" options={{ title: t('designSystem.title') }} />
    </Stack>
  );
}
