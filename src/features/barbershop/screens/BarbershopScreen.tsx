import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FavoriteButton } from '@/features/favorites';
import { GallerySection } from '@/features/gallery';
import { useTranslation } from '@/shared/i18n';
import { callPhone, formatLongDate, isWebUrl, openDirections, openWaze, openWebUrl } from '@/shared/lib';
import { sizes, spacing, useTheme } from '@/shared/theme';
import {
  Badge,
  BrandImage,
  Button,
  Monogram,
  Notice,
  QueryView,
  RatingLabel,
  Screen,
  Text,
  categoryIcon,
  SkeletonDetail,
} from '@/shared/ui';
import type { Barbershop } from '../api/barbershopApi';
import {
  BarberCarousel,
  HoursSummary,
  QuickAction,
  ReviewItem,
  Section,
  ServiceRow,
} from '../components/DetailParts';
import { useBarbershop } from '../hooks/useBarbershop';

export interface BarbershopScreenProps {
  id: string;
  onBack: () => void;
  onOpenService: (serviceId: string) => void;
  onOpenReviews: () => void;
  onRequireLogin: () => void;
  onBook: () => void;
  onOpenGallery: () => void;
  /** "Reservar este estilo" from a gallery photo. */
  onBookStyle: (serviceId: string, barberId: string | null) => void;
  /** Quiet actions at the end (reporting the barbershop). */
  footer?: ReactNode;
  /** Sections other features add after the hours (promotions, videos, "Enviar mensaje"). */
  extraSections?: (shop: Barbershop) => ReactNode;
  /** A barber with a career profile (`profileId`) opens it. */
  onOpenBarberProfile?: (profileId: string) => void;
}

/**
 * A barbershop, in the order people decide: who they are (cover, logo, rating), how to get there,
 * when it is open, what it offers and who cuts, what others say; "Reservar" always at hand.
 */
export function BarbershopScreen({
  id,
  onBook,
  onBack,
  onOpenService,
  onOpenReviews,
  onRequireLogin,
  onOpenGallery,
  onBookStyle,
  footer,
  extraSections,
  onOpenBarberProfile,
}: BarbershopScreenProps) {
  const { t } = useTranslation('barbershop');
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const detail = useBarbershop(id);
  return (
    <View style={styles.fill}>
      <Screen>
        <QueryView
          query={detail.shop}
          skeleton={<SkeletonDetail />}
          notFound={{
            title: t('notFound.title'),
            message: t('notFound.message'),
            action: { label: t('notFound.action'), onPress: onBack },
          }}
        >
          {(shop) => (
            <View style={styles.content}>
              <View style={styles.hero}>
                {/* The real cover when there is one; otherwise a generic one labeled as illustrative. */}
                <BrandImage
                  remoteUrl={shop.coverUrl}
                  imageKeys={
                    detail.coverCategory
                      ? [`cover-${detail.coverCategory}`, 'cover-generic']
                      : ['cover-generic']
                  }
                  fallbackIcon={categoryIcon(detail.coverCategory)}
                  height={sizes.cover + spacing.xxxl}
                  illustrative
                />
                <View
                  style={[
                    styles.logo,
                    { borderColor: theme.colors.background, backgroundColor: theme.colors.background },
                  ]}
                >
                  <Monogram name={shop.name} size={sizes.avatarLarge} imageUrl={shop.logoUrl} />
                </View>
              </View>
              <Header shop={shop} onRequireLogin={onRequireLogin} onFavoriteChanged={detail.shop.refetch} />
              <QuickActions shop={shop} />
              {detail.hours.data ? (
                <HoursSummary hours={detail.hours.data} today={detail.todayDayOfWeek} />
              ) : null}
              {extraSections?.(shop)}
              <Section
                title={t('sections.services')}
                query={detail.services}
                isEmpty={(services) => services.length === 0}
                emptyMessage={t('services.empty')}
              >
                {() =>
                  detail.servicesByCategory.map((group) => (
                    <View key={group.key} style={styles.group}>
                      <Text variant="label" color="textSecondary">
                        {group.name}
                      </Text>
                      {group.services.map((service) => (
                        <ServiceRow
                          key={service.id}
                          service={service}
                          onPress={() => onOpenService(service.id)}
                        />
                      ))}
                    </View>
                  ))
                }
              </Section>
              <View style={styles.plain}>
                <Text variant="subtitle">{t('sections.barbers')}</Text>
                <QueryView
                  query={detail.barbers}
                  isEmpty={(barbers) => barbers.length === 0}
                  empty={{ title: t('barbers.empty') }}
                >
                  {(barbers) => <BarberCarousel barbers={barbers} onOpenProfile={onOpenBarberProfile} />}
                </QueryView>
              </View>
              <GallerySection barbershopId={shop.id} onOpenAll={onOpenGallery} onBookStyle={onBookStyle} />
              <Section
                title={t('sections.reviews')}
                query={detail.latestReviews}
                isEmpty={(page) => page.items.length === 0}
                emptyMessage={t('reviews.empty')}
              >
                {(page) => (
                  <>
                    <View style={styles.score}>
                      <Text variant="display" color="primary">
                        {shop.rating.average !== null ? shop.rating.average.toFixed(1) : '–'}
                      </Text>
                      <RatingLabel
                        average={shop.rating.average}
                        count={shop.rating.count}
                        variant="bodyStrong"
                      />
                    </View>
                    {page.items.map((review) => (
                      <ReviewItem key={review.id} review={review} timeZone={shop.timezone} />
                    ))}
                    <Button label={t('reviews.seeAll')} variant="secondary" onPress={onOpenReviews} />
                  </>
                )}
              </Section>
              <About shop={shop} />
            </View>
          )}
        </QueryView>
        {footer}
        {/* Room for the fixed "Reservar" bar. */}
        <View style={styles.barSpace} />
      </Screen>
      {detail.shop.data ? (
        <View
          style={[
            styles.bar,
            {
              backgroundColor: theme.colors.background,
              borderTopColor: theme.colors.border,
              paddingBottom: spacing.md + insets.bottom,
            },
          ]}
        >
          <Button label={t('book')} icon="calendar" onPress={onBook} fullWidth />
        </View>
      ) : null}
    </View>
  );
}

/** Round shortcuts under the name: how to get there, Waze and calling. */
function QuickActions({ shop }: { shop: Barbershop }) {
  const { t } = useTranslation('barbershop');
  return (
    <View style={styles.quickRow}>
      <QuickAction
        icon="navigate"
        label={t('directions')}
        onPress={() =>
          void openDirections({ latitude: shop.latitude, longitude: shop.longitude, label: shop.name })
        }
      />
      <QuickAction
        icon="car"
        label={t('waze')}
        onPress={() => void openWaze({ latitude: shop.latitude, longitude: shop.longitude })}
      />
      {shop.phone ? (
        <QuickAction icon="call" label={t('call')} onPress={() => void callPhone(shop.phone!)} />
      ) : null}
    </View>
  );
}

function Header({
  shop,
  onRequireLogin,
  onFavoriteChanged,
}: {
  shop: Barbershop;
  onRequireLogin: () => void;
  onFavoriteChanged: () => Promise<unknown>;
}) {
  const { t } = useTranslation('barbershop');
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.flex}>
          <Text variant="display" numberOfLines={3}>
            {shop.name}
          </Text>
          <Text color="textSecondary">
            {shop.type === 'INDEPENDENT' ? t('independent') : t('barbershop')}
          </Text>
        </View>
        <FavoriteButton
          barbershopId={shop.id}
          isFavorite={shop.isFavorite}
          onChanged={onFavoriteChanged}
          onRequireLogin={onRequireLogin}
        />
      </View>
      <RatingLabel average={shop.rating.average} count={shop.rating.count} />
      {shop.status === 'TEMPORARILY_CLOSED' ? (
        <Notice
          tone="warning"
          title={t('temporarilyClosed')}
          message={[
            shop.closure?.reason,
            shop.closure?.expectedReopenAt
              ? t('reopensAt', { date: formatLongDate(shop.closure.expectedReopenAt, shop.timezone) })
              : null,
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ) : null}
    </View>
  );
}

function About({ shop }: { shop: Barbershop }) {
  const { t } = useTranslation('barbershop');
  const links = (['website', 'instagram', 'facebook'] as const).filter((key) => shop.links[key]);
  return (
    <View style={styles.about}>
      <Text variant="subtitle">{t('sections.about')}</Text>
      {shop.description ? <Text>{shop.description}</Text> : null}
      <Text color="textSecondary" selectable>
        {shop.address}
      </Text>
      {links.length ? (
        <View style={styles.actions}>
          {links.map((key) => {
            const value = shop.links[key]!;
            return isWebUrl(value) ? (
              <Button
                key={key}
                label={t(`links.${key}`)}
                variant="ghost"
                onPress={() => void openWebUrl(value)}
              />
            ) : (
              <Badge key={key} label={`${t(`links.${key}`)}: ${value}`} />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const LOGO_RING = 4;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: spacing.xl },
  // The cover runs edge to edge over the screen's margin; the logo sits half on it.
  hero: { marginHorizontal: -spacing.gutter, marginTop: -spacing.lg, marginBottom: -spacing.lg },
  logo: {
    alignSelf: 'flex-start',
    marginLeft: spacing.gutter,
    marginTop: -(sizes.avatarLarge / 2 + LOGO_RING),
    borderWidth: LOGO_RING,
    borderRadius: sizes.avatarLarge,
  },
  header: { gap: spacing.xs },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-around', gap: spacing.sm },
  plain: { gap: spacing.sm },
  score: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  about: { gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.xxs, marginBottom: spacing.sm },
  barSpace: { height: spacing.xxxl * 1.5 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
