import { Redirect, Stack, usePathname } from 'expo-router';
import { useSession } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { useStackScreenOptions } from '@/shared/ui';

/** Client area: requires a session. Real authorization is always the backend's. */
export default function ClientLayout() {
  const { t } = useTranslation();
  const screenOptions = useStackScreenOptions();
  const status = useSession((s) => s.status);
  const pathname = usePathname();
  if (status !== 'authenticated') {
    return <Redirect href={{ pathname: '/login', params: { returnTo: pathname } }} />;
  }
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="profile/edit" options={{ title: t('nav.editProfile') }} />
      <Stack.Screen name="profile/preferences" options={{ title: t('nav.preferences') }} />
    </Stack>
  );
}
