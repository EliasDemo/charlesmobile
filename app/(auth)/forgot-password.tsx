import { router } from 'expo-router';
import { ForgotPasswordScreen } from '@/features/auth';

export default function ForgotPasswordRoute() {
  return (
    <ForgotPasswordScreen
      onSent={(email) => router.push({ pathname: '/reset-password', params: { email } })}
    />
  );
}
