import { Image, Pressable, StyleSheet, View } from 'react-native';
import { mediaUrl } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Badge, Monogram, Text } from '@/shared/ui';
import type { AdSlotKey } from '../api/adsApi';
import { useAdSlot } from '../hooks/useAds';

/**
 * A sponsor's space. Shows nothing when the space has no ads (or they could not be read), and
 * always carries the "Publicidad" label. Tapping the sponsor opens its catalog.
 */
export function AdSlot({
  slot,
  onOpenSponsor,
}: {
  slot: AdSlotKey;
  onOpenSponsor: (sponsorId: string) => void;
}) {
  const { t } = useTranslation('ads');
  const theme = useTheme();
  const ads = useAdSlot(slot);
  if (ads.items.length === 0) return null;
  return (
    <View style={styles.list} testID={`ad-slot-${slot}`}>
      {ads.items.map((ad) => {
        const image = mediaUrl(ad.imageUrl);
        return (
          <View
            key={ad.id}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t('openAd', { title: ad.title })}
              onPress={() => ads.open(ad)}
              disabled={!ad.actionUrl}
            >
              {image ? (
                <Image source={{ uri: image }} style={[styles.image, { borderRadius: theme.radius.md }]} />
              ) : null}
              <Text variant="bodyStrong">{ad.title}</Text>
            </Pressable>
            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('openSponsor', { name: ad.sponsorName })}
                onPress={() => onOpenSponsor(ad.sponsorId)}
                style={styles.sponsor}
              >
                <Monogram name={ad.sponsorName} size={sizes.avatarSmall} imageUrl={ad.sponsorLogoUrl} />
                <Text variant="caption" color="textSecondary">
                  {ad.sponsorName}
                </Text>
              </Pressable>
              <Badge label={t('label')} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  card: { padding: spacing.md, gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth },
  image: { width: '100%', aspectRatio: 16 / 9, marginBottom: spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sponsor: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: sizes.avatarSmall },
});
