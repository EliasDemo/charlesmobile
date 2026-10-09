import { router, useLocalSearchParams } from 'expo-router';
import { TimeBlockFormScreen } from '@/features/shop-management';

export default function NewBlockRoute() {
  const { shopId, barberId, own, timeZone } = useLocalSearchParams<{
    shopId: string;
    barberId?: string;
    own?: string;
    timeZone?: string;
  }>();
  return (
    <TimeBlockFormScreen
      shopId={shopId}
      ownBarberId={own === '1' ? barberId : undefined}
      timeZone={timeZone}
      onDone={() => router.back()}
    />
  );
}
