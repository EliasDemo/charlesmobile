import { router, useLocalSearchParams } from 'expo-router';
import { PublicCareerProfileScreen } from '@/features/career';
import { StaffBarberActions } from '@/features/jobs';
import { useEffectiveMode, useShopHome } from '@/features/shop-management';
import { ProfileVideos } from '@/features/videos';
import { FollowButton } from '@/features/community';
import { useSession } from '@/shared/api';
import { askForAccount } from '@/shared/ui';

/** A barber's public profile. Owners and managers, in barbershop mode, can write and invite. */
export default function BarberProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authenticated = useSession((s) => s.status === 'authenticated');
  const shopMode = useEffectiveMode() === 'shop';
  const { currentId } = useShopHome();
  return (
    <PublicCareerProfileScreen
      id={id}
      onOpenShop={(barbershopId) =>
        barbershopId
          ? router.push({ pathname: '/barbershop/[id]', params: { id: barbershopId } })
          : router.back()
      }
      actions={
        <>
          {/* Following brings their posts to Comunidad > Siguiendo. */}
          <FollowButton
            author={{ kind: 'PROFESSIONAL', id }}
            onRequireLogin={() => askForAccount('generic', `/barber/${id}`)}
          />
          {authenticated && shopMode && currentId ? (
            <StaffBarberActions
              shopId={currentId}
              profileId={id}
              onWrite={() =>
                router.push({ pathname: '/messages/new', params: { shopId: currentId, barberProfileId: id } })
              }
              onOffer={() =>
                router.push({
                  pathname: '/shop/[shopId]/offers/new',
                  params: { shopId: currentId, barberProfileId: id },
                })
              }
            />
          ) : undefined}
        </>
      }
      videos={<ProfileVideos profileId={id} />}
    />
  );
}
