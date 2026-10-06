import { useTranslation } from '@/shared/i18n';
import { Button, EmptyState, Screen } from '@/shared/ui';

export interface SignInPromptProps {
  onLogin: () => void;
  onRegister: () => void;
}

/** For tabs that need an account (Bookings, Profile) when browsing without a session. */
export function SignInPrompt({ onLogin, onRegister }: SignInPromptProps) {
  const { t } = useTranslation('auth');
  return (
    <Screen edges={['top', 'left', 'right']}>
      <EmptyState
        title={t('signInPrompt.title')}
        message={t('signInPrompt.message')}
        action={{ label: t('login.submit'), onPress: onLogin }}
      />
      <Button label={t('register.submit')} variant="ghost" onPress={onRegister} />
    </Screen>
  );
}
