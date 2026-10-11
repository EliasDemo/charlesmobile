import { router } from 'expo-router';
import { AgendaScreen } from '@/features/agenda';
import { NotificationBell } from '@/features/notifications';

export default function AgendaRoute() {
  return <AgendaScreen headerRight={<NotificationBell onPress={() => router.push('/notifications')} />} />;
}
