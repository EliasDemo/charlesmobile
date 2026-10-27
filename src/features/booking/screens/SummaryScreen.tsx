import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatLongDate, formatMinutes, formatMoney, formatTime } from '@/shared/lib';
import { sizes, spacing, useTheme } from '@/shared/theme';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  LoadingState,
  Notice,
  QueryView,
  Screen,
  Text,
  TextField,
  type IconName,
} from '@/shared/ui';
import { PriceBreakdown } from '../components/BookingParts';
import { useSummary } from '../hooks/useSummary';
import type { UseConfirmBookingOptions } from '../hooks/useConfirmBooking';

export interface SummaryScreenProps extends UseConfirmBookingOptions {
  onChangeSlot: () => void;
  onSeeBookings: () => void;
}

export function SummaryScreen({ onChangeSlot, onSeeBookings, ...confirmOptions }: SummaryScreenProps) {
  const { t } = useTranslation('booking');
  const theme = useTheme();
  const summary = useSummary(confirmOptions);

  if (!summary.complete) {
    return (
      <Screen>
        <EmptyState
          title={t('summary.incomplete')}
          action={{ label: t('summary.back'), onPress: onChangeSlot }}
        />
      </Screen>
    );
  }
  if (!summary.shop || !summary.service) return <LoadingState />;

  const { shop, service } = summary;
  return (
    <Screen>
      <Text variant="display">{t('summary.title')}</Text>
      {/* A ticket: where and when on top, the details below a torn line. */}
      <View style={[styles.ticket, { borderRadius: theme.radius.xl, backgroundColor: theme.colors.surface }]}>
        <View style={[styles.ticketTop, { backgroundColor: theme.colors.brand }]}>
          <Text variant="label" color="brandAccent" numberOfLines={2}>
            {shop.name}
          </Text>
          <Text variant="subtitle" color="onBrand">
            {`${formatLongDate(summary.slot!.startAt, shop.timezone)} · ${formatTime(summary.slot!.startAt, shop.timezone)}`}
          </Text>
        </View>
        <View style={styles.tear}>
          <View style={[styles.notch, styles.notchLeft, { backgroundColor: theme.colors.background }]} />
          <View style={[styles.dashes, { borderColor: theme.colors.border }]} />
          <View style={[styles.notch, styles.notchRight, { backgroundColor: theme.colors.background }]} />
        </View>
        <View style={styles.ticketBody}>
          <Row icon="cut" label={t('summary.service')} value={service.name} />
          <Row
            icon="person"
            label={t('summary.barber')}
            value={summary.barberName ?? t('summary.firstAvailable')}
          />
          <Row icon="time" label={t('summary.duration')} value={formatMinutes(service.durationMinutes)} />
          <Row icon="location" label={t('summary.barbershop')} value={shop.address} />
        </View>
      </View>
      <QueryView query={summary.quote.query} skeletonCount={1}>
        {(quote) => (
          <View style={styles.price}>
            {quote.discountTotal.amount > 0 ? (
              <Text variant="bodyStrong" color="success" testID="quote-change">
                {t('summary.priceChange', {
                  from: formatMoney(quote.subtotal),
                  to: formatMoney(quote.total),
                })}
              </Text>
            ) : null}
            {quote.promotion ? (
              <Notice tone="success" message={t('summary.promotion', { name: quote.promotion.name })} />
            ) : null}
            <PriceBreakdown price={quote} title={t('summary.price')} />
          </View>
        )}
      </QueryView>
      <CouponField coupon={summary.quote} disabled={summary.isSubmitting} />
      {!summary.authenticated ? <Text color="textSecondary">{t('summary.loginNote')}</Text> : null}
      {summary.error ? (
        <Notice tone="danger" message={summary.error}>
          {summary.tooManyPending ? (
            <Button label={t('summary.seeBookings')} variant="secondary" onPress={onSeeBookings} />
          ) : null}
        </Notice>
      ) : null}
      <Button
        label={t('summary.confirm')}
        onPress={summary.submit}
        loading={summary.isSubmitting}
        fullWidth
      />
      <Button
        label={t('summary.back')}
        variant="ghost"
        onPress={onChangeSlot}
        disabled={summary.isSubmitting}
      />
    </Screen>
  );
}

function CouponField({
  coupon,
  disabled,
}: {
  coupon: ReturnType<typeof useSummary>['quote'];
  disabled: boolean;
}) {
  const { t } = useTranslation('booking');
  if (coupon.applied) {
    return (
      <Notice tone="success" message={t('coupon.applied')}>
        <Button label={t('coupon.remove')} variant="ghost" onPress={coupon.remove} disabled={disabled} />
      </Notice>
    );
  }
  return (
    <Card>
      <TextField
        label={t('coupon.label')}
        value={coupon.couponInput}
        onChangeText={coupon.setCouponInput}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={20}
        error={coupon.betterPromotion ? undefined : (coupon.message ?? undefined)}
        testID="coupon-input"
      />
      {coupon.betterPromotion ? <Notice tone="info" message={coupon.message ?? ''} /> : null}
      <Button
        label={t('coupon.apply')}
        variant="secondary"
        onPress={coupon.apply}
        loading={coupon.isChecking}
        disabled={disabled || !coupon.couponInput.trim()}
      />
    </Card>
  );
}

function Row({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Icon name={icon} size={sizes.icon} color={theme.colors.primary} />
      <View style={styles.flex}>
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
        <Text variant="bodyStrong">{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  ticket: { overflow: 'hidden' },
  ticketTop: { padding: spacing.lg, gap: spacing.xs },
  ticketBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  tear: { flexDirection: 'row', alignItems: 'center', height: spacing.xl },
  dashes: { flex: 1, borderTopWidth: 2, borderStyle: 'dashed', marginHorizontal: spacing.sm },
  notch: { width: spacing.xl, height: spacing.xl, borderRadius: spacing.md },
  notchLeft: { marginLeft: -spacing.md },
  notchRight: { marginRight: -spacing.md },
  price: { gap: spacing.sm },
});
