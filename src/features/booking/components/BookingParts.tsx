import { Share, StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatMoney, formatShortDate, formatTime } from '@/shared/lib';
import { spacing, type StatusTone } from '@/shared/theme';
import {
  Button,
  Card,
  IconTile,
  InfoCard,
  StatusPill,
  Text,
  categoryIcon,
  type IconName,
  type InfoItem,
} from '@/shared/ui';
import type { Booking, BookingStatus } from '../api/bookingApi';
import { useBookingCategory } from '../hooks/useBooking';

/** Color and icon of each booking state. The icon and the label always go with the color. */
export const STATUS_STYLE: Record<BookingStatus, { tone: StatusTone; icon: IconName }> = {
  PENDING_PAYMENT: { tone: 'pending', icon: 'time' },
  CONFIRMED: { tone: 'success', icon: 'checkmark-circle' },
  ATTENDED: { tone: 'neutral', icon: 'checkmark-done' },
  EXPIRED: { tone: 'neutral', icon: 'hourglass' },
  CANCELLED: { tone: 'danger', icon: 'close-circle' },
  NO_SHOW: { tone: 'danger', icon: 'person-remove' },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useTranslation('booking');
  const { tone, icon } = STATUS_STYLE[status];
  return <StatusPill tone={tone} icon={icon} label={t(`status.${status}`)} />;
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

/** One booking in "Mis reservas": service first, then where and when, with its state. */
export function BookingCard({ booking, onPress }: { booking: Booking; onPress: (id: string) => void }) {
  const { t } = useTranslation('booking');
  const timeZone = booking.barbershop.timezone;
  const categoryKey = useBookingCategory(booking.barbershop.id, booking.service.id);
  const details: InfoItem[] = [];
  if (timeZone) {
    details.push({
      icon: 'calendar',
      text: `${formatShortDate(booking.startAt, timeZone)} · ${formatTime(booking.startAt, timeZone)}`,
    });
  }
  if (booking.barber.name)
    details.push({ icon: 'person', text: t('detail.barber', { barber: booking.barber.name }) });
  return (
    <InfoCard
      testID={`booking-${booking.id}`}
      onPress={() => onPress(booking.id)}
      leading={<IconTile icon={categoryIcon(categoryKey)} />}
      title={booking.service.name ?? ''}
      subtitle={booking.barbershop.name ?? undefined}
      details={details}
      footer={<StatusBadge status={booking.status} />}
    />
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
});
