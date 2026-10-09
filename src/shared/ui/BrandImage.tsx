import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing, useTheme } from '@/shared/theme';
import { brandImages } from './brandImages.generated';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface BrandImageProps {
  /** Keys tried in order (e.g. "cover-haircut", then "cover-generic"). */
  imageKeys: string[];
  /** Shown when none of the photos exists yet: an icon illustration with the theme tokens. */
  fallbackIcon: IconName;
  height: number;
  /** Dark veil of the theme over the photo, so text on top keeps its contrast. */
  veil?: boolean;
  /** Visible "Imagen ilustrativa" label: a generic image must never look like the real place. */
  illustrative?: boolean;
}

/**
 * Charles identity images (stock photos with documented licenses, docs/licencias-imagenes.md).
 * Never used as the real photo of a barbershop: when one has its own photo (backend phase 14),
 * that one is shown instead.
 */
export function BrandImage({
  imageKeys,
  fallbackIcon,
  height,
  veil = false,
  illustrative = false,
}: BrandImageProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const source = imageKeys.map((key) => brandImages[key]).find(Boolean);
  return (
    <View
      accessibilityElementsHidden={!illustrative}
      importantForAccessibility={illustrative ? 'auto' : 'no-hide-descendants'}
      style={[
        styles.frame,
        { height, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft },
      ]}
      testID="brand-image"
    >
      {source ? (
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.fallback}>
          <Icon name={fallbackIcon} color={theme.colors.primary} size={height * FALLBACK_ICON_RATIO} />
        </View>
      )}
      {veil && source ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.backdrop }]} />
      ) : null}
      {illustrative ? (
        <View
          style={[styles.label, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill }]}
        >
          <Text variant="caption" color="textSecondary">
            {t('illustrative')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const FALLBACK_ICON_RATIO = 0.35;

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', alignSelf: 'stretch' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
});
