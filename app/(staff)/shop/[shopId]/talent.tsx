import { router, useLocalSearchParams } from 'expo-router';
import { RankingScreen } from '@/features/career';
import { InviteBarberButton } from '@/features/jobs';

/** "Buscar barberos": available ones, each with "Invitar". */
export default function TalentRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <RankingScreen
      availableOnly
      onOpen={(id) => router.push({ pathname: '/barber/[id]', params: { id } })}
      renderAction={(barber) => <InviteBarberButton shopId={shopId} profileId={barber.id} />}
    />
  );
}
