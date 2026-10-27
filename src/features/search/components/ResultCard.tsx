import { Image, Pressable, StyleSheet, View } from 'react-native';
import { mediaUrl } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { formatDistance, formatMoney, formatRating } from '@/shared/lib';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Icon, Monogram, StatusPill, Text, useSurfaceStyle } from '@/shared/ui';
import type { SearchResult } from '../api/searchApi';

const COVER_HEIGHT = sizes.cover * 0.85;
const LOGO = sizes.avatar;

/**
 * One search result, photo first: the cover (or a navy band with scissors), the open state and
 * the rating over it, the logo in a copper ring, then name, address, distance and price. Only what
 * the API returns: missing values are hidden.
 */
export function ResultCard({ item, onPress }: { item: SearchResult; onPress: (id: string) => void }) {
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const { t } = useTranslation('search');
  const cover = mediaUrl(item.coverThumbUrl);
  const rated = item.rating.average !== null && item.rating.count > 0;
  const openState =
    item.status === 'TEMPORARILY_CLOSED'
      ? ({ tone: 'pending', icon: 'pause-circle', label: t('card.temporarilyClosed') } as const)
      : item.isOpenNow
        ? ({ tone: 'success', icon: 'time', label: t('card.openNow') } as const)
        : ({ tone: 'neutral', icon: 'moon', label: t('card.closed') } as const);
  const label = [
    item.name,
    openState.label,
    rated
      ? `${formatRating(item.rating.average!)} (${item.rating.count})`
      : t('rating.none', { ns: 'common' }),
    item.distanceMeters !== null ? formatDistance(item.distanceMeters) : null,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [styles.card, surface, pressed && styles.pressed]}
      testID={`result-${item.id}`}
    >
      <View
        style={[
          styles.cover,
          {
            backgroundColor: theme.colors.brand,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
          },
        ]}
      >
        {cover ? (
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Icon name="cut" size={sizes.iconLarge} color={theme.colors.brandAccent} />
        )}
        <View style={styles.coverTop}>
          <StatusPill tone={openState.tone} icon={openState.icon} label={openState.label} />
          {item.isFavorite ? (
            <View
              accessible
              accessibilityLabel={t('card.favorite')}
              style={[
                styles.round,
                { backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill },
              ]}
            >
              <Icon name="heart" size={sizes.icon - spacing.xs} color={theme.colors.danger} />
            </View>
          ) : null}
        </View>
        <View
          style={[styles.rating, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill }]}
        >
          <Icon
            name={rated ? 'star' : 'star-outline'}
            size={sizes.icon - spacing.sm}
            color={theme.colors.medalGold}
          />
          <Text variant="label">{rated ? formatRating(item.rating.average!) : t('card.new')}</Text>
          {rated ? (
            <Text variant="caption" color="textSecondary">
              {`(${item.rating.count})`}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.body}>
        <View
          style={[styles.logo, { borderColor: theme.colors.brandAccent, borderRadius: theme.radius.pill }]}
        >
          <Monogram name={item.name} size={LOGO} imageUrl={item.logoUrl} />
        </View>
        <View style={styles.titleRow}>
          <Text variant="subtitle" numberOfLines={1} style={styles.flex}>
            {item.name}
          </Text>
          {item.featured ? <Icon name="ribbon" size={sizes.icon} color={theme.colors.primary} /> : null}
        </View>
        <View style={styles.inline}>
          <Icon name="location-outline" size={sizes.icon - spacing.sm} color={theme.colors.textMuted} />
          <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
            {item.address}
          </Text>
        </View>
        <View style={styles.facts}>
          {item.distanceMeters !== null ? (
            <Fact icon="navigate" text={formatDistance(item.distanceMeters)} />
          ) : null}
          {item.priceFrom ? (
            <Fact icon="pricetag" text={t('card.priceFrom', { price: formatMoney(item.priceFrom) })} />
          ) : null}
          {item.type === 'INDEPENDENT' ? <Fact icon="person" text={t('card.independent')} /> : null}
          {item.availableNow ? (
            <StatusPill tone="success" icon="flash" label={t('card.availableNow')} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function Fact({ icon, text }: { icon: 'navigate' | 'pricetag' | 'person'; text: string }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.fact, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.pill }]}
    >
      <Icon name={icon} size={sizes.icon - spacing.sm} color={theme.colors.primary} />
      <Text variant="caption" color="textPrimary" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.xs },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  cover: { height: COVER_HEIGHT, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  coverTop: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  round: { padding: spacing.xs },
  rating: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  body: { padding: spacing.md, paddingTop: 0, gap: spacing.xs },
  logo: {
    marginTop: -LOGO / 2,
    alignSelf: 'flex-start',
    borderWidth: sizes.borderWidth * 2,
    overflow: 'hidden',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
});
