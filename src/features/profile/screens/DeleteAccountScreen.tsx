import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatLongDate, formatMoney, formatShortDate, formatTime } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import {
  Button,
  Card,
  InfoCard,
  Notice,
  PasswordField,
  QueryView,
  Screen,
  Text,
  useFieldErrorText,
} from '@/shared/ui';
import type { DeletionPreview } from '../api/accountDeletionApi';
import { useDeleteAccount } from '../hooks/useDeleteAccount';

export function DeleteAccountScreen({ onDeleted }: { onDeleted: (scheduledFor: string | null) => void }) {
  const { t } = useTranslation('profile');
  const errorText = useFieldErrorText('auth');
  const deletion = useDeleteAccount({ onDeleted });

  return (
    <Screen>
      <QueryView query={deletion.preview}>
        {(preview) => (
          <View style={styles.content}>
            <Text color="textSecondary">{t('deletion.intro')}</Text>
            {preview.pending ? (
              <Notice
                tone="info"
                message={t('deletion.alreadyPending', {
                  date: formatLongDate(preview.scheduledForIfRequestedNow, env.defaultTimeZone),
                })}
              />
            ) : null}
            <Blockers preview={preview} />
            <Consequences preview={preview} />
            <Bookings preview={preview} />
            {deletion.canRequest ? (
              <View style={styles.content}>
                {deletion.generalError ? <Notice tone="danger" message={deletion.generalError} /> : null}
                <Controller
                  control={deletion.form.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <PasswordField
                      label={t('deletion.password')}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      error={errorText(fieldState.error?.message)}
                    />
                  )}
                />
                <Button
                  label={t('deletion.confirm')}
                  variant="danger"
                  onPress={() => void deletion.submit()}
                  loading={deletion.isSubmitting}
                  fullWidth
                />
              </View>
            ) : null}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

function Blockers({ preview }: { preview: DeletionPreview }) {
  const { t } = useTranslation('profile');
  if (preview.blockers.length === 0) return null;
  return (
    <Notice
      tone="danger"
      title={t('deletion.blockedTitle')}
      message={preview.blockers
        .map((blocker) => t(`deletion.blockers.${blocker.reason}`, { name: blocker.barbershopName ?? '' }))
        .join('\n')}
    />
  );
}

/** What will happen, in plain words, with the date the API computed. */
function Consequences({ preview }: { preview: DeletionPreview }) {
  const { t } = useTranslation('profile');
  const date = formatLongDate(preview.scheduledForIfRequestedNow, env.defaultTimeZone);
  const items = [
    t('deletion.consequences.sessions'),
    t('deletion.consequences.bookings'),
    t('deletion.consequences.grace', { days: preview.graceDays, date }),
    t('deletion.consequences.undo'),
    t('deletion.consequences.kept'),
    t('deletion.consequences.email'),
  ];
  return (
    <Card>
      <Text variant="subtitle">{t('deletion.consequencesTitle')}</Text>
      {items.map((item) => (
        <Text key={item}>• {item}</Text>
      ))}
    </Card>
  );
}

/** Each booking that will be cancelled, in its barbershop's zone, with the refund the API quotes. */
function Bookings({ preview }: { preview: DeletionPreview }) {
  const { t } = useTranslation('profile');
  if (preview.bookings.length === 0) return null;
  return (
    <View style={styles.list}>
      <Text variant="subtitle">{t('deletion.bookingsTitle')}</Text>
      {preview.bookings.map((booking) => (
        <InfoCard
          key={booking.bookingId}
          title={booking.barbershop.name ?? ''}
          details={[
            {
              icon: 'calendar',
              text: t('deletion.bookingLine', {
                date: formatShortDate(booking.startAt, booking.barbershop.timezone),
                time: formatTime(booking.startAt, booking.barbershop.timezone),
              }),
            },
            {
              icon: 'cash',
              text:
                booking.refund.amount.amount > 0
                  ? t('deletion.refund', {
                      amount: formatMoney(booking.refund.amount),
                      percent: booking.refund.percent,
                    })
                  : t('deletion.noRefund'),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  list: { gap: spacing.sm },
});
