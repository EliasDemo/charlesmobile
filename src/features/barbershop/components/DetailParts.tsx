import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatMinutes, formatMoney, formatShortDate } from '@/shared/lib';
import { sizes, spacing, useTheme } from '@/shared/theme';
import {
  Badge,
  Card,
  Icon,
  IconTile,
  Monogram,
  QueryView,
  RatingLabel,
  StatusPill,
  Text,
  categoryIcon,
  type QueryLike,
} from '@/shared/ui';
import type { Barber, BusinessHours, Review, Service } from '../api/barbershopApi';

/** A section of the detail that loads and fails on its own, so one error never hides the rest. */
export function Section<T>({
  title,
  query,
  isEmpty,
  emptyMessage,
  children,
}: {
  title: string;
  query: QueryLike<T>;
  isEmpty?: (data: T) => boolean;
  emptyMessage?: string;
  children: (data: T) => ReactNode;
}) {
  return (
    <Card>
      <Text variant="subtitle">{title}</Text>
      <QueryView query={query} isEmpty={isEmpty} empty={{ title: emptyMessage }}>
        {children}
      </QueryView>
    </Card>
  );
}

export function HoursList({ hours, today }: { hours: BusinessHours; today: number | null }) {
  const { t } = useTranslation('barbershop');
  const dayNames = t('days', { ns: 'common', returnObjects: true }) as readonly string[];
  // Monday first, as people read a week; the API uses 0 = Sunday.
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <View style={styles.list}>
      <Badge
        label={hours.isOpenNow ? t('hours.openNow') : t('hours.closedNow')}
        tone={hours.isOpenNow ? 'success' : 'neutral'}
      />
      {order.map((dayOfWeek) => {
        const day = hours.days.find((d) => d.dayOfWeek === dayOfWeek);
        const windows = day?.windows ?? [];
        const isToday = dayOfWeek === today;
        const value =
          windows.length === 0
            ? t('hours.closedDay')
            : windows.map((w) => t('hours.window', { start: w.start, end: w.end })).join(' · ');
        return (
          <View
            key={dayOfWeek}
            style={styles.hoursRow}
            accessible
            accessibilityLabel={`${dayNames[dayOfWeek]}: ${value}`}
          >
            <Text variant={isToday ? 'bodyStrong' : 'body'} style={styles.dayName}>
              {dayNames[dayOfWeek]}
              {isToday ? ` (${t('hours.today')})` : ''}
            </Text>
            <Text
              variant={isToday ? 'bodyStrong' : 'body'}
              color={windows.length ? 'textPrimary' : 'textSecondary'}
            >
              {value}
            </Text>
          </View>
        );
      })}
      <Text variant="caption" color="textMuted">
        {t('hours.timezone', { timezone: hours.timezone })}
      </Text>
    </View>
  );
}

export function ServiceRow({ service, onPress }: { service: Service; onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation('barbershop');
  const price = formatMoney(service.price);
  const duration = formatMinutes(service.durationMinutes);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('services.a11y', { name: service.name, price, duration })}
      onPress={onPress}
      style={({ pressed }) => [
        styles.serviceRow,
        {
          borderColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.primarySoft : 'transparent',
        },
      ]}
    >
      <IconTile icon={categoryIcon(service.category.key)} />
      <View style={styles.flex}>
        <Text variant="bodyStrong">{service.name}</Text>
        {service.description ? (
          <Text variant="caption" color="textSecondary">
            {service.description}
          </Text>
        ) : null}
        <Text variant="caption" color="textSecondary">
          {duration}
        </Text>
      </View>
      <Text variant="subtitle" color="primary">
        {price}
      </Text>
      <Text color="textMuted" importantForAccessibility="no">
        ›
      </Text>
    </Pressable>
  );
}

export function BarberRow({ barber, onOpenProfile }: { barber: Barber; onOpenProfile?: () => void }) {
  const { t } = useTranslation('barbershop');
  const theme = useTheme();
  const content = (
    <View style={styles.barberRow}>
      <Monogram name={barber.displayName} size={sizes.avatar} imageUrl={barber.photoUrl} />
      <View style={styles.flex}>
        <Text>{barber.displayName}</Text>
        {barber.bio ? (
          <Text variant="caption" color="textSecondary">
            {barber.bio}
          </Text>
        ) : null}
        <RatingLabel average={barber.rating.average} count={barber.rating.count} variant="caption" />
        {barber.yearsExperience ? (
          <Text variant="caption" color="textSecondary">
            {t('barbers.experience', { count: barber.yearsExperience })}
          </Text>
        ) : null}
        {barber.specialties.length > 0 ? (
          <View style={styles.specialties}>
            {barber.specialties.map((s) => (
              <StatusPill key={s.id} tone="neutral" icon="sparkles" label={s.name} />
            ))}
          </View>
        ) : null}
        {onOpenProfile ? (
          <Text variant="label" color="primary">
            {t('barbers.seeProfile')}
          </Text>
        ) : null}
      </View>
      {onOpenProfile ? (
        <Icon name="chevron-forward" size={sizes.icon} color={theme.colors.textMuted} />
      ) : null}
    </View>
  );
  if (!onOpenProfile) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('barbers.openProfile', { name: barber.displayName })}
      onPress={onOpenProfile}
      testID={`barber-profile-${barber.id}`}
    >
      {content}
    </Pressable>
  );
}

export function ReviewItem({
  review,
  timeZone,
  footer,
}: {
  review: Review;
  timeZone: string;
  /** Quiet action under the review (reporting it). */
  footer?: React.ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation('barbershop');
  return (
    <View style={[styles.review, { borderColor: theme.colors.border }]}>
      <View style={styles.reviewHeader}>
        <Text variant="bodyStrong">{review.authorName}</Text>
        <Text
          variant="label"
          color="warning"
          accessibilityLabel={t('reviews.stars', { count: review.rating })}
        >
          {'★'.repeat(review.rating)}
        </Text>
      </View>
      <Text variant="caption" color="textSecondary">
        {t('reviews.service', { service: review.serviceName, barber: review.barber.displayName })} ·{' '}
        {formatShortDate(review.createdAt, timeZone)}
        {review.editedAt ? ` · ${t('reviews.edited')}` : ''}
      </Text>
      {review.comment ? <Text>{review.comment}</Text> : null}
      {review.response ? (
        <View
          style={[
            styles.response,
            { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
          ]}
        >
          <Text variant="label" color="primary">
            {t('reviews.response')}
          </Text>
          <Text>{review.response.text}</Text>
        </View>
      ) : null}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  specialties: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  list: { gap: spacing.sm },
  flex: { flex: 1, gap: spacing.xxs },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  dayName: { textTransform: 'capitalize' },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: sizes.borderWidth,
  },
  barberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  review: { gap: spacing.xs, paddingVertical: spacing.sm, borderBottomWidth: sizes.borderWidth },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  response: { gap: spacing.xxs, padding: spacing.sm, marginTop: spacing.xs },
});
