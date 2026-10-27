import type { ComponentType, ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { mediaUrl } from '@/shared/api';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatMoney, formatShortDate, videoPlaybackAvailable } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Badge, Button, Icon, Monogram, Text, type IconName } from '@/shared/ui';
import type { Placement, ProductLike, StoreBrand, StoreCategory, StoreDeal, StoreVideo } from '../api/adsApi';

const zone = env.defaultTimeZone;
const CARD_WIDTH = sizes.cover * 0.85;
const VIDEO_WIDTH = sizes.cover * 0.6;

export const CATEGORY_ICON: Record<StoreCategory, IconName> = {
  COSMETICS: 'water-outline',
  TOOLS: 'cut-outline',
  FURNITURE: 'bed-outline',
  SUPPLIES: 'cube-outline',
  EDUCATION: 'school-outline',
  OTHER: 'pricetags-outline',
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
export function Shelf({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.shelf}
      contentContainerStyle={styles.shelfContent}
    >
      {children}
    </ScrollView>
  );
}

/** A featured ad of the carousel (store_featured). */
export function FeaturedCard({ ad, onOpen }: { ad: Placement; onOpen: () => void }) {
  const { t } = useTranslation('ads');
  const theme = useTheme();
  const image = mediaUrl(ad.imageUrl);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t('openAd', { title: ad.title })}
      onPress={onOpen}
      disabled={!ad.actionUrl}
      style={[styles.featured, { backgroundColor: theme.colors.brand, borderRadius: theme.radius.lg }]}
    >
      {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} /> : null}
      <View style={[styles.featuredText, { backgroundColor: theme.colors.backdrop }]}>
        <Text variant="caption" color="onPrimary" numberOfLines={1}>
          {`${t('store.sponsored')} · ${ad.sponsorName}`}
        </Text>
        <Text variant="subtitle" color="onPrimary" numberOfLines={2}>
          {ad.title}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * A product: offer price big with the normal price crossed out, the discount, the coupon and until
 * when. Prices and discounts come from the backend as they are; the app never computes them.
 */
export function ProductCard({
  product,
  brand,
  onOpen,
  wide = false,
}: {
  product: ProductLike;
  brand?: { name: string; logoUrl: string | null };
  onOpen: () => void;
  wide?: boolean;
}) {
  const { t } = useTranslation('ads');
  const theme = useTheme();
  const image = mediaUrl(product.imageUrl);
  const onOffer = product.offerPriceAmount !== null;
  const money = (amount: number) => formatMoney({ amount, currency: product.currency });
  return (
    <View
      style={[
        styles.product,
        wide ? styles.wide : { width: CARD_WIDTH },
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderColor: theme.colors.border,
        },
      ]}
      testID={`product-${product.id}`}
    >
      <View style={[styles.productImage, { backgroundColor: theme.colors.surfaceMuted }]}>
        {image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Icon name="bag-handle-outline" size={sizes.iconLarge} color={theme.colors.textMuted} />
        )}
        {onOffer && product.discountPercent !== null ? (
          <View
            style={[
              styles.discount,
              { backgroundColor: theme.colors.danger, borderRadius: theme.radius.pill },
            ]}
          >
            <Text variant="label" color="onPrimary">
              {t('store.discount', { percent: product.discountPercent })}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.productBody}>
        {brand ? (
          <View style={styles.inline}>
            <Monogram name={brand.name} size={sizes.avatarSmall / 1.5} imageUrl={brand.logoUrl} />
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
              {brand.name}
            </Text>
          </View>
        ) : null}
        <Text variant="bodyStrong" numberOfLines={2}>
          {product.name}
        </Text>
        {product.priceText ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {product.priceText}
          </Text>
        ) : null}
        {onOffer ? (
          <View style={styles.prices}>
            <Text variant="subtitle" color="danger">
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
          <Text variant="subtitle">{money(product.priceAmount)}</Text>
        ) : null}
        {onOffer && product.couponCode ? (
          <View style={[styles.coupon, { borderColor: theme.colors.primary, borderRadius: theme.radius.sm }]}>
            <Icon name="ticket-outline" size={sizes.icon - spacing.xs} color={theme.colors.primary} />
            <Text variant="label" color="primary" numberOfLines={1} selectable>
              {t('store.coupon', { code: product.couponCode })}
            </Text>
          </View>
        ) : null}
        {onOffer && product.offerEndsAt ? (
          <Text variant="caption" color="textSecondary">
            {t('store.until', { date: formatShortDate(product.offerEndsAt, zone) })}
          </Text>
        ) : null}
        <View style={styles.grow} />
        <Button label={t('seeInStore')} variant="secondary" icon="open-outline" onPress={onOpen} fullWidth />
      </View>
    </View>
  );
}

/** A brand: cover, logo, category and "Con ofertas". */
export function BrandCard({ brand, onOpen }: { brand: StoreBrand; onOpen: () => void }) {
  const { t } = useTranslation('ads');
  const theme = useTheme();
  const cover = mediaUrl(brand.coverUrl);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('openSponsor', { name: brand.name })}
      onPress={onOpen}
      style={[
        styles.brand,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderColor: theme.colors.border,
        },
      ]}
      testID={`brand-${brand.id}`}
    >
      <View style={[styles.brandCover, { backgroundColor: theme.colors.brand }]}>
        {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} /> : null}
      </View>
      <View style={styles.brandBody}>
        <View
          style={[styles.brandLogo, { borderColor: theme.colors.surface, borderRadius: theme.radius.pill }]}
        >
          <Monogram name={brand.name} size={sizes.avatar} imageUrl={brand.logoUrl} />
        </View>
        <Text variant="bodyStrong" numberOfLines={1}>
          {brand.name}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {t(`store.categories.${brand.category}`)}
        </Text>
        {brand.hasOffers ? <Badge label={t('store.hasOffers')} tone="danger" /> : null}
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
      style={[styles.video, { backgroundColor: theme.colors.brand, borderRadius: theme.radius.lg }]}
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
            <Text variant="caption" color="onPrimary" numberOfLines={1}>
              {video.sponsorName}
            </Text>
          ) : null}
          {video.caption ? (
            <Text variant="label" color="onPrimary" numberOfLines={2}>
              {video.caption}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** A discount on bookings: from Charles (every barbershop) or from one barbershop (opens it). */
export function DealCard({ deal, onOpenShop }: { deal: StoreDeal; onOpenShop: (id: string) => void }) {
  const { t } = useTranslation('ads');
  const theme = useTheme();
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
      style={[styles.deal, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.lg }]}
      testID={`deal-${deal.id}`}
    >
      <View
        style={[styles.dealValue, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}
      >
        <Text variant="subtitle" color="onPrimary" align="center" numberOfLines={1}>
          {value}
        </Text>
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {deal.name}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {where}
        </Text>
        {deal.endsAt ? (
          <Text variant="caption" color="textSecondary">
            {t('store.until', { date: formatShortDate(deal.endsAt, zone) })}
          </Text>
        ) : null}
      </View>
      {shopId ? <Icon name="chevron-forward" size={sizes.icon} color={theme.colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  shelf: { flexGrow: 0, marginHorizontal: -spacing.gutter },
  shelfContent: { paddingHorizontal: spacing.gutter, gap: spacing.sm },
  featured: { width: sizes.cover * 1.4, aspectRatio: 16 / 9, overflow: 'hidden', justifyContent: 'flex-end' },
  featuredText: { padding: spacing.md, gap: spacing.xxs },
  product: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  wide: { width: '100%' },
  productImage: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  discount: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
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
  brand: { width: CARD_WIDTH * 0.8, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  brandCover: { height: sizes.avatarLarge, overflow: 'hidden' },
  brandBody: { padding: spacing.md, paddingTop: 0, gap: spacing.xxs, alignItems: 'flex-start' },
  brandLogo: { marginTop: -sizes.avatar / 2, borderWidth: sizes.borderWidth * 2, overflow: 'hidden' },
  video: { width: VIDEO_WIDTH, aspectRatio: 9 / 16, overflow: 'hidden', justifyContent: 'flex-end' },
  videoText: { padding: spacing.sm, gap: spacing.xxs },
  deal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: touchTarget,
  },
  dealValue: { minWidth: sizes.avatarLarge, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
});
