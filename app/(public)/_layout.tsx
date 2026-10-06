import { Stack } from 'expo-router';
import { useTranslation } from '@/shared/i18n';
import { useStackScreenOptions } from '@/shared/ui';

export default function PublicLayout() {
  const { t } = useTranslation();
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="design-system" options={{ title: t('designSystem.title') }} />
      <Stack.Screen name="search-filters" options={{ title: t('nav.filters'), presentation: 'modal' }} />
      <Stack.Screen name="barbershop/[id]/index" options={{ title: t('nav.barbershop') }} />
      <Stack.Screen name="barbershop/[id]/service/[serviceId]" options={{ title: t('nav.service') }} />
      <Stack.Screen name="barbershop/[id]/reviews" options={{ title: t('nav.reviews') }} />
      <Stack.Screen name="book/[barbershopId]" options={{ title: t('nav.book') }} />
      <Stack.Screen name="book/summary" options={{ title: t('nav.summary') }} />
    </Stack>
  );
}
