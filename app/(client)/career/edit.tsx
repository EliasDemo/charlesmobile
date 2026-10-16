import { router } from 'expo-router';
import { CareerProfileFormScreen } from '@/features/career';

export default function CareerEditRoute() {
  return <CareerProfileFormScreen onSaved={() => router.back()} />;
}
