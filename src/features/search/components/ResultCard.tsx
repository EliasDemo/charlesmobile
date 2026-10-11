import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatDistance, formatMoney, formatRating } from '@/shared/lib';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Badge, Icon, InfoCard, Monogram, StatusPill, type InfoItem } from '@/shared/ui';
import type { SearchResult } from '../api/searchApi';

/**
 * One search result: the name first, then rating, distance and price with small icons, and the
 * open state with its color and icon. Only what the API returns: missing values are hidden.
 */
export function ResultCard({ item, onPress }: { item: SearchResult; onPress: (id: string) => void }) {
  const theme = useTheme();
  const { t } = useTranslation('search');
  const details: InfoItem[] = [
    item.rating.average !== null && item.rating.count > 0
      ? { icon: 'star', text: `${formatRating(item.rating.average)} (${item.rating.count})` }
      : { icon: 'star-outline', text: t('rating.none', { ns: 'common' }) },
  ];
  if (item.distanceMeters !== null) {
    details.push({ icon: 'navigate', text: formatDistance(item.distanceMeters) });
  }
  if (item.priceFrom) {
    details.push({ icon: 'pricetag', text: t('card.priceFrom', { price: formatMoney(item.priceFrom) }) });
  }
  const openState =
    item.status === 'TEMPORARILY_CLOSED'
      ? ({ tone: 'pending', icon: 'pause-circle', label: t('card.temporarilyClosed') } as const)
      : item.isOpenNow
        ? ({ tone: 'success', icon: 'time', label: t('card.openNow') } as const)
        : ({ tone: 'neutral', icon: 'moon', label: t('card.closed') } as const);
  return (
    <InfoCard
      testID={`result-${item.id}`}
      onPress={() => onPress(item.id)}
      leading={<Monogram name={item.name} size={sizes.avatar} imageUrl={item.logoUrl} />}
      title={item.name}
      subtitle={item.address}
      details={details}
      trailing={
        item.isFavorite ? (
          <View accessible accessibilityLabel={t('card.favorite')}>
            <Icon name="heart" color={theme.colors.danger} />
          </View>
        ) : undefined
      }
      footer={
        <View style={styles.footer}>
          <StatusPill tone={openState.tone} icon={openState.icon} label={openState.label} />
          {item.availableNow ? (
            <StatusPill tone="success" icon="flash" label={t('card.availableNow')} />
          ) : null}
          {item.type === 'INDEPENDENT' ? <Badge label={t('card.independent')} /> : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
