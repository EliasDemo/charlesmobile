import { router } from 'expo-router';
import { AddCutScreen } from '@/features/career';

export default function AddCutRoute() {
  return <AddCutScreen onUploaded={() => router.back()} />;
}
