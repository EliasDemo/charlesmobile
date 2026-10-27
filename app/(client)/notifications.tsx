import { router } from 'expo-router';
import { InboxScreen, notificationTarget } from '@/features/notifications';
import { useAppMode } from '@/features/shop-management';

export default function NotificationsRoute() {
  return (
    <InboxScreen
      onOpen={(resource, type) => {
        const target = notificationTarget(resource, type);
        if (target.kind === 'booking') router.push({ pathname: '/bookings/[id]', params: { id: target.id } });
        if (target.kind === 'bookShop') {
          useAppMode.getState().setMode('client');
          router.push({ pathname: '/barbershop/[id]', params: { id: target.barbershopId } });
        }
        if (target.kind === 'ticket') router.push({ pathname: '/support/[id]', params: { id: target.id } });
        if (target.kind === 'support') router.push('/support');
        if (target.kind === 'shopReviews') {
          useAppMode.getState().setMode('shop');
          router.push({ pathname: '/shop/[shopId]/reviews', params: { shopId: target.shopId } });
        }
        if (target.kind === 'shop' || target.kind === 'shopJobs') {
          useAppMode.getState().setMode('shop');
          router.navigate('/shop');
        }
        if (target.kind === 'conversation') {
          router.push({ pathname: '/messages/[id]', params: { id: target.id, resolve: '1' } });
        }
        if (target.kind === 'myApplications') router.push('/jobs/applications');
        if (target.kind === 'myPlan') {
          useAppMode.getState().setMode('shop');
          router.push('/my-plan');
        }
        if (target.kind === 'myMemberships') router.push('/memberships');
        if (target.kind === 'myOffers') router.push('/jobs/offers');
        if (target.kind === 'shopOffers') {
          useAppMode.getState().setMode('shop');
          router.push('/my-offers');
        }
      }}
    />
  );
}
