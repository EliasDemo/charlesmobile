import { create } from 'zustand';
import { useTranslation } from '@/shared/i18n';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

export type AuthPromptReason = 'book' | 'message' | 'favorite' | 'apply' | 'subscribe' | 'generic';

interface AuthPromptState {
  request: { reason: AuthPromptReason; returnTo: string } | null;
  close: () => void;
}

const useAuthPromptStore = create<AuthPromptState>((set) => ({
  request: null,
  close: () => set({ request: null }),
}));

/**
 * An action needs an account: instead of jumping to the login screen, a sheet explains why and
 * offers "Crear cuenta" or "Iniciar sesión". After either, the user comes back to `returnTo`.
 */
export function askForAccount(reason: AuthPromptReason, returnTo: string) {
  useAuthPromptStore.setState({ request: { reason, returnTo } });
}

export interface AuthPromptHostProps {
  onLogin: (returnTo: string) => void;
  onRegister: (returnTo: string) => void;
}

/** Mounted once in the root layout; the routes decide where login and register live. */
export function AuthPromptHost({ onLogin, onRegister }: AuthPromptHostProps) {
  const { t } = useTranslation();
  const request = useAuthPromptStore((s) => s.request);
  const close = useAuthPromptStore((s) => s.close);
  const go = (to: (returnTo: string) => void) => {
    if (!request) return;
    close();
    to(request.returnTo);
  };
  const reason = request?.reason ?? 'generic';
  return (
    <ConfirmDialog
      visible={request !== null}
      icon="person-circle"
      title={t(`authPrompt.${reason}.title`)}
      message={t(`authPrompt.${reason}.text`)}
      confirmLabel={t('authPrompt.register')}
      onConfirm={() => go(onRegister)}
      onCancel={close}
    >
      <Button label={t('authPrompt.login')} variant="secondary" onPress={() => go(onLogin)} fullWidth />
    </ConfirmDialog>
  );
}
