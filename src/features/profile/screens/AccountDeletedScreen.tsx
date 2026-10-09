import { StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatLongDate } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import { Button, Illustration, Screen, Text } from '@/shared/ui';

/** After requesting the deletion: the session is gone; explain the date and how to undo it. */
export function AccountDeletedScreen({
  scheduledFor,
  onHome,
}: {
  scheduledFor?: string;
  onHome: () => void;
}) {
  const { t } = useTranslation('profile');
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.block}>
        <Illustration icon="mail-outline" />
        <Text variant="title" align="center">
          {t('deletion.doneTitle')}
        </Text>
        <Text color="textSecondary" align="center">
          {t('deletion.doneMessage', {
            date: scheduledFor ? formatLongDate(scheduledFor, env.defaultTimeZone) : '',
          })}
        </Text>
        <Button label={t('deletion.goHome')} onPress={onHome} fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { flex: 1, justifyContent: 'center', gap: spacing.md },
});
