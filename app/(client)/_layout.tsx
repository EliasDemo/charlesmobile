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
      <Stack.Screen name="profile/password" options={{ title: t('nav.changePassword') }} />
      <Stack.Screen name="profile/preferences" options={{ title: t('nav.preferences') }} />
      <Stack.Screen name="profile/favorites" options={{ title: t('nav.favorites') }} />
      <Stack.Screen name="profile/waitlist" options={{ title: t('title', { ns: 'waitlist' }) }} />
      <Stack.Screen name="profile/delete-account" options={{ title: t('nav.deleteAccount') }} />
      <Stack.Screen name="profile/invitations" options={{ title: t('nav.invitations', { ns: 'shop' }) }} />
      <Stack.Screen name="create-shop" options={{ title: t('nav.createShop', { ns: 'shop' }) }} />
      <Stack.Screen name="support/index" options={{ title: t('title', { ns: 'support' }) }} />
      <Stack.Screen name="support/new" options={{ title: t('new.title', { ns: 'support' }) }} />
      <Stack.Screen name="support/[id]" options={{ title: t('ticket.title', { ns: 'support' }) }} />
      <Stack.Screen name="reviews/new" options={{ title: t('form.newTitle', { ns: 'reviews' }) }} />
      <Stack.Screen name="reviews/[id]" options={{ title: t('form.editTitle', { ns: 'reviews' }) }} />
      <Stack.Screen name="profile/reviews" options={{ title: t('mine.title', { ns: 'reviews' }) }} />
      <Stack.Screen name="notifications" options={{ title: t('nav.notifications') }} />
      <Stack.Screen name="messages/[id]" options={{ title: t('title', { ns: 'messages' }) }} />
      <Stack.Screen name="messages/new" options={{ title: t('new.title', { ns: 'messages' }) }} />
      <Stack.Screen name="career/index" options={{ title: t('title', { ns: 'career' }) }} />
      <Stack.Screen name="career/edit" options={{ title: t('edit', { ns: 'career' }) }} />
      <Stack.Screen name="career/specialties" options={{ title: t('specialties.title', { ns: 'career' }) }} />
      <Stack.Screen name="career/add-cut" options={{ title: t('portfolio.add', { ns: 'career' }) }} />
      <Stack.Screen name="memberships" options={{ title: t('title', { ns: 'memberships' }) }} />
      <Stack.Screen name="jobs/applications" options={{ title: t('myApplications', { ns: 'jobs' }) }} />
      <Stack.Screen name="jobs/offers" options={{ title: t('offers.mine', { ns: 'jobs' }) }} />
      <Stack.Screen name="community/saved" options={{ title: t('savedTitle', { ns: 'community' }) }} />
      <Stack.Screen name="community/new" options={{ title: t('new.title', { ns: 'community' }) }} />
      <Stack.Screen name="bookings/[id]" options={{ title: t('nav.booking') }} />
    </Stack>
  );
}
