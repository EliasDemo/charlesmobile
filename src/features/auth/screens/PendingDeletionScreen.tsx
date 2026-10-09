import { StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatLongDate } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import { Button, Illustration, Notice, QueryView, Screen, Text } from '@/shared/ui';
import { usePendingDeletion } from '../hooks/usePendingDeletion';

export interface PendingDeletionScreenProps {
  /** Deletion cancelled: back to a normal login. */
  onCancelled: () => void;
  /** No usable access (expired, never pending): back to login. */
  onLeave: () => void;
}

/** "Tu cuenta se eliminará el …" with "Cancelar eliminación" as the only main action. */
export function PendingDeletionScreen({ onCancelled, onLeave }: PendingDeletionScreenProps) {
  const { t } = useTranslation('auth');
  const pending = usePendingDeletion({ onCancelled });
  const leave = () => {
    pending.leave();
    onLeave();
  };

  if (!pending.hasAccess || pending.expired || pending.notPending) {
    return (
      <Screen>
        <View style={styles.block}>
          <Notice
            tone="info"
            message={pending.notPending ? t('pendingDeletion.notPending') : t('pendingDeletion.expired')}
          />
          <Button label={t('login.submit')} onPress={leave} fullWidth />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <QueryView query={pending.status}>
        {() => (
          <View style={styles.block}>
            <Illustration icon="time-outline" />
            <Text variant="title" align="center">
              {t('pendingDeletion.title')}
            </Text>
            <Text color="textSecondary" align="center">
              {pending.scheduledFor
                ? t('pendingDeletion.message', {
                    date: formatLongDate(pending.scheduledFor, env.defaultTimeZone),
                  })
                : t('pendingDeletion.messageNoDate')}
            </Text>
            {pending.cancelError ? <Notice tone="danger" message={pending.cancelError} /> : null}
            <Button
              label={t('pendingDeletion.cancel')}
              onPress={pending.cancel}
              loading={pending.isCancelling}
              fullWidth
            />
            <Button label={t('pendingDeletion.leave')} variant="ghost" onPress={leave} />
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { flex: 1, justifyContent: 'center', gap: spacing.md },
});
