import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatDistance, formatMoney } from '@/shared/lib';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Badge, Icon, Monogram, RatingLabel, Text } from '@/shared/ui';
import type { SearchResult } from '../api/searchApi';

/** One search result. Shows only what the API returns: missing values are hidden, never computed. */
export function ResultCard({ item, onPress }: { item: SearchResult; onPress: (id: string) => void }) {
  const theme = useTheme();
  const { t } = useTranslation('search');
  const openState =
    item.status === 'TEMPORARILY_CLOSED'
      ? { label: t('card.temporarilyClosed'), tone: 'warning' as const }
      : item.isOpenNow
        ? { label: t('card.openNow'), tone: 'success' as const }
        : { label: t('card.closed'), tone: 'neutral' as const };
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(item.id)}
      testID={`result-${item.id}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.colors.primarySoft : theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Monogram name={item.name} size={sizes.avatar} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="bodyStrong" style={styles.flex}>
            {item.name}
          </Text>
          {item.isFavorite ? (
            <View accessible accessibilityLabel={t('card.favorite')}>
              <Icon name="heart" color={theme.colors.danger} />
            </View>
          ) : null}
        </View>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {item.address}
        </Text>
        <View style={styles.row}>
          <RatingLabel average={item.rating.average} count={item.rating.count} variant="caption" />
          {item.distanceMeters !== null ? (
            <Text variant="caption" color="textSecondary">
              {t('card.distance', { distance: formatDistance(item.distanceMeters) })}
            </Text>
          ) : null}
          {item.priceFrom ? (
            <Text variant="caption" color="textSecondary">
              {t('card.priceFrom', { price: formatMoney(item.priceFrom) })}
            </Text>
          ) : null}
        </View>
        <View style={styles.row}>
          <Badge label={openState.label} tone={openState.tone} />
          {item.availableNow ? <Badge label={t('card.availableNow')} tone="success" /> : null}
          {item.type === 'INDEPENDENT' ? <Badge label={t('card.independent')} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderWidth: sizes.borderWidth },
  body: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
});
