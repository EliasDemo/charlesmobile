import { StyleSheet, View } from 'react-native';
import { FavoriteButton } from '@/features/favorites';
import { useTranslation } from '@/shared/i18n';
import { callPhone, formatLongDate, isWebUrl, openDirections, openWebUrl } from '@/shared/lib';
import { sizes, spacing } from '@/shared/theme';
import {
  Badge,
  BrandImage,
  Button,
  Notice,
  QueryView,
  RatingLabel,
  Screen,
  Text,
  categoryIcon,
} from '@/shared/ui';
import type { Barbershop } from '../api/barbershopApi';
import { BarberRow, HoursList, ReviewItem, Section, ServiceRow } from '../components/DetailParts';
import { useBarbershop } from '../hooks/useBarbershop';

export interface BarbershopScreenProps {
  id: string;
  onBack: () => void;
  onOpenService: (serviceId: string) => void;
  onOpenReviews: () => void;
  onRequireLogin: () => void;
  onBook: () => void;
}

export function BarbershopScreen({
  id,
  onBook,
  onBack,
  onOpenService,
  onOpenReviews,
  onRequireLogin,
}: BarbershopScreenProps) {
  const { t } = useTranslation('barbershop');
  const detail = useBarbershop(id);
  return (
    <Screen>
      <QueryView
        query={detail.shop}
        notFound={{
          title: t('notFound.title'),
          message: t('notFound.message'),
          action: { label: t('notFound.action'), onPress: onBack },
        }}
      >
        {(shop) => (
          <View style={styles.content}>
            {/* Generic cover by its main category, labeled as illustrative: not the real place. */}
            <BrandImage
              imageKeys={
                detail.coverCategory ? [`cover-${detail.coverCategory}`, 'cover-generic'] : ['cover-generic']
              }
              fallbackIcon={categoryIcon(detail.coverCategory)}
              height={sizes.cover}
              illustrative
            />
            <Header shop={shop} onRequireLogin={onRequireLogin} onFavoriteChanged={detail.shop.refetch} />
            <Button label={t('book')} onPress={onBook} fullWidth />
            <About shop={shop} />
            <Section title={t('sections.hours')} query={detail.hours}>
              {(hours) => <HoursList hours={hours} today={detail.todayDayOfWeek} />}
            </Section>
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
            <Section
              title={t('sections.barbers')}
              query={detail.barbers}
              isEmpty={(barbers) => barbers.length === 0}
              emptyMessage={t('barbers.empty')}
            >
              {(barbers) => barbers.map((barber) => <BarberRow key={barber.id} barber={barber} />)}
            </Section>
            <Section
              title={t('sections.reviews')}
              query={detail.latestReviews}
              isEmpty={(page) => page.items.length === 0}
              emptyMessage={t('reviews.empty')}
            >
              {(page) => (
                <>
                  <RatingLabel average={shop.rating.average} count={shop.rating.count} variant="bodyStrong" />
                  {page.items.map((review) => (
                    <ReviewItem key={review.id} review={review} timeZone={shop.timezone} />
                  ))}
                  <Button label={t('reviews.seeAll')} variant="secondary" onPress={onOpenReviews} />
                </>
              )}
            </Section>
          </View>
        )}
      </QueryView>
    </Screen>
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
          <Text variant="title">{shop.name}</Text>
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
      <View style={styles.actions}>
        <Button
          label={t('directions')}
          variant="secondary"
          onPress={() =>
            void openDirections({ latitude: shop.latitude, longitude: shop.longitude, label: shop.name })
          }
        />
        {shop.phone ? (
          <Button label={t('call')} variant="secondary" onPress={() => void callPhone(shop.phone!)} />
        ) : null}
      </View>
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

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  header: { gap: spacing.xs },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1 },
  about: { gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.xxs, marginBottom: spacing.sm },
});
