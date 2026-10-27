import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { BrandHero, Notice, QueryView, Screen, SectionHeading } from '@/shared/ui';
import type { Store, StoreAudience, StoreCategory } from '../api/adsApi';
import {
  BrandCard,
  CategoryPills,
  DealCard,
  FeaturedCarousel,
  ProductCard,
  Shelf,
  VideoTile,
} from '../components/StoreParts';
import { useStore } from '../hooks/useAds';

const isEmpty = (s: Store) =>
  s.featured.length +
    s.offers.length +
    s.products.length +
    s.brands.length +
    s.videos.length +
    s.deals.length ===
  0;

/**
 * "Tienda": the window of the brands that advertise in Charles, plus the discounts on bookings.
 * Everything from a brand is labeled "Patrocinado". For barbershops (`BARBERSHOPS`) it shows
 * machines, supplies, furniture and courses, and no booking deals.
 */
export function StoreScreen({
  audience,
  onOpenSponsor,
  onOpenBarbershop,
}: {
  audience: StoreAudience;
  onOpenSponsor: (id: string) => void;
  onOpenBarbershop: (id: string) => void;
}) {
  const { t } = useTranslation('ads');
  const [category, setCategory] = useState<StoreCategory | undefined>(undefined);
  const store = useStore(audience, category);
  const categories = store.query.data?.categories ?? [];
  const forShop = audience === 'BARBERSHOPS';
  return (
    <Screen refreshing={store.query.isRefetching} onRefresh={() => void store.query.refetch()}>
      <View style={styles.content}>
        <BrandHero
          eyebrow={t('store.eyebrow')}
          title={t(forShop ? 'store.heroShop' : 'store.hero')}
          subtitle={t(forShop ? 'store.introShop' : 'store.intro')}
          icon={forShop ? 'construct' : 'bag-handle'}
        />
        {categories.length > 0 || category ? (
          <CategoryPills
            value={category}
            onChange={(value) => setCategory(value === category ? undefined : value)}
            options={[
              { value: undefined, label: t('store.all') },
              ...categories.map((c) => ({ value: c.category, label: t(`store.categories.${c.category}`) })),
            ]}
          />
        ) : null}
        <QueryView
          query={store.query}
          isEmpty={isEmpty}
          empty={{ title: t('store.emptyTitle'), message: t('store.empty'), icon: 'storefront-outline' }}
        >
          {(s) => (
            <View style={styles.content}>
              <FeaturedCarousel ads={store.featured.items} onOpen={store.featured.open} />
              {s.deals.length > 0 ? (
                <View style={styles.block}>
                  <SectionHeading icon="pricetag" title={t('store.deals')} hint={t('store.dealsHint')} />
                  {s.deals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} onOpenShop={onOpenBarbershop} />
                  ))}
                </View>
              ) : null}
              {s.offers.length > 0 ? (
                <View style={styles.block}>
                  <SectionHeading icon="flame" title={t('store.offers')} hint={t('store.offersHint')} />
                  <Shelf>
                    {s.offers.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        brand={{ name: p.sponsorName, logoUrl: p.sponsorLogoUrl }}
                        onOpen={() => store.openProduct(p)}
                      />
                    ))}
                  </Shelf>
                </View>
              ) : null}
              {s.videos.length > 0 ? (
                <View style={styles.block}>
                  <SectionHeading icon="play-circle" title={t('store.videos')} hint={t('store.videosHint')} />
                  <Shelf>
                    {s.videos.map((v) => (
                      <VideoTile key={v.id} video={v} />
                    ))}
                  </Shelf>
                </View>
              ) : null}
              {s.brands.length > 0 ? (
                <View style={styles.block}>
                  <SectionHeading icon="ribbon" title={t('store.brands')} hint={t('store.brandsHint')} />
                  <Shelf>
                    {s.brands.map((b) => (
                      <BrandCard key={b.id} brand={b} onOpen={() => onOpenSponsor(b.id)} />
                    ))}
                  </Shelf>
                </View>
              ) : null}
              {s.products.length > 0 ? (
                <View style={styles.block}>
                  <SectionHeading
                    icon="bag-handle"
                    title={t('store.products')}
                    hint={t('store.productsHint')}
                  />
                  <Shelf>
                    {s.products.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        brand={{ name: p.sponsorName, logoUrl: p.sponsorLogoUrl }}
                        onOpen={() => store.openProduct(p)}
                      />
                    ))}
                  </Shelf>
                </View>
              ) : null}
              <Notice tone="info" message={t('notSold')} />
            </View>
          )}
        </QueryView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  block: { gap: spacing.md },
});
