import { router, useLocalSearchParams } from 'expo-router';
import { BarbershopScreen } from '@/features/barbershop';
import { MembershipPlansSection } from '@/features/memberships';
import { VerifiedBadge } from '@/features/plans';
import { ActivePromotions } from '@/features/promotions';
import { SendMessageButton } from '@/features/messaging';
import { ReportBarbershopButton } from '@/features/support';
import { ShopVideosSection } from '@/features/videos';
import { useSession } from '@/shared/api';
import { askForAccount } from '@/shared/ui';

export default function BarbershopRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authenticated = useSession((s) => s.status === 'authenticated');
  return (
    <BarbershopScreen
      id={id}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onOpenService={(serviceId) =>
        router.push({ pathname: '/barbershop/[id]/service/[serviceId]', params: { id, serviceId } })
      }
      onOpenReviews={() => router.push({ pathname: '/barbershop/[id]/reviews', params: { id } })}
      onBook={() => router.push({ pathname: '/book/[barbershopId]', params: { barbershopId: id } })}
      onOpenGallery={() => router.push({ pathname: '/barbershop/[id]/gallery', params: { id } })}
      onBookStyle={(serviceId, barberId) =>
        router.push({
          pathname: '/book/[barbershopId]',
          params: { barbershopId: id, serviceId, ...(barberId ? { barberId } : {}) },
        })
      }
      footer={authenticated ? <ReportBarbershopButton barbershopId={id} /> : null}
      extraSections={(shop) => (
        <>
          <VerifiedBadge barbershopId={id} />
          <SendMessageButton
            onPress={() =>
              authenticated
                ? router.push({ pathname: '/messages/new', params: { barbershopId: id, name: shop.name } })
                : askForAccount('message', `/barbershop/${id}`)
            }
          />
          <ActivePromotions barbershopId={id} timeZone={shop.timezone} />
          <ShopVideosSection barbershopId={id} />
          <MembershipPlansSection
            barbershopId={id}
            onRequireLogin={() => askForAccount('subscribe', `/barbershop/${id}`)}
          />
        </>
      )}
      onOpenBarberProfile={(profileId) =>
        router.push({ pathname: '/barber/[id]', params: { id: profileId } })
      }
      onRequireLogin={() => askForAccount('favorite', `/barbershop/${id}`)}
    />
  );
}
