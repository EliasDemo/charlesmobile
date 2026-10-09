import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatDuration, formatLongDate, formatMinutes, formatMoney, formatTime } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import { Button, Card, ConfirmDialog, Notice, QueryView, Screen, Text } from '@/shared/ui';
import type { Booking, CancellationPreview } from '../api/bookingApi';
import { DevBookingId, PriceBreakdown, StatusBadge } from '../components/BookingParts';
import { useBooking } from '../hooks/useBooking';

export interface BookingScreenProps {
  id: string;
  onBack: () => void;
  onBookAgain: (barbershopId: string) => void;
  onOpenBarbershop: (barbershopId: string) => void;
}

export function BookingScreen({ id, onBack, onBookAgain, onOpenBarbershop }: BookingScreenProps) {
  const { t } = useTranslation('booking');
  const data = useBooking(id);
  const notFound = {
    title: t('detail.title'),
    message: t('codes.NOT_FOUND', { ns: 'errors' }),
    action: { label: t('actions.back', { ns: 'common' }), onPress: onBack },
  };

  return (
    <Screen>
      <QueryView query={data.query} notFound={notFound}>
        {(booking) => (
          <View style={styles.content}>
            <View style={styles.header}>
              <Text variant="title" style={styles.flex}>
                {booking.service.name ?? t('detail.title')}
              </Text>
              <StatusBadge status={booking.status} />
            </View>
            {booking.status === 'PENDING_PAYMENT' ? (
              <Card testID="pending-hero">
                <Text variant="subtitle">{t('detail.pendingTitle')}</Text>
                {data.secondsLeft > 0 ? (
                  <View
                    accessible
                    accessibilityLiveRegion="polite"
                    accessibilityLabel={t('detail.pendingCountdown', {
                      time: formatDuration(data.secondsLeft),
                    })}
                  >
                    <Text
                      variant="hero"
                      align="center"
                      color={data.secondsLeft <= URGENT_SECONDS ? 'danger' : 'warning'}
                      testID="pending-countdown-time"
                    >
                      {formatDuration(data.secondsLeft)}
                    </Text>
                    <Text align="center" testID="pending-countdown">
                      {t('detail.pendingCountdown', { time: formatDuration(data.secondsLeft) })}
                    </Text>
                  </View>
                ) : (
                  <Text color="textSecondary">{t('detail.checkingExpiry')}</Text>
                )}
                <Button label={t('detail.pay')} disabled fullWidth />
                <Text variant="caption" color="textSecondary" align="center">
                  {t('detail.paySoon')}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {t('detail.pendingExplain')}
                </Text>
              </Card>
            ) : null}
            {data.cancelled ? (
              <Notice
                tone="success"
                message={
                  data.cancelled.refund.amount.amount > 0
                    ? t('cancel.doneRefund', { amount: formatMoney(data.cancelled.refund.amount) })
                    : t('cancel.done')
                }
              />
            ) : null}
            <When booking={booking} timeZone={data.timeZone} timeZoneFailed={Boolean(data.timeZoneError)} />
            {booking.barbershop.name ? (
              <Button
                label={`${t('detail.openBarbershop')}: ${booking.barbershop.name}`}
                variant="ghost"
                onPress={() => onOpenBarbershop(booking.barbershop.id)}
              />
            ) : null}

            {booking.status === 'PENDING_PAYMENT' ? <DevBookingId bookingId={booking.id} /> : null}
            {booking.status === 'CONFIRMED' ? (
              <Notice tone="success" message={t('detail.confirmedTitle')} />
            ) : null}
            {booking.status === 'EXPIRED' ? (
              <Notice tone="warning" title={t('detail.expiredTitle')} message={t('detail.expiredMessage')}>
                <Button label={t('detail.bookAgain')} onPress={() => onBookAgain(booking.barbershop.id)} />
              </Notice>
            ) : null}
            {booking.status === 'CANCELLED' && booking.cancellation ? (
              <Notice
                tone="info"
                message={[
                  t(`detail.cancelledBy.${booking.cancellation.byRole}`),
                  booking.cancellation.reason
                    ? t('detail.cancelReason', { reason: booking.cancellation.reason })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ) : null}
            {data.payment.data?.items.some((p) => p.refunds.length > 0) ? (
              <Card>
                <Text variant="subtitle">{t('detail.refunds')}</Text>
                {data.payment.data.items.flatMap((p) =>
                  p.refunds.map((refund) => (
                    <Text key={refund.refundId}>
                      {t('detail.refundLine', {
                        amount: formatMoney(refund.amount),
                        status: t(`detail.refundStatus.${refund.status}`),
                      })}
                    </Text>
                  )),
                )}
              </Card>
            ) : null}

            <PriceBreakdown price={booking.price} />

            <CancelSection
              preview={data.preview.data}
              canCancel={data.canCancel}
              onAsk={data.askCancel}
              disabled={data.isCancelling}
            />
            <ConfirmDialog
              visible={data.confirmingCancel}
              title={t('cancel.title')}
              message={cancelMessage(t, data.preview.data, data.cancelError)}
              confirmLabel={t('cancel.confirm')}
              onConfirm={data.confirmCancel}
              onCancel={data.dismissCancel}
              loading={data.isCancelling}
              destructive
            />
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

function When({
  booking,
  timeZone,
  timeZoneFailed,
}: {
  booking: Booking;
  timeZone?: string;
  timeZoneFailed: boolean;
}) {
  const { t } = useTranslation('booking');
  return (
    <Card>
      {timeZone ? (
        <Text variant="bodyStrong">
          {formatLongDate(booking.startAt, timeZone)} · {formatTime(booking.startAt, timeZone)}
        </Text>
      ) : timeZoneFailed ? (
        <Text color="textSecondary">{t('detail.timezoneUnavailable')}</Text>
      ) : null}
      <Text color="textSecondary">{formatMinutes(booking.durationMinutes)}</Text>
      {booking.barber.name ? <Text>{t('detail.barber', { barber: booking.barber.name })}</Text> : null}
    </Card>
  );
}

function CancelSection({
  preview,
  canCancel,
  onAsk,
  disabled,
}: {
  preview: CancellationPreview | undefined;
  canCancel: boolean;
  onAsk: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation('booking');
  if (!preview) return null;
  if (canCancel) {
    // Secondary on purpose: the only primary action of a booking is paying (or booking again).
    return <Button label={t('cancel.action')} variant="secondary" onPress={onAsk} disabled={disabled} />;
  }
  // Only explain when it could have been expected (e.g. it already started); final states say nothing.
  return preview.reason === 'ALREADY_STARTED' ? (
    <Text variant="caption" color="textSecondary">
      {t('cancel.notAllowed.ALREADY_STARTED')}
    </Text>
  ) : null;
}

type T = ReturnType<typeof useTranslation<'booking'>>['t'];

/** What happens if the user cancels: the refund exactly as the API quotes it. */
function cancelMessage(t: T, preview: CancellationPreview | undefined, error: string | null): string {
  if (error) return error;
  if (!preview) return t('states.loading', { ns: 'common' });
  if (!preview.allowed) return t(`cancel.notAllowed.${preview.reason ?? 'NOT_CANCELLABLE'}`);
  const rule = t(`cancel.rules.${preview.refund.rule}`);
  if (preview.refund.amount.amount === 0) return rule;
  return `${t('cancel.refund', { amount: formatMoney(preview.refund.amount), percent: preview.refund.percent })} ${rule}`;
}

/** Under one minute left the countdown turns red (its text still says the time). */
const URGENT_SECONDS = 60;

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
