import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PendingReviewPrompt } from '@/features/reviews';
import { useTranslation } from '@/shared/i18n';
import { spacing, useTheme } from '@/shared/theme';
import { InfiniteList, SegmentedControl, Text } from '@/shared/ui';
import type { BookingScope } from '../api/bookingApi';
import { BookingCard } from '../components/BookingParts';
import { useMyBookings } from '../hooks/useBooking';

export function MyBookingsScreen({
  onOpenBooking,
  onExplore,
  onReview,
}: {
  onOpenBooking: (id: string) => void;
  onExplore: () => void;
  /** Review a booking waiting for it ("¿Cómo te fue?"). */
  onReview: (bookingId: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('booking');
  const [scope, setScope] = useState<BookingScope>('upcoming');
  const query = useMyBookings(scope);

  const header = (
    <View style={styles.header}>
      <Text variant="title">{t('nav.bookings', { ns: 'common' })}</Text>
      <PendingReviewPrompt onReview={onReview} />
      <SegmentedControl
        label={t('nav.bookings', { ns: 'common' })}
        hideLabel
        value={scope}
        onChange={setScope}
        options={[
          { value: 'upcoming', label: t('list.upcoming') },
          { value: 'history', label: t('list.history') },
        ]}
      />
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <InfiniteList
        query={query}
        header={header}
        renderItem={({ item }) => <BookingCard booking={item} onPress={onOpenBooking} />}
        keyExtractor={(item) => item.id}
        empty={
          scope === 'upcoming'
            ? {
                title: t('list.emptyUpcoming.title'),
                message: t('list.emptyUpcoming.message'),
                icon: 'calendar-outline',
                action: { label: t('list.explore'), onPress: onExplore },
              }
            : { title: t('list.emptyHistory.title'), icon: 'time-outline' }
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { gap: spacing.md, paddingBottom: spacing.xs },
});
