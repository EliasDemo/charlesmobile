import { useState, type ComponentType, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { mediaUrl } from '@/shared/api';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatMoney, formatShortDate, videoPlaybackAvailable } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Badge, Button, Icon, Monogram, Text, useSurfaceStyle, type IconName } from '@/shared/ui';
import type { Placement, ProductLike, StoreBrand, StoreCategory, StoreDeal, StoreVideo } from '../api/adsApi';

const zone = env.defaultTimeZone;
const CARD_WIDTH = sizes.cover + spacing.xxxl;
const VIDEO_WIDTH = sizes.cover * 0.75;
const NOTCH = spacing.lg;
const GRID_COLUMNS = 2;

export const CATEGORY_ICON: Record<StoreCategory, IconName> = {
  COSMETICS: 'water',
  TOOLS: 'cut',
  FURNITURE: 'bed',
  SUPPLIES: 'cube',
  EDUCATION: 'school',
  OTHER: 'pricetags',
};

/** The muted player, loaded once and only when expo-video exists in the installed build. */
const MutedVideo: ComponentType<{ uri: string }> | null = videoPlaybackAvailable()
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native module (rule 12)
    (require('./NativeMutedVideo') as { default: ComponentType<{ uri: string }> }).default
  : null;

/** "Patrocinado": on everything that comes from a brand. */
export function SponsoredTag() {
  const { t } = useTranslation('ads');
  return <Badge label={t('store.sponsored')} />;
}

/** A row that slides sideways, edge to edge. */
export function Shelf({ children, snap }: { children: ReactNode; snap?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.shelf}
      contentContainerStyle={styles.shelfContent}
      decelerationRate={snap ? 'fast' : 'normal'}
      snapToInterval={snap}
    >
      {children}
    </ScrollView>
  );
}

/** Category pills with their icon; the selected one fills with copper. */
export function CategoryPills({
  options,
  value,
  onChange,
}: {
  options: { value: StoreCategory | undefined; label: string }[];
  value: StoreCategory | undefined;
  onChange: (value: StoreCategory | undefined) => void;
}) {
  const theme = useTheme();
  return (
    <Shelf>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value ?? 'all'}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={styles.pillTouch}
          >
            <View
              style={[
                styles.pill,
                {
                  borderRadius: theme.radius.pill,
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.pillIcon,
                  {
                    borderRadius: theme.radius.pill,
                    backgroundColor: selected ? theme.colors.onPrimary : theme.colors.primarySoft,
                  },
                ]}
              >
                <Icon
                  name={o.value ? CATEGORY_ICON[o.value] : 'apps'}
                  size={sizes.icon - spacing.sm}
                  color={theme.colors.primary}
                />
              </View>
              <Text variant="label" color={selected ? 'onPrimary' : 'textPrimary'}>
                {o.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </Shelf>
  );
}

/**
 * Ads in a carousel: each card a bit narrower than the screen so the next one peeks out (it reads
 * as "slide"), with page dots. Used by the store's featured space and the ad spaces in Explorar.
 */
export function FeaturedCarousel({
  ads,
  onOpen,
  label,
  onOpenSponsor,
  testID,
}: {
  ads: Placement[];
  onOpen: (ad: Placement) => void;
  /** The advertising label ("Patrocinado" by default). */
  label?: string;
  /** Tapping the brand opens its page. */
  onOpenSponsor?: (sponsorId: string) => void;
  testID?: string;
}) {
  const { t } = useTranslation('ads');
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const full = Math.min(width, sizes.maxContentWidth) - spacing.gutter * 2;
  // Alone it takes the whole width; with more, the next one peeks out.
  const cardWidth = ads.length > 1 ? full - spacing.xxxl : full;
  const [index, setIndex] = useState(0);
  if (ads.length === 0) return null;
  return (
    <View style={styles.featuredBox} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.shelf}
        contentContainerStyle={styles.shelfContent}
        snapToInterval={cardWidth + spacing.sm}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + spacing.sm)))
        }
      >
        {ads.map((ad) => {
          const image = mediaUrl(ad.imageUrl);
          return (
            <Pressable
              key={ad.id}
              accessibilityRole="link"
              accessibilityLabel={t('openAd', { title: ad.title })}
              onPress={() => onOpen(ad)}
              disabled={!ad.actionUrl}
              style={[
                styles.featured,
                { width: cardWidth, backgroundColor: theme.colors.brand, borderRadius: theme.radius.xl },
              ]}
            >
              {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} /> : null}
              <View style={[styles.featuredShade, { backgroundColor: theme.colors.backdrop }]}>
                <View style={styles.inline}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('openSponsor', { name: ad.sponsorName })}
                    onPress={onOpenSponsor ? () => onOpenSponsor(ad.sponsorId) : undefined}
                    disabled={!onOpenSponsor}
                    hitSlop={spacing.sm}
                    style={[styles.inline, styles.flex]}
                  >
                    <Monogram
                      name={ad.sponsorName}
                      size={sizes.avatarSmall / 1.5}
                      imageUrl={ad.sponsorLogoUrl}
                    />
                    <Text variant="caption" color="onBrand" numberOfLines={1} style={styles.flex}>
                      {ad.sponsorName}
                    </Text>
                  </Pressable>
                  <View
                    style={[
                      styles.sponsored,
                      { backgroundColor: theme.colors.brandAccent, borderRadius: theme.radius.pill },
                    ]}
                  >
                    <Text variant="caption" color="onPrimary">
                      {label ?? t('store.sponsored')}
                    </Text>
                  </View>
                </View>
                <Text variant="title" color="onBrand" numberOfLines={2}>
                  {ad.title}
                </Text>
                {ad.actionUrl ? (
                  <View style={styles.inline}>
                    <Text variant="label" color="brandAccent">
                      {t('store.discover')}
                    </Text>
                    <Icon
                      name="arrow-forward"
                      size={sizes.icon - spacing.xs}
                      color={theme.colors.brandAccent}
                    />
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      {ads.length > 1 ? (
        <View style={styles.dots} importantForAccessibility="no-hide-descendants">
          {ads.map((ad, i) => (
            <View
              key={ad.id}
              style={[
                styles.dot,
                {
                  borderRadius: theme.radius.pill,
                  backgroundColor: i === index ? theme.colors.primary : theme.colors.border,
                  width: i === index ? spacing.lg : spacing.sm,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * A product: offer price big in copper with the normal price crossed out, the discount ribbon,
 * the coupon and until when. Prices and discounts come from the backend as they are.
 */
export function ProductCard({
  product,
  brand,
  onOpen,
  wide = false,
  width,
}: {
  product: ProductLike;
  brand?: { name: string; logoUrl: string | null };
  onOpen: () => void;
  wide?: boolean;
  /** Fixed width (a grid cell); by default the shelf width. */
  width?: number;
}) {
  const { t } = useTranslation('ads');
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const image = mediaUrl(product.imageUrl);
  const onOffer = product.offerPriceAmount !== null;
  const money = (amount: number) => formatMoney({ amount, currency: product.currency });
  return (
    <View
      style={[styles.product, surface, wide ? styles.wide : { width: width ?? CARD_WIDTH }]}
      testID={`product-${product.id}`}
    >
      <View
        style={[
          styles.productImage,
          wide && styles.productImageWide,
          {
            backgroundColor: theme.colors.primarySoft,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
          },
        ]}
      >
        {image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Icon name="bag-handle" size={sizes.iconLarge} color={theme.colors.primary} />
        )}
        {onOffer && product.discountPercent !== null ? (
          <View
            style={[
              styles.ribbon,
              { backgroundColor: theme.colors.danger, borderBottomRightRadius: theme.radius.md },
            ]}
          >
            <Text variant="label" color="onStatus">
              {t('store.discount', { percent: product.discountPercent })}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.productBody}>
        {brand ? (
          <View style={styles.inline}>
            <Monogram name={brand.name} size={sizes.avatarSmall / 2} imageUrl={brand.logoUrl} />
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
              {brand.name}
            </Text>
          </View>
        ) : null}
        <Text variant="bodyStrong" numberOfLines={2}>
          {product.name}
        </Text>
        {product.priceText ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {product.priceText}
          </Text>
        ) : null}
        {onOffer ? (
          <View style={styles.prices}>
            <Text variant="title" color="primary">
              {money(product.offerPriceAmount!)}
            </Text>
            {product.priceAmount !== null ? (
              <Text
                variant="caption"
                color="textMuted"
                style={styles.strike}
                accessibilityLabel={t('store.normalPrice', { price: money(product.priceAmount) })}
              >
                {money(product.priceAmount)}
              </Text>
            ) : null}
          </View>
        ) : product.priceAmount !== null ? (
          <Text variant="title">{money(product.priceAmount)}</Text>
        ) : null}
        {onOffer && product.couponCode ? (
          <View
            style={[
              styles.coupon,
              {
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.primarySoft,
                borderRadius: theme.radius.sm,
              },
            ]}
          >
            <Icon name="ticket" size={sizes.icon - spacing.xs} color={theme.colors.primary} />
            <Text variant="label" color="primary" numberOfLines={1} selectable style={styles.shrink}>
              {t('store.coupon', { code: product.couponCode })}
            </Text>
          </View>
        ) : null}
        {onOffer && product.offerEndsAt ? (
          <View style={styles.inline}>
            <Icon name="time-outline" size={sizes.icon - spacing.sm} color={theme.colors.warning} />
            <Text variant="caption" color="warning">
              {t('store.until', { date: formatShortDate(product.offerEndsAt, zone) })}
            </Text>
          </View>
        ) : null}
        <View style={styles.grow} />
        <Button label={t('seeInStore')} icon="open-outline" onPress={onOpen} fullWidth />
      </View>
    </View>
  );
}

/** A brand: navy cover (or its photo), logo in a copper ring, category and "Con ofertas". */
export function BrandCard({ brand, onOpen }: { brand: StoreBrand; onOpen: () => void }) {
  const { t } = useTranslation('ads');
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const cover = mediaUrl(brand.coverUrl);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('openSponsor', { name: brand.name })}
      onPress={onOpen}
      style={[styles.brand, surface]}
      testID={`brand-${brand.id}`}
    >
      <View
        style={[
          styles.brandCover,
          {
            backgroundColor: theme.colors.brand,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
          },
        ]}
      >
        {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} /> : null}
        {brand.hasOffers ? (
          <View
            style={[
              styles.brandOffer,
              { backgroundColor: theme.colors.danger, borderRadius: theme.radius.pill },
            ]}
          >
            <Icon name="flame" size={sizes.icon - spacing.sm} color={theme.colors.onStatus} />
            <Text variant="caption" color="onStatus">
              {t('store.hasOffers')}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.brandBody}>
        <View
          style={[
            styles.brandLogo,
            { borderColor: theme.colors.brandAccent, borderRadius: theme.radius.pill },
          ]}
        >
          <Monogram name={brand.name} size={sizes.avatar} imageUrl={brand.logoUrl} />
        </View>
        <Text variant="bodyStrong" numberOfLines={1}>
          {brand.name}
        </Text>
        <View style={styles.inline}>
          <Icon
            name={CATEGORY_ICON[brand.category]}
            size={sizes.icon - spacing.sm}
            color={theme.colors.primary}
          />
          <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.shrink}>
            {t(`store.categories.${brand.category}`)}
          </Text>
        </View>
        <Text variant="caption" color="textMuted">
          {t('store.productCount', { count: brand.productCount })}
        </Text>
      </View>
    </Pressable>
  );
}

/** A short brand video: starts without sound; tapping turns it on. A poster when there is no player. */
export function VideoTile({
  video,
}: {
  video: Pick<StoreVideo, 'id' | 'status' | 'videoUrl' | 'posterUrl' | 'caption'> & { sponsorName?: string };
}) {
  const theme = useTheme();
  const uri = mediaUrl(video.videoUrl);
  const poster = mediaUrl(video.posterUrl);
  if (video.status !== 'READY' || !uri) return null;
  return (
    <View
      style={[styles.video, { backgroundColor: theme.colors.brand, borderRadius: theme.radius.xl }]}
      testID={`store-video-${video.id}`}
    >
      {MutedVideo ? (
        <MutedVideo uri={uri} />
      ) : poster ? (
        <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} />
      ) : null}
      {video.caption || video.sponsorName ? (
        <View pointerEvents="none" style={[styles.videoText, { backgroundColor: theme.colors.backdrop }]}>
          {video.sponsorName ? (
            <Text variant="caption" color="brandAccent" numberOfLines={1}>
              {video.sponsorName}
            </Text>
          ) : null}
          {video.caption ? (
            <Text variant="label" color="onBrand" numberOfLines={2}>
              {video.caption}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * A discount on bookings, drawn as a ticket: the value on a copper stub, a perforated edge, and
 * where it is valid. From one barbershop, tapping opens it.
 */
export function DealCard({ deal, onOpenShop }: { deal: StoreDeal; onOpenShop: (id: string) => void }) {
  const { t } = useTranslation('ads');
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const value =
    deal.type === 'PERCENTAGE'
      ? t('store.discount', { percent: deal.value })
      : t('store.amountOff', {
          amount: formatMoney({ amount: deal.value, currency: deal.currency ?? 'PEN' }),
        });
  const where = deal.fromCharles ? t('store.dealEverywhere') : (deal.barbershopName ?? '');
  const shopId = deal.barbershopId;
  return (
    <Pressable
      accessibilityRole={shopId ? 'button' : undefined}
      accessibilityLabel={`${value} ${deal.name} ${where}`}
      onPress={shopId ? () => onOpenShop(shopId) : undefined}
      disabled={!shopId}
      style={[styles.deal, surface]}
      testID={`deal-${deal.id}`}
    >
      <View
        style={[
          styles.dealStub,
          {
            backgroundColor: deal.fromCharles ? theme.colors.brand : theme.colors.primary,
            borderTopLeftRadius: theme.radius.lg,
            borderBottomLeftRadius: theme.radius.lg,
          },
        ]}
      >
        <Text
          variant="title"
          color={deal.fromCharles ? 'brandAccent' : 'onPrimary'}
          align="center"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        <Icon
          name={deal.fromCharles ? 'sparkles' : 'storefront'}
          size={sizes.icon - spacing.xs}
          color={deal.fromCharles ? theme.colors.brandAccent : theme.colors.onPrimary}
        />
      </View>
      {/* Perforation: two notches cut in the background color and a dashed line. */}
      <View style={styles.perforation}>
        <View style={[styles.notch, styles.notchTop, { backgroundColor: theme.colors.background }]} />
        <View style={[styles.dash, { borderColor: theme.colors.border }]} />
        <View style={[styles.notch, styles.notchBottom, { backgroundColor: theme.colors.background }]} />
      </View>
      <View style={styles.dealBody}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {deal.name}
        </Text>
        <View style={styles.inline}>
          <Icon
            name={deal.fromCharles ? 'globe-outline' : 'location-outline'}
            size={sizes.icon - spacing.sm}
            color={theme.colors.textSecondary}
          />
          <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.shrink}>
            {where}
          </Text>
        </View>
        {deal.endsAt ? (
          <Text variant="caption" color="warning">
            {t('store.until', { date: formatShortDate(deal.endsAt, zone) })}
          </Text>
        ) : null}
      </View>
      {shopId ? (
        <View style={styles.dealGo}>
          <Icon name="chevron-forward" size={sizes.icon} color={theme.colors.primary} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  grow: { flexGrow: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  shelf: { flexGrow: 0, marginHorizontal: -spacing.gutter },
  shelfContent: { paddingHorizontal: spacing.gutter, paddingVertical: spacing.xs, gap: spacing.sm },
  pillTouch: { minHeight: touchTarget, justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: sizes.borderWidth,
  },
  pillIcon: {
    width: sizes.icon + spacing.xs,
    height: sizes.icon + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBox: { gap: spacing.sm },
  featured: { aspectRatio: 16 / 9, overflow: 'hidden', justifyContent: 'flex-end' },
  featuredShade: { padding: spacing.md, gap: spacing.xs },
  sponsored: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { height: spacing.xs },
  product: { overflow: 'visible' },
  wide: { width: '100%' },
  productImage: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImageWide: { aspectRatio: 16 / 9 },
  ribbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  productBody: { padding: spacing.md, gap: spacing.xs, flexGrow: 1 },
  prices: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  strike: { textDecorationLine: 'line-through' },
  coupon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: sizes.borderWidth,
    borderStyle: 'dashed',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    maxWidth: '100%',
  },
  brand: { width: CARD_WIDTH * 0.85 },
  brandCover: {
    height: sizes.avatarLarge + spacing.lg,
    overflow: 'hidden',
    alignItems: 'flex-end',
    padding: spacing.sm,
  },
  brandOffer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  brandBody: { padding: spacing.md, paddingTop: 0, gap: spacing.xxs, alignItems: 'flex-start' },
  brandLogo: {
    marginTop: -sizes.avatar / 2,
    borderWidth: sizes.borderWidth * 2,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  video: { width: VIDEO_WIDTH, aspectRatio: 9 / 16, overflow: 'hidden', justifyContent: 'flex-end' },
  videoText: { padding: spacing.sm, gap: spacing.xxs },
  deal: { flexDirection: 'row', alignItems: 'stretch', minHeight: touchTarget * 2, width: sizes.cover * 1.8 },
  dealStub: {
    width: sizes.cover * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  perforation: { width: NOTCH / 2, alignItems: 'center' },
  notch: { position: 'absolute', width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, left: -NOTCH / 2 },
  notchTop: { top: -NOTCH / 2 },
  notchBottom: { bottom: -NOTCH / 2 },
  dash: {
    flex: 1,
    borderLeftWidth: sizes.borderWidth,
    borderStyle: 'dashed',
    marginVertical: NOTCH / 2 + spacing.xxs,
  },
  dealBody: { flex: 1, padding: spacing.md, gap: spacing.xxs, justifyContent: 'center' },
  dealGo: { justifyContent: 'center', paddingRight: spacing.sm },
});

/** Products two per row (fills the screen width; never a horizontal scroll). */
export function ProductGrid({
  products,
  onOpen,
}: {
  products: (ProductLike & { sponsorName: string; sponsorLogoUrl: string | null })[];
  onOpen: (product: ProductLike) => void;
}) {
  const { width } = useWindowDimensions();
  const inner = Math.min(width, sizes.maxContentWidth) - spacing.gutter * 2;
  const cell = (inner - spacing.sm * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  return (
    <View style={styles.grid}>
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          width={cell}
          brand={{ name: p.sponsorName, logoUrl: p.sponsorLogoUrl }}
          onOpen={() => onOpen(p)}
        />
      ))}
    </View>
  );
}
