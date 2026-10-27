import { router, useLocalSearchParams } from 'expo-router';
import { TalentScreen } from '@/features/career';
import { StaffBarberActions } from '@/features/jobs';

/** "Barberos disponibles": nearby first, each with "Escribir" and "Invitar". */
export default function TalentRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <TalentScreen
      onOpen={(id) => router.push({ pathname: '/barber/[id]', params: { id } })}
      renderActions={(barber) => (
        <StaffBarberActions
          shopId={shopId}
          profileId={barber.id}
          onWrite={() =>
            router.push({
              pathname: '/messages/new',
              params: { shopId, barberProfileId: barber.id, name: barber.displayName },
            })
          }
          onOffer={() =>
            router.push({
              pathname: '/shop/[shopId]/offers/new',
              params: { shopId, barberProfileId: barber.id, name: barber.displayName },
            })
          }
        />
      )}
    />
  );
}
