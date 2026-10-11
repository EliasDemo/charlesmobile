import { router } from 'expo-router';
import { InboxScreen, notificationTarget } from '@/features/notifications';
import { useAppMode } from '@/features/shop-management';

export default function NotificationsRoute() {
  return (
    <InboxScreen
      onOpen={(resource) => {
        const target = notificationTarget(resource);
        if (target.kind === 'booking') router.push({ pathname: '/bookings/[id]', params: { id: target.id } });
        if (target.kind === 'ticket') router.push({ pathname: '/support/[id]', params: { id: target.id } });
        if (target.kind === 'support') router.push('/support');
        if (target.kind === 'shop') {
          useAppMode.getState().setMode('shop');
          router.navigate('/shop');
        }
      }}
    />
  );
}
