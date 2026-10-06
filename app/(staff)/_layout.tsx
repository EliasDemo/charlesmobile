import { Redirect, Stack, usePathname } from 'expo-router';
import { useSession, type SessionUser } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';

const STAFF_ROLES: SessionUser['roles'] = ['OWNER', 'BARBER'];

/** Barbershop area: requires a session with a staff role. The backend still has the final word (403/404). */
export default function StaffLayout() {
  const { t } = useTranslation();
  const { status, user } = useSession();
  const pathname = usePathname();
  if (status !== 'authenticated') {
    return <Redirect href={{ pathname: '/login', params: { returnTo: pathname } }} />;
  }
  if (!user?.roles.some((role) => STAFF_ROLES.includes(role))) return <Redirect href="/" />;
  return (
    <Stack>
      <Stack.Screen name="agenda" options={{ title: t('nav.agenda') }} />
    </Stack>
  );
}
