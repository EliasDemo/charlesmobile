import { router, useLocalSearchParams } from 'expo-router';
import { OfferJobScreen } from '@/features/jobs';

export default function OfferJobRoute() {
  const { shopId, barberProfileId, name } = useLocalSearchParams<{
    shopId: string;
    barberProfileId: string;
    name?: string;
  }>();
  return (
    <OfferJobScreen
      shopId={shopId}
      barberProfileId={barberProfileId}
      barberName={name ?? ''}
      onSent={() => router.replace({ pathname: '/shop/[shopId]/offers', params: { shopId } })}
    />
  );
}
