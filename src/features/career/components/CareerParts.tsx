import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { mediaUrl } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Badge, Monogram, StatusPill, Text } from '@/shared/ui';
import type { BarberProfile, PortfolioItem } from '../api/careerApi';

/** Position in the ranking; before 3 reviews, a positive "Nuevo talento" (never "out of the ranking"). */
export function RankText({ rank }: { rank: number | null }) {
  const { t } = useTranslation('career');
  if (rank === null) return <Badge tone="primary" label={t('newTalent')} />;
  return (
    <Text variant="bodyStrong" color="primary">
      {t('rank', { rank })}
    </Text>
  );
}

/** Photo, name, headline and the numbers of a barber's career (their own, across barbershops). */
export function CareerHeader({
  profile,
  own = false,
}: {
  profile: BarberProfile;
  /** The barber's own profile: the progress card says the rest (no rank line here). */
  own?: boolean;
}) {
  const { t } = useTranslation('career');
  const theme = useTheme();
  return (
    <View style={styles.headerWrap}>
      <View style={[styles.hero, { backgroundColor: theme.colors.brand, borderRadius: theme.radius.xl }]}>
        <View style={[styles.ring, { borderColor: theme.colors.brandAccent }]}>
          <Monogram name={profile.displayName} size={sizes.avatarLarge} imageUrl={profile.photoUrl} />
        </View>
        <Text variant="title" color="onBrand" align="center" numberOfLines={2}>
          {profile.displayName}
        </Text>
        {profile.headline ? (
          <Text color="brandAccent" align="center" numberOfLines={2}>
            {profile.headline}
          </Text>
        ) : null}
        {own ? null : <RankText rank={profile.rank} />}
        <View style={[styles.stats, { borderTopColor: theme.colors.brandAccent }]}>
          <HeroStat
            value={profile.ratingAverage !== null ? profile.ratingAverage.toFixed(1) : '–'}
            label={t('stats.rating', { count: profile.ratingCount })}
          />
          <HeroStat
            value={String(profile.attendedCount)}
            label={t('stats.attended', { count: profile.attendedCount })}
          />
          {profile.yearsExperience !== null ? (
            <HeroStat
              value={String(profile.yearsExperience)}
              label={t('stats.years', { count: profile.yearsExperience })}
            />
          ) : null}
        </View>
      </View>
      <View style={styles.facts}>
        {profile.availableForWork ? <Badge label={t('availableForWork')} tone="success" /> : null}
        {profile.district ? <StatusPill tone="neutral" icon="location" label={profile.district} /> : null}
      </View>
      {profile.specialties.length > 0 ? (
        <View style={styles.pills}>
          {profile.specialties.map((s) => (
            <StatusPill key={s.id} tone="neutral" icon="sparkles" label={s.name} />
          ))}
        </View>
      ) : null}
      {profile.bio ? <Text>{profile.bio}</Text> : null}
    </View>
  );
}

/** A figure of the profile header: the number big, what it counts below. */
function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Text variant="title" color="onBrand" align="center">
        {value}
      </Text>
      <Text variant="caption" color="onBrand" align="center" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** Portfolio as a grid of thumbnails (3 per row). */
export function PortfolioGrid({
  items,
  onPress,
  onLongPress,
}: {
  items: PortfolioItem[];
  onPress?: (item: PortfolioItem) => void;
  onLongPress?: (item: PortfolioItem) => void;
}) {
  const { t } = useTranslation('career');
  const theme = useTheme();
  // Three per row from the grid's real width (it may sit inside a card with its own padding).
  const [width, setWidth] = useState(0);
  const size = Math.floor((width - spacing.xs * 2) / 3);
  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {size > 0 &&
        items.map((item) => {
          const uri = mediaUrl(item.thumbUrl);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="imagebutton"
              accessibilityLabel={item.caption ?? t('portfolio.cut')}
              onPress={onPress ? () => onPress(item) : undefined}
              onLongPress={onLongPress ? () => onLongPress(item) : undefined}
              style={{ width: size, height: size, borderRadius: theme.radius.md, overflow: 'hidden' }}
              testID={`portfolio-${item.id}`}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.fill} />
              ) : (
                <View style={[styles.fill, { backgroundColor: theme.colors.surface }]} />
              )}
            </Pressable>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: { gap: spacing.md },
  hero: { alignItems: 'center', gap: spacing.xs, padding: spacing.xl },
  ring: { borderWidth: 3, borderRadius: sizes.avatarLarge, padding: spacing.xxs, marginBottom: spacing.xs },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  flex: { flex: 1, gap: spacing.xxs },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  fill: { flex: 1 },
});
