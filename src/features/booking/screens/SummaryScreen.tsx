import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatLongDate, formatMinutes, formatMoney, formatTime } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  Notice,
  QueryView,
  Screen,
  Text,
  TextField,
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
      <Text variant="title">{t('summary.title')}</Text>
      <Card>
        <Row label={t('summary.barbershop')} value={shop.name} />
        <Row label={t('summary.service')} value={service.name} />
        <Row label={t('summary.barber')} value={summary.barberName ?? t('summary.firstAvailable')} />
        <Row
          label={t('summary.when')}
          value={`${formatLongDate(summary.slot!.startAt, shop.timezone)} · ${formatTime(summary.slot!.startAt, shop.timezone)}`}
        />
        <Row label={t('summary.duration')} value={formatMinutes(service.durationMinutes)} />
      </Card>
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

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant={strong ? 'bodyStrong' : 'body'}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xxs, paddingVertical: spacing.xs },
  price: { gap: spacing.sm },
});
