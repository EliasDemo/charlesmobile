import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatMinutes, formatMoney, formatShortDate } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  Badge,
  Card,
  Icon,
  IconTile,
  Monogram,
  QueryView,
  RatingLabel,
  ReviewLikeButton,
  StatusPill,
  Text,
  categoryIcon,
  type IconName,
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
        <Monogram name={review.authorName} size={sizes.avatarSmall} imageUrl={review.authorPhotoUrl} />
        <Text variant="bodyStrong" style={styles.reviewAuthor}>{`@${review.authorName}`}</Text>
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
      <ReviewLikeButton reviewId={review.id} likes={review.likes} likedByMe={review.likedByMe} />
      {footer}
    </View>
  );
}

/** Today's hours in one line; the whole week opens below. */
export function HoursSummary({ hours, today }: { hours: BusinessHours; today: number | null }) {
  const { t } = useTranslation('barbershop');
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const windows = hours.days.find((d) => d.dayOfWeek === today)?.windows ?? [];
  const todayText =
    windows.length === 0
      ? t('hours.closedDay')
      : windows.map((w) => t('hours.window', { start: w.start, end: w.end })).join(' · ');
  return (
    <View style={styles.list}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${t('hours.today')}: ${todayText}`}
        onPress={() => setOpen(!open)}
        style={styles.hoursToggle}
      >
        <Badge
          label={hours.isOpenNow ? t('hours.openNow') : t('hours.closedNow')}
          tone={hours.isOpenNow ? 'success' : 'neutral'}
        />
        <Text variant="bodyStrong" style={styles.grow} numberOfLines={1}>
          {`${t('hours.today')} · ${todayText}`}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={sizes.icon} color={theme.colors.textMuted} />
      </Pressable>
      {open ? <HoursList hours={hours} today={today} /> : null}
    </View>
  );
}

/** Barbers side by side: photo, name and rating; the card opens the career profile when there is one. */
export function BarberCarousel({
  barbers,
  onOpenProfile,
}: {
  barbers: Barber[];
  onOpenProfile?: (profileId: string) => void;
}) {
  const { t } = useTranslation('barbershop');
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
      {barbers.map((barber) => {
        const open = barber.profileId && onOpenProfile ? () => onOpenProfile(barber.profileId!) : undefined;
        return (
          <Pressable
            key={barber.id}
            accessibilityRole={open ? 'button' : undefined}
            accessibilityLabel={
              open ? t('barbers.openProfile', { name: barber.displayName }) : barber.displayName
            }
            disabled={!open}
            onPress={open}
            style={({ pressed }) => [
              styles.barberCard,
              {
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                backgroundColor: pressed ? theme.colors.primarySoft : theme.colors.surface,
              },
            ]}
            testID={open ? `barber-profile-${barber.id}` : undefined}
          >
            <Monogram name={barber.displayName} size={sizes.avatar + spacing.lg} imageUrl={barber.photoUrl} />
            <Text variant="bodyStrong" align="center" numberOfLines={1}>
              {barber.displayName}
            </Text>
            <RatingLabel average={barber.rating.average} count={barber.rating.count} variant="caption" />
            {barber.yearsExperience ? (
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
                {t('barbers.experience', { count: barber.yearsExperience })}
              </Text>
            ) : null}
            {open ? (
              <Text variant="label" color="primary">
                {t('barbers.seeProfile')}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** A round shortcut with its label below (Cómo llegar, Llamar…). */
export function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.quick}>
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.quickIcon,
              { backgroundColor: pressed ? theme.colors.primary : theme.colors.primarySoft },
            ]}
          >
            <Icon
              name={icon}
              size={sizes.icon + spacing.xs}
              color={pressed ? theme.colors.onPrimary : theme.colors.primary}
            />
          </View>
          <Text variant="caption" align="center" numberOfLines={2}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  specialties: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  grow: { flex: 1 },
  hoursToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touchTarget },
  carousel: { gap: spacing.sm, paddingVertical: spacing.xxs },
  barberCard: {
    width: 136,
    alignItems: 'center',
    gap: spacing.xxs,
    padding: spacing.md,
    borderWidth: sizes.borderWidth,
  },
  quick: { flex: 1, alignItems: 'center', gap: spacing.xs, minHeight: touchTarget },
  quickIcon: {
    width: touchTarget + spacing.xs,
    height: touchTarget + spacing.xs,
    borderRadius: (touchTarget + spacing.xs) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  reviewAuthor: { flex: 1 },
  response: { gap: spacing.xxs, padding: spacing.sm, marginTop: spacing.xs },
});
