import { StyleSheet, View } from 'react-native';
import { useServicesQuery } from '@/features/barbershop';
import { i18n, useTranslation } from '@/shared/i18n';
import { formatMoney, formatShortDate } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import { Badge, IconTile, InfoCard, Text, type InfoItem } from '@/shared/ui';
import type { PublicPromotion } from '../api/promotionsApi';
import { useActivePromotions } from '../hooks/usePromotions';

/** "20 %" or "S/ 5.00": the value as the API sent it (percentage, or céntimos with currency). */
export function promotionValueText(promotion: Pick<PublicPromotion, 'type' | 'value' | 'currency'>): string {
  return promotion.type === 'PERCENTAGE'
    ? i18n.t('promotions:percent', { value: promotion.value })
    : formatMoney({ amount: promotion.value, currency: promotion.currency ?? 'PEN' });
}

/** "Martes y jueves" from `daysOfWeek` (0 = domingo); empty means every day. */
export function promotionDaysText(daysOfWeek: readonly number[]): string {
  if (daysOfWeek.length === 0 || daysOfWeek.length === 7) return i18n.t('promotions:everyDay');
  const names = i18n.t('days', { returnObjects: true }) as string[];
  const list = [...daysOfWeek].sort().map((d) => names[d] ?? '');
  const capitalized = list.map((name, index) =>
    index === 0 ? name.charAt(0).toUpperCase() + name.slice(1) : name,
  );
  if (capitalized.length === 1) return capitalized[0]!;
  return i18n.t('promotions:daysList', {
    first: capitalized.slice(0, -1).join(', '),
    last: capitalized[capitalized.length - 1],
  });
}

/**
 * "Promociones" on a barbershop's profile: the automatic ones in force. Nothing is shown while
 * loading, when there are none or if they could not be read (the rest of the profile stays).
 */
export function ActivePromotions({ barbershopId, timeZone }: { barbershopId: string; timeZone: string }) {
  const { t } = useTranslation('promotions');
  const query = useActivePromotions(barbershopId);
  const services = useServicesQuery(barbershopId);
  const serviceName = (id: string) => services.data?.find((s) => s.id === id)?.name;
  const items = query.data ?? [];
  if (items.length === 0) return null;
  return (
    <View style={styles.section} testID="active-promotions">
      <Text variant="subtitle">{t('title')}</Text>
      {items.map((promotion) => {
        const details: InfoItem[] = [{ icon: 'calendar', text: promotionDaysText(promotion.daysOfWeek) }];
        const service = promotion.serviceId ? serviceName(promotion.serviceId) : undefined;
        if (service) details.push({ icon: 'cut', text: t('onlyService', { name: service }) });
        if (promotion.endsAt) {
          details.push({
            icon: 'time',
            text: t('endsAt', { date: formatShortDate(promotion.endsAt, timeZone) }),
          });
        }
        return (
          <InfoCard
            key={promotion.id}
            leading={<IconTile icon="pricetag" />}
            title={promotion.name}
            subtitle={promotionValueText(promotion)}
            details={details}
            footer={promotion.fromCharles ? <Badge label={t('fromCharles')} tone="primary" /> : undefined}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ section: { gap: spacing.sm } });
