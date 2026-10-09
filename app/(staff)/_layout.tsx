import { Redirect, Stack, usePathname } from 'expo-router';
import { useSession, type SessionUser } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { useStackScreenOptions } from '@/shared/ui';

const STAFF_ROLES: SessionUser['roles'] = ['OWNER', 'BARBER'];

/** Barbershop area: requires a session with a staff role. The backend still has the final word (403/404). */
export default function StaffLayout() {
  const { t } = useTranslation('shop');
  const screenOptions = useStackScreenOptions();
  const { status, user } = useSession();
  const pathname = usePathname();
  if (status !== 'authenticated') {
    return <Redirect href={{ pathname: '/login', params: { returnTo: pathname } }} />;
  }
  if (!user?.roles.some((role) => STAFF_ROLES.includes(role))) return <Redirect href="/" />;
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="shop/[shopId]/review" options={{ title: t('home.sections.review') }} />
      <Stack.Screen name="shop/[shopId]/details" options={{ title: t('home.sections.details') }} />
      <Stack.Screen name="shop/[shopId]/status" options={{ title: t('home.sections.status') }} />
      <Stack.Screen name="shop/[shopId]/services/index" options={{ title: t('home.sections.services') }} />
      <Stack.Screen name="shop/[shopId]/services/new" options={{ title: t('nav.newService') }} />
      <Stack.Screen name="shop/[shopId]/services/[serviceId]" options={{ title: t('nav.editService') }} />
      <Stack.Screen name="shop/[shopId]/barbers/index" options={{ title: t('home.sections.barbers') }} />
      <Stack.Screen name="shop/[shopId]/barbers/new" options={{ title: t('nav.newBarber') }} />
      <Stack.Screen name="shop/[shopId]/barbers/[barberId]" options={{ title: t('nav.editBarber') }} />
      <Stack.Screen name="shop/[shopId]/members" options={{ title: t('home.sections.members') }} />
      <Stack.Screen name="shop/[shopId]/hours" options={{ title: t('home.sections.hours') }} />
      <Stack.Screen name="shop/[shopId]/blocks/index" options={{ title: t('home.sections.blocks') }} />
      <Stack.Screen name="shop/[shopId]/blocks/new" options={{ title: t('nav.newBlock') }} />
    </Stack>
  );
}
