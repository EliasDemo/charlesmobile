import { useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';
import { mediaUrl } from '@/shared/api';
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
  /** Real photo (the barbershop cover). When present it wins and is never labeled illustrative. */
  remoteUrl?: string | null;
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
  remoteUrl,
}: BrandImageProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const remote = mediaUrl(remoteUrl);
  const source = remote ? { uri: remote } : imageKeys.map((key) => brandImages[key]).find(Boolean);
  const labeled = illustrative && !remote;
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height: h } = e.nativeEvent.layout;
    setFrame((f) => (f && f.width === width && f.height === h ? f : { width, height: h }));
  };
  return (
    <View
      accessibilityElementsHidden={!labeled}
      importantForAccessibility={labeled ? 'auto' : 'no-hide-descendants'}
      style={[
        styles.frame,
        { height, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft },
      ]}
      testID="brand-image"
      onLayout={onLayout}
    >
      {source ? (
        <Image
          source={source}
          style={remote ? StyleSheet.absoluteFill : coverStyle(source, frame)}
          resizeMode={remote ? 'cover' : 'stretch'}
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
      {labeled ? (
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

/**
 * Fills the frame keeping the photo's proportions and centered (like "cover"), computed here:
 * some Android versions showed a zoomed top-left corner with resizeMode="cover".
 */
function coverStyle(source: ImageSourcePropType, frame: { width: number; height: number } | null) {
  const asset = Image.resolveAssetSource(source);
  if (!frame || !asset?.width || !asset.height) return StyleSheet.absoluteFill;
  const scale = Math.max(frame.width / asset.width, frame.height / asset.height);
  const width = asset.width * scale;
  const height = asset.height * scale;
  return {
    position: 'absolute' as const,
    width,
    height,
    left: (frame.width - width) / 2,
    top: (frame.height - height) / 2,
  };
}

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
