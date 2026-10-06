import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { Chip, InfiniteList, RatingLabel } from '@/shared/ui';
import { ReviewItem } from '../components/DetailParts';
import { useReviews } from '../hooks/useBarbershop';

const STAR_FILTERS = [5, 4, 3, 2, 1] as const;

export function ReviewsScreen({ barbershopId }: { barbershopId: string }) {
  const { t } = useTranslation('barbershop');
  const reviews = useReviews(barbershopId);
  const shop = reviews.shop;
  const timeZone = shop.data?.timezone;

  const header = (
    <View style={styles.header}>
      {shop.data ? (
        <RatingLabel average={shop.data.rating.average} count={shop.data.rating.count} variant="subtitle" />
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip
          label={t('reviews.allStars')}
          selected={reviews.filters.rating === null}
          onPress={() => reviews.setRating(null)}
        />
        {STAR_FILTERS.map((stars) => (
          <Chip
            key={stars}
            label={t('reviews.stars', { count: stars })}
            selected={reviews.filters.rating === stars}
            onPress={() => reviews.setRating(stars)}
          />
        ))}
      </ScrollView>
      {reviews.barbers.data && reviews.barbers.data.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip
            label={t('reviews.allBarbers')}
            selected={reviews.filters.barberId === null}
            onPress={() => reviews.setBarber(null)}
          />
          {reviews.barbers.data.map((barber) => (
            <Chip
              key={barber.id}
              label={barber.displayName}
              selected={reviews.filters.barberId === barber.id}
              onPress={() => reviews.setBarber(reviews.filters.barberId === barber.id ? null : barber.id)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <InfiniteList
      query={{
        ...reviews.query,
        items: timeZone ? reviews.query.items : undefined,
        error: reviews.query.error ?? shop.error,
      }}
      header={header}
      renderItem={({ item }) => <ReviewItem review={item} timeZone={timeZone!} />}
      keyExtractor={(item) => item.id}
      empty={{ title: reviews.hasFilters ? t('reviews.filterEmpty') : t('reviews.empty') }}
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, paddingBottom: spacing.sm },
  chips: { gap: spacing.sm },
});
