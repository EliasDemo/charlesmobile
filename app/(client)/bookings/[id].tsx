import { router, useLocalSearchParams } from 'expo-router';
import { AdSlot } from '@/features/ads';
import { BookingScreen } from '@/features/booking';

export default function BookingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <BookingScreen
      id={id}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/bookings'))}
      onBookAgain={(barbershopId) =>
        router.push({ pathname: '/book/[barbershopId]', params: { barbershopId } })
      }
      onOpenBarbershop={(id) => router.push({ pathname: '/barbershop/[id]', params: { id } })}
      onHelp={(bookingId) => router.push({ pathname: '/support/new', params: { bookingId } })}
      onReview={(bookingId) => router.push({ pathname: '/reviews/new', params: { bookingId } })}
      onEditReview={(id) => router.push({ pathname: '/reviews/[id]', params: { id } })}
      successSlot={
        <AdSlot
          slot="booking_success"
          onOpenSponsor={(sponsorId) => router.push({ pathname: '/sponsor/[id]', params: { id: sponsorId } })}
        />
      }
    />
  );
}
