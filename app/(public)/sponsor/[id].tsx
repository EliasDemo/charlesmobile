import { useLocalSearchParams } from 'expo-router';
import { SponsorScreen } from '@/features/ads';

export default function SponsorRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SponsorScreen id={id} />;
}
