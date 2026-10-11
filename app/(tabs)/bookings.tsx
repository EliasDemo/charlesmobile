import { router } from 'expo-router';
import { SignInPrompt } from '@/features/auth';
import { MyBookingsScreen } from '@/features/booking';
import { useSession } from '@/shared/api';

export default function BookingsRoute() {
  const status = useSession((s) => s.status);
  if (status !== 'authenticated') {
    return (
      <SignInPrompt
        onLogin={() => router.push({ pathname: '/login', params: { returnTo: '/bookings' } })}
        onRegister={() => router.push('/register')}
      />
    );
  }
  return (
    <MyBookingsScreen
      onOpenBooking={(id) => router.push({ pathname: '/bookings/[id]', params: { id } })}
      onExplore={() => router.navigate('/')}
      onReview={(bookingId) => router.push({ pathname: '/reviews/new', params: { bookingId } })}
    />
  );
}
