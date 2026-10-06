import { Redirect, Stack, usePathname } from 'expo-router';
import { useSession } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';

/** Client area: requires a session. Real authorization is always the backend's. */
export default function ClientLayout() {
  const { t } = useTranslation();
  const status = useSession((s) => s.status);
  const pathname = usePathname();
  if (status !== 'authenticated') {
    return <Redirect href={{ pathname: '/login', params: { returnTo: pathname } }} />;
  }
  return (
    <Stack>
      <Stack.Screen name="bookings" options={{ title: t('nav.bookings') }} />
    </Stack>
  );
}
