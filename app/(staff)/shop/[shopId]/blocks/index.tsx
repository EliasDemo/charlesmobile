import { router, useLocalSearchParams } from 'expo-router';
import { TimeBlocksScreen } from '@/features/shop-management';

export default function BlocksRoute() {
  const { shopId, barberId, own, timeZone } = useLocalSearchParams<{
    shopId: string;
    barberId?: string;
    own?: string;
    timeZone?: string;
  }>();
  const ownBarberId = own === '1' ? barberId : undefined;
  return (
    <TimeBlocksScreen
      shopId={shopId}
      ownBarberId={ownBarberId}
      timeZone={timeZone}
      onNew={() =>
        router.push({
          pathname: '/shop/[shopId]/blocks/new',
          params: ownBarberId ? { shopId, barberId: ownBarberId, own: '1', timeZone } : { shopId },
        })
      }
    />
  );
}
