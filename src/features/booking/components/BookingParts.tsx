import { Pressable, Share, StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatMoney, formatShortDate, formatTime } from '@/shared/lib';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Badge, Button, Card, Text, type BadgeTone } from '@/shared/ui';
import type { Booking, BookingStatus } from '../api/bookingApi';
import { useBookingTimeZone } from '../hooks/useBooking';

const STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  PENDING_PAYMENT: 'warning',
  CONFIRMED: 'success',
  ATTENDED: 'neutral',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
  EXPIRED: 'neutral',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useTranslation('booking');
  return <Badge label={t(`status.${status}`)} tone={STATUS_TONE[status]} />;
}

/** The price exactly as the API computed it: lines and total. Nothing is added up here. */
export function PriceBreakdown({ price }: { price: Booking['price'] }) {
  const { t } = useTranslation('booking');
  return (
    <Card>
      <Text variant="subtitle">{t('detail.price')}</Text>
      {price.lines.map((line, index) => (
        <View key={`${line.type}-${index}`} style={styles.priceRow}>
          <Text color="textSecondary" style={styles.flex}>
            {line.description}
          </Text>
          <Text>{formatMoney(line.amount)}</Text>
        </View>
      ))}
      <View style={styles.priceRow}>
        <Text variant="bodyStrong" style={styles.flex}>
          {t('detail.total')}
        </Text>
        <Text variant="bodyStrong" testID="booking-total">
          {formatMoney(price.total)}
        </Text>
      </View>
    </Card>
  );
}

/** One booking in "Mis reservas", with its time in the barbershop's zone. */
export function BookingCard({ booking, onPress }: { booking: Booking; onPress: (id: string) => void }) {
  const theme = useTheme();
  const { t } = useTranslation('booking');
  const timeZone = useBookingTimeZone(booking.barbershop.id);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(booking.id)}
      testID={`booking-${booking.id}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.colors.primarySoft : theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text variant="bodyStrong" style={styles.flex}>
          {booking.service.name ?? ''}
        </Text>
        <StatusBadge status={booking.status} />
      </View>
      {booking.barbershop.name ? <Text color="textSecondary">{booking.barbershop.name}</Text> : null}
      {timeZone ? (
        <Text>
          {formatShortDate(booking.startAt, timeZone)} · {formatTime(booking.startAt, timeZone)}
        </Text>
      ) : null}
      {booking.barber.name ? (
        <Text variant="caption" color="textSecondary">
          {t('detail.barber', { barber: booking.barber.name })}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * Development only: the booking id, to confirm the payment with `dev:pay` from the backend.
 * `__DEV__` is false in release bundles, so this branch is removed there.
 */
export const showDevBookingId = __DEV__ && env.isDevelopment;

export function DevBookingId({ bookingId }: { bookingId: string }) {
  const { t } = useTranslation('dev');
  if (!showDevBookingId) return null;
  return (
    <Card testID="dev-booking-id">
      <Text variant="label" color="warning">
        {t('booking.title')}
      </Text>
      <Text selectable variant="caption">
        {bookingId}
      </Text>
      <Text variant="caption" color="textSecondary">
        {t('booking.hint')}
      </Text>
      <Button
        label={t('booking.share')}
        variant="secondary"
        onPress={() => void Share.share({ message: bookingId })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  priceRow: { flexDirection: 'row', gap: spacing.md },
  card: { gap: spacing.xs, padding: spacing.md, borderWidth: sizes.borderWidth },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
