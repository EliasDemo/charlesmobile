import { Image, StyleSheet, View } from 'react-native';
import { mediaUrl } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { openWebUrl } from '@/shared/lib';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Button, Monogram, Notice, QueryView, Screen, SectionHeading, Text } from '@/shared/ui';
import { ProductCard, Shelf, SponsoredTag, VideoTile } from '../components/StoreParts';
import { useOpenProduct, useSponsor } from '../hooks/useAds';

/** A brand's page: cover, what it does, its videos and products. Charles does not sell. */
export function SponsorScreen({ id }: { id: string }) {
  const { t } = useTranslation('ads');
  const theme = useTheme();
  const sponsor = useSponsor(id);
  const openProduct = useOpenProduct();
  return (
    <Screen>
      <QueryView query={sponsor}>
        {(s) => {
          const cover = mediaUrl(s.coverUrl);
          return (
            <View style={styles.content}>
              <View
                style={[styles.cover, { backgroundColor: theme.colors.brand, borderRadius: theme.radius.lg }]}
              >
                {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} /> : null}
              </View>
              <View style={styles.header}>
                <View
                  style={[
                    styles.logo,
                    { borderColor: theme.colors.brandAccent, borderRadius: theme.radius.pill },
                  ]}
                >
                  <Monogram name={s.name} size={sizes.avatarLarge} imageUrl={s.logoUrl} />
                </View>
                <View style={styles.flex}>
                  <Text variant="title" numberOfLines={2}>
                    {s.name}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {t(`store.categories.${s.category}`)}
                  </Text>
                </View>
                <SponsoredTag />
              </View>
              {s.description ? <Text color="textSecondary">{s.description}</Text> : null}
              {s.websiteUrl ? (
                <Button
                  label={t('store.website')}
                  variant="secondary"
                  icon="globe-outline"
                  onPress={() => void openWebUrl(s.websiteUrl!).catch(() => undefined)}
                />
              ) : null}
              {s.videos.some((v) => v.status === 'READY') ? (
                <View style={styles.block}>
                  <SectionHeading icon="play-circle" title={t('store.videos')} hint={t('store.videosHint')} />
                  <Shelf>
                    {s.videos.map((v) => (
                      <VideoTile key={v.id} video={v} />
                    ))}
                  </Shelf>
                </View>
              ) : null}
              <View style={styles.block}>
                <SectionHeading icon="bag-handle" title={t('store.products')} />
                {s.products.length === 0 ? <Text color="textSecondary">{t('noProducts')}</Text> : null}
                {s.products.map((product) => (
                  <ProductCard key={product.id} product={product} onOpen={() => openProduct(product)} wide />
                ))}
              </View>
              <Notice tone="info" message={t('notSold')} />
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  cover: { width: '100%', aspectRatio: 21 / 9, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    marginTop: -sizes.avatarLarge / 2,
  },
  logo: { borderWidth: sizes.borderWidth * 2, overflow: 'hidden', marginLeft: spacing.md },
  flex: { flex: 1, gap: spacing.xxs },
  block: { gap: spacing.sm },
});
