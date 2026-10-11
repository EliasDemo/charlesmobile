import { router } from 'expo-router';
import { SupportScreen } from '@/features/support';

export default function SupportRoute() {
  return (
    <SupportScreen
      onNew={() => router.push('/support/new')}
      onOpen={(id) => router.push({ pathname: '/support/[id]', params: { id } })}
    />
  );
}
