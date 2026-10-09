import { StyleSheet, View } from 'react-native';
import { sizes, useTheme } from '@/shared/theme';
import { Icon, type IconName } from './Icon';

export interface IllustrationProps {
  icon: IconName;
  /** Diameter of the circle. */
  size?: number;
}

/**
 * Brand illustration made with an icon and theme tokens: used until the stock photos arrive
 * (welcome, empty states). Decorative: hidden from screen readers.
 */
export function Illustration({ icon, size = sizes.illustration }: IllustrationProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.primarySoft,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Icon name={icon} color={theme.colors.primary} size={size * ICON_RATIO} />
    </View>
  );
}

const ICON_RATIO = 0.45;

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'center',
  },
});
