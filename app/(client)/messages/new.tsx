import { router, useLocalSearchParams } from 'expo-router';
import { NewConversationScreen } from '@/features/messaging';

/**
 * First message. To a barbershop: `barbershopId` (and `professional` when a barber writes about
 * work). From a barbershop to a barber: `shopId` and `barberProfileId`.
 */
export default function NewConversationRoute() {
  const params = useLocalSearchParams<{
    barbershopId?: string;
    professional?: string;
    shopId?: string;
    barberProfileId?: string;
    name?: string;
  }>();
  const target =
    params.shopId && params.barberProfileId
      ? { kind: 'barber' as const, shopId: params.shopId, barberProfileId: params.barberProfileId }
      : {
          kind: 'barbershop' as const,
          barbershopId: params.barbershopId!,
          professional: params.professional === '1',
        };
  return (
    <NewConversationScreen
      target={target}
      name={params.name}
      onStarted={(id) =>
        router.replace({
          pathname: '/messages/[id]',
          params: { id, ...(target.kind === 'barber' ? { shopId: target.shopId } : {}) },
        })
      }
    />
  );
}
