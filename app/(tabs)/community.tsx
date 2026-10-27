import { router } from 'expo-router';
import { CommunityScreen } from '@/features/community';
import { useMyCareerProfile } from '@/features/career';
import { useShopHome } from '@/features/shop-management';
import { useSession } from '@/shared/api';
import { askForAccount, useCommunityNavigation } from '@/shared/ui';

/** "Comunidad": what barbershops and barbers publish. Publishing needs a shop or a professional profile. */
export default function CommunityRoute() {
  const authenticated = useSession((s) => s.status === 'authenticated');
  const { shops } = useShopHome();
  const career = useMyCareerProfile();
  const nav = useCommunityNavigation('/community');
  return (
    <CommunityScreen
      nav={nav}
      canPublish={authenticated && (shops.length > 0 || !!career.data)}
      onPublish={() => router.push('/community/new')}
      onSaved={() =>
        authenticated ? router.push('/community/saved') : askForAccount('generic', '/community')
      }
    />
  );
}
