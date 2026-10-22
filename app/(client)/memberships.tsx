import { router } from 'expo-router';
import { MyMembershipsScreen } from '@/features/memberships';

export default function MyMembershipsRoute() {
  return (
    <MyMembershipsScreen onOpenShop={(id) => router.push({ pathname: '/barbershop/[id]', params: { id } })} />
  );
}
