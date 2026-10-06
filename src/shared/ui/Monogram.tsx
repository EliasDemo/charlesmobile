import { StyleSheet, View } from 'react-native';
import { initials } from '@/shared/lib';
import { sizes, useTheme } from '@/shared/theme';
import { Text } from './Text';

export interface MonogramProps {
  name: string;
  /** `cover` fills its container (detail header); `avatar` is a circle (barbers, cards). */
  shape?: 'avatar' | 'cover';
  size?: number;
}

/**
 * Placeholder until the gallery exists (backend phase 14): initials on a brand-colored surface,
 * so a missing photo never looks like an empty box. Decorative: hidden from screen readers.
 */
export function Monogram({ name, shape = 'avatar', size = sizes.avatar }: MonogramProps) {
  const theme = useTheme();
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
      <Text variant={isCover ? 'hero' : size >= sizes.avatar ? 'title' : 'bodyStrong'} color="primary">
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
