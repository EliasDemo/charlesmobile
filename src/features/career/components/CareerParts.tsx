import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { mediaUrl } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Badge, Card, Monogram, RatingLabel, StatusPill, Text } from '@/shared/ui';
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
  return (
    <Card>
      <View style={styles.header}>
        <Monogram name={profile.displayName} size={sizes.avatarLarge} imageUrl={profile.photoUrl} />
        <View style={styles.flex}>
          <Text variant="title">{profile.displayName}</Text>
          {profile.headline ? <Text color="textSecondary">{profile.headline}</Text> : null}
          {own ? null : <RankText rank={profile.rank} />}
        </View>
      </View>
      {profile.ratingAverage !== null ? (
        <RatingLabel average={profile.ratingAverage} count={profile.ratingCount} variant="bodyStrong" />
      ) : null}
      <View style={styles.facts}>
        <Text variant="caption" color="textSecondary">
          {t('attended', { count: profile.attendedCount })}
        </Text>
        {profile.yearsExperience !== null ? (
          <Text variant="caption" color="textSecondary">
            {t('years', { count: profile.yearsExperience })}
          </Text>
        ) : null}
        {profile.district ? (
          <Text variant="caption" color="textSecondary">
            {profile.district}
          </Text>
        ) : null}
      </View>
      {profile.availableForWork ? <Badge label={t('availableForWork')} tone="success" /> : null}
      {profile.specialties.length > 0 ? (
        <View style={styles.pills}>
          {profile.specialties.map((s) => (
            <StatusPill key={s.id} tone="neutral" icon="sparkles" label={s.name} />
          ))}
        </View>
      ) : null}
      {profile.bio ? <Text>{profile.bio}</Text> : null}
    </Card>
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
  const { width } = useWindowDimensions();
  const size = Math.floor((Math.min(width, sizes.maxContentWidth) - spacing.gutter * 2 - spacing.xs * 2) / 3);
  return (
    <View style={styles.grid}>
      {items.map((item) => {
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xxs },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  fill: { flex: 1 },
});
