import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PushPermissionPrompt } from '@/features/notifications';
import { BookingReviewSection } from '@/features/reviews';
import { WebCheckout, type CheckoutOutcome } from '@/shared/payments';
import { useTranslation } from '@/shared/i18n';
import { formatDuration, formatLongDate, formatMinutes, formatMoney, formatTime } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  Button,
  Card,
  ConfirmDialog,
  Icon,
  Notice,
  QueryView,
  Screen,
  Text,
  SuccessCheck,
  Celebration,
} from '@/shared/ui';
import type { Booking, CancellationPreview } from '../api/bookingApi';
import { DevBookingId, PriceBreakdown, StatusBadge } from '../components/BookingParts';
import { useBooking } from '../hooks/useBooking';

export interface BookingScreenProps {
  id: string;
  onBack: () => void;
  onBookAgain: (barbershopId: string) => void;
  onOpenBarbershop: (barbershopId: string) => void;
  /** Opens a support ticket about this booking. */
  onHelp: (bookingId: string) => void;
  onReview: (bookingId: string) => void;
  onEditReview: (reviewId: string) => void;
  /** Sponsor space shown once the booking is confirmed ("booking_success"). */
  successSlot?: ReactNode;
  /** Other ways to pay a pending booking ("Pagar con crédito" of a membership). */
  pendingSlot?: (booking: { id: string; barbershopId: string; refresh: () => void }) => ReactNode;
}

export function BookingScreen({
  id,
  onBack,
  onBookAgain,
  onOpenBarbershop,
  onHelp,
  onReview,
  onEditReview,
  successSlot,
  pendingSlot,
}: BookingScreenProps) {
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
            <When booking={booking} onOpenBarbershop={onOpenBarbershop} />
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
                {data.outcome ? <PaymentOutcome outcome={data.outcome} /> : null}
                {data.payError ? <Notice tone="danger" message={data.payError} /> : null}
                {data.canPay ? (
                  <Button
                    label={
                      data.outcome === 'error' || data.outcome === 'cancel'
                        ? t('payment.retry')
                        : t('payment.pay', { amount: formatMoney(booking.price.total) })
                    }
                    icon="card"
                    onPress={data.pay}
                    loading={data.isStartingPayment}
                    disabled={
                      data.outcome === 'success' || data.outcome === 'pending' || data.outcome === 'waiting'
                    }
                    fullWidth
                  />
                ) : null}
                {pendingSlot?.({
                  id: booking.id,
                  barbershopId: booking.barbershop.id,
                  refresh: () => void data.query.refetch(),
                })}
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

            {booking.status === 'PENDING_PAYMENT' ? <DevBookingId bookingId={booking.id} /> : null}
            {booking.status === 'CONFIRMED' ? <SuccessCheck /> : null}
            {booking.status === 'CONFIRMED' ? successSlot : null}
            {booking.status === 'CONFIRMED' ? (
              <Notice tone="success" message={t('detail.confirmedTitle')}>
                <Button
                  label={t('calendar.addToCalendar', { ns: 'common' })}
                  variant="secondary"
                  icon="calendar"
                  onPress={data.addToCalendar}
                />
              </Notice>
            ) : null}
            <PushPermissionPrompt when={booking.status === 'CONFIRMED'} />
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

            {data.checkout?.kind === 'web' ? (
              <WebCheckout
                paymentUrl={data.checkout.paymentUrl}
                doneUrlPrefix={data.checkout.doneUrlPrefix}
                onFinish={data.finishCheckout}
              />
            ) : null}
            <BookingReviewSection booking={booking} onReview={onReview} onEditReview={onEditReview} />
            <PriceBreakdown price={booking.price} />

            <CancelSection
              preview={data.preview.data}
              canCancel={data.canCancel}
              onAsk={data.askCancel}
              disabled={data.isCancelling}
            />
            <Button
              label={t('detail.help')}
              variant="ghost"
              icon="help-buoy"
              onPress={() => onHelp(booking.id)}
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
      <Celebration visible={data.justConfirmed} />
    </Screen>
  );
}

/** The booking at a glance, on the brand color: what, its state, when, with whom and where. */
function When({ booking, onOpenBarbershop }: { booking: Booking; onOpenBarbershop: (id: string) => void }) {
  const { t } = useTranslation('booking');
  const theme = useTheme();
  const timeZone = booking.barbershop.timezone;
  return (
    <View style={[styles.hero, { backgroundColor: theme.colors.brand, borderRadius: theme.radius.xl }]}>
      <StatusBadge status={booking.status} />
      <Text variant="display" color="onBrand" numberOfLines={2}>
        {booking.service.name ?? t('detail.title')}
      </Text>
      <Text variant="subtitle" color="onBrand">
        {formatLongDate(booking.startAt, timeZone)} · {formatTime(booking.startAt, timeZone)}
      </Text>
      <View style={styles.heroRow}>
        <Icon name="time" size={sizes.icon} color={theme.colors.brandAccent} />
        <Text color="onBrand">{formatMinutes(booking.durationMinutes)}</Text>
      </View>
      {booking.barber.name ? (
        <View style={styles.heroRow}>
          <Icon name="person" size={sizes.icon} color={theme.colors.brandAccent} />
          <Text color="onBrand" style={styles.flex}>
            {t('detail.barber', { barber: booking.barber.name })}
          </Text>
        </View>
      ) : null}
      {booking.barbershop.name ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('detail.openBarbershop')}: ${booking.barbershop.name}`}
          onPress={() => onOpenBarbershop(booking.barbershop.id)}
          style={[styles.heroShop, { borderColor: theme.colors.brandAccent, borderRadius: theme.radius.md }]}
        >
          <Icon name="storefront" size={sizes.icon} color={theme.colors.brandAccent} />
          <Text variant="bodyStrong" color="onBrand" style={styles.flex} numberOfLines={1}>
            {booking.barbershop.name}
          </Text>
          <Icon name="chevron-forward" size={sizes.icon} color={theme.colors.brandAccent} />
        </Pressable>
      ) : null}
    </View>
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
  flex: { flex: 1 },
  hero: { padding: spacing.lg, gap: spacing.sm },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroShop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
  },
});

/** What the checkout page reported, while the backend confirms (it alone decides the state). */
function PaymentOutcome({ outcome }: { outcome: CheckoutOutcome | 'waiting' }) {
  const { t } = useTranslation('booking');
  if (outcome === 'error' || outcome === 'cancel') {
    return <Notice tone="danger" title={t('payment.failedTitle')} message={t('payment.failed')} />;
  }
  if (outcome === 'pending')
    return <Notice tone="info" title={t('payment.pendingTitle')} message={t('payment.pending')} />;
  if (outcome === 'expired') return <Notice tone="warning" message={t('payment.expired')} />;
  return (
    <Notice tone="info" message={outcome === 'waiting' ? t('payment.waiting') : t('payment.confirming')} />
  );
}
