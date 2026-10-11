import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { mediaUrl } from '@/shared/api';
import { initials } from '@/shared/lib';
import { sizes, useTheme } from '@/shared/theme';
import { Text } from './Text';

export interface MonogramProps {
  name: string;
  /** `cover` fills its container (detail header); `avatar` is a circle (barbers, cards). */
  shape?: 'avatar' | 'cover';
  size?: number;
  /** Real photo or logo (backend phase 14). Initials stay as the fallback if it is missing or fails. */
  imageUrl?: string | null;
}

/**
 * The photo when there is one; otherwise initials on a brand-colored surface, so a missing photo
 * never looks like an empty box. Decorative: hidden from screen readers.
 */
export function Monogram({ name, shape = 'avatar', size = sizes.avatar, imageUrl }: MonogramProps) {
  const theme = useTheme();
  const uri = mediaUrl(imageUrl);
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = uri !== null && failed !== uri;
  const isCover = shape === 'cover';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.border },
        isCover
          ? { height: size, alignSelf: 'stretch', borderRadius: theme.radius.lg }
          : { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailed(uri)}
          accessibilityIgnoresInvertColors
          testID="monogram-image"
        />
      ) : null}
      {showImage ? null : (
        <Text variant={isCover ? 'hero' : size >= sizes.avatar ? 'title' : 'bodyStrong'} color="primary">
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
