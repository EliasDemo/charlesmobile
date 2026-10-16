import { router } from 'expo-router';
import { RankingScreen } from '@/features/career';

export default function RankingRoute() {
  return <RankingScreen onOpen={(id) => router.push({ pathname: '/barber/[id]', params: { id } })} />;
}
