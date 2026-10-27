import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { Chip, Notice, QueryView, Screen, Text } from '@/shared/ui';
import type { Store, StoreAudience, StoreCategory } from '../api/adsApi';
import { BrandCard, DealCard, FeaturedCard, ProductCard, Shelf, VideoTile } from '../components/StoreParts';
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
  return (
    <Screen refreshing={store.query.isRefetching} onRefresh={() => void store.query.refetch()}>
      <View style={styles.content}>
        <Text color="textSecondary">{t(audience === 'BARBERSHOPS' ? 'store.introShop' : 'store.intro')}</Text>
        {categories.length > 0 || category ? (
          <Shelf>
            <Chip label={t('store.all')} selected={!category} onPress={() => setCategory(undefined)} />
            {categories.map((c) => (
              <Chip
                key={c.category}
                label={t(`store.categories.${c.category}`)}
                selected={category === c.category}
                onPress={() => setCategory(category === c.category ? undefined : c.category)}
              />
            ))}
          </Shelf>
        ) : null}
        <QueryView
          query={store.query}
          isEmpty={isEmpty}
          empty={{ title: t('store.emptyTitle'), message: t('store.empty'), icon: 'storefront-outline' }}
        >
          {(s) => (
            <View style={styles.content}>
              {store.featured.items.length > 0 ? (
                <Shelf>
                  {store.featured.items.map((ad) => (
                    <FeaturedCard key={ad.id} ad={ad} onOpen={() => store.featured.open(ad)} />
                  ))}
                </Shelf>
              ) : null}
              {s.deals.length > 0 ? (
                <Block title={t('store.deals')} hint={t('store.dealsHint')}>
                  {s.deals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} onOpenShop={onOpenBarbershop} />
                  ))}
                </Block>
              ) : null}
              {s.offers.length > 0 ? (
                <Block title={t('store.offers')}>
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
                </Block>
              ) : null}
              {s.videos.length > 0 ? (
                <Block title={t('store.videos')} hint={t('store.videosHint')}>
                  <Shelf>
                    {s.videos.map((v) => (
                      <VideoTile key={v.id} video={v} />
                    ))}
                  </Shelf>
                </Block>
              ) : null}
              {s.brands.length > 0 ? (
                <Block title={t('store.brands')}>
                  <Shelf>
                    {s.brands.map((b) => (
                      <BrandCard key={b.id} brand={b} onOpen={() => onOpenSponsor(b.id)} />
                    ))}
                  </Shelf>
                </Block>
              ) : null}
              {s.products.length > 0 ? (
                <Block title={t('store.products')}>
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
                </Block>
              ) : null}
              <Notice tone="info" message={t('notSold')} />
            </View>
          )}
        </QueryView>
      </View>
    </Screen>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.block}>
      <View>
        <Text variant="title">{title}</Text>
        {hint ? (
          <Text variant="caption" color="textSecondary">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  block: { gap: spacing.sm },
});
