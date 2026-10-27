import { Pressable, Share, StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { daysFromToday, formatLongDate, formatMoney, formatShortDate, formatTime } from '@/shared/lib';
import { sizes, spacing, useTheme, type StatusTone } from '@/shared/theme';
import {
  Button,
  Card,
  Icon,
  IconTile,
  InfoCard,
  StatusPill,
  Text,
  categoryIcon,
  type IconName,
  type InfoItem,
} from '@/shared/ui';
import type { Booking, BookingStatus } from '../api/bookingApi';

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

interface PriceLine {
  type: Booking['price']['lines'][number]['type'];
  description: string;
  amount: Booking['price']['total'];
}

/**
 * The price exactly as the API computed it (a quote or a booking): lines and total. Nothing is
 * added up here. The discount comes positive and is shown subtracting; a zero fee is not shown.
 */
export function PriceBreakdown({
  price,
  title,
}: {
  price: { lines: PriceLine[]; total: Booking['price']['total'] };
  title?: string;
}) {
  const { t } = useTranslation('booking');
  return (
    <Card>
      <Text variant="subtitle">{title ?? t('detail.price')}</Text>
      {price.lines
        .filter((line) => !(line.type === 'FEE' && line.amount.amount === 0))
        .map((line, index) => (
          <View key={`${line.type}-${index}`} style={styles.priceRow}>
            <Text color="textSecondary" style={styles.flex}>
              {line.description}
            </Text>
            {line.type === 'DISCOUNT' ? (
              <Text color="success" testID="price-discount">
                {t('detail.discountAmount', { amount: formatMoney(line.amount) })}
              </Text>
            ) : (
              <Text>{formatMoney(line.amount)}</Text>
            )}
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
      leading={<IconTile icon={categoryIcon(booking.service.categoryKey)} />}
      title={booking.service.name ?? ''}
      subtitle={booking.barbershop.name ?? undefined}
      details={details}
      footer={<StatusBadge status={booking.status} />}
    />
  );
}

/** The next appointment, big: when (with "Hoy" / "Mañana" / "En 3 días"), what, where and with whom. */
export function NextBookingCard({ booking, onPress }: { booking: Booking; onPress: (id: string) => void }) {
  const { t } = useTranslation('booking');
  const theme = useTheme();
  const zone = booking.barbershop.timezone;
  const days = zone ? daysFromToday(booking.startAt, zone) : null;
  const when =
    days === null || days < 0
      ? null
      : days === 0
        ? t('list.today')
        : days === 1
          ? t('list.tomorrow')
          : t('list.inDays', { count: days });
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(booking.id)}
      style={({ pressed }) => [
        styles.next,
        { backgroundColor: theme.colors.brand, borderRadius: theme.radius.xl, opacity: pressed ? 0.92 : 1 },
      ]}
      testID={`booking-${booking.id}`}
    >
      <View style={styles.nextTop}>
        <Text variant="label" color="brandAccent" style={styles.flex}>
          {t('list.next')}
        </Text>
        {when ? (
          <View
            style={[
              styles.when,
              { backgroundColor: theme.colors.brandAccent, borderRadius: theme.radius.pill },
            ]}
          >
            <Text variant="label" color="onPrimary">
              {when}
            </Text>
          </View>
        ) : null}
      </View>
      {zone ? (
        <View>
          <Text variant="display" color="onBrand">
            {formatTime(booking.startAt, zone)}
          </Text>
          <Text color="onBrand">{formatLongDate(booking.startAt, zone)}</Text>
        </View>
      ) : null}
      <View style={[styles.nextDivider, { backgroundColor: theme.colors.brandAccent }]} />
      <View style={styles.nextRow}>
        <Icon name={'cut'} size={sizes.icon} color={theme.colors.brandAccent} />
        <Text variant="bodyStrong" color="onBrand" style={styles.flex} numberOfLines={1}>
          {booking.service.name ?? ''}
        </Text>
      </View>
      {booking.barbershop.name ? (
        <View style={styles.nextRow}>
          <Icon name="storefront" size={sizes.icon} color={theme.colors.brandAccent} />
          <Text color="onBrand" style={styles.flex} numberOfLines={1}>
            {booking.barbershop.name}
          </Text>
        </View>
      ) : null}
      {booking.barber.name ? (
        <View style={styles.nextRow}>
          <Icon name="person" size={sizes.icon} color={theme.colors.brandAccent} />
          <Text color="onBrand" style={styles.flex} numberOfLines={1}>
            {t('detail.barber', { barber: booking.barber.name })}
          </Text>
        </View>
      ) : null}
      <StatusBadge status={booking.status} />
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
  next: { padding: spacing.lg, gap: spacing.sm },
  nextTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  when: { paddingHorizontal: spacing.md, paddingVertical: spacing.xxs },
  nextDivider: { height: 2, width: spacing.xxl, marginVertical: spacing.xs },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
