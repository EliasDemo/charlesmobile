import { router } from 'expo-router';
import { CareerSpecialtiesScreen } from '@/features/career';

export default function CareerSpecialtiesRoute() {
  return <CareerSpecialtiesScreen onSaved={() => router.back()} />;
}
