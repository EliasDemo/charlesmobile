import { StyleSheet, View } from 'react-native';
import { sizes, useTheme } from '@/shared/theme';
import { Icon, type IconName } from './Icon';

export interface IllustrationProps {
  icon: IconName;
  /** Diameter of the scene. */
  size?: number;
  /** Small barbershop elements around the main icon. */
  accents?: [IconName, IconName, IconName];
}

const DEFAULT_ACCENTS: [IconName, IconName, IconName] = ['cut', 'sparkles', 'star'];

/**
 * Brand illustration drawn with theme tokens: a navy medallion with a copper ring, the main icon,
 * and barbershop elements orbiting it (scissors, sparkle, star). Decorative: hidden from screen
 * readers. Same look in light and dark.
 */
export function Illustration({
  icon,
  size = sizes.illustration,
  accents = DEFAULT_ACCENTS,
}: IllustrationProps) {
  const theme = useTheme();
  const scene = size * SCENE_RATIO;
  const disc = size * DISC_RATIO;
  const satellite = size * SATELLITE_RATIO;
  // Where the accents sit around the medallion (fractions of the scene).
  const spots = [
    { left: 0, top: scene * 0.12 },
    { left: scene - satellite, top: scene * 0.04 },
    { left: scene - satellite * 1.1, top: scene - satellite * 1.2 },
  ];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.scene, { width: scene, height: scene }]}
    >
      <View
        style={[
          styles.ring,
          {
            width: scene * RING_RATIO,
            height: scene * RING_RATIO,
            borderRadius: scene,
            borderColor: theme.colors.accentText,
          },
        ]}
      />
      <View
        style={[
          styles.disc,
          {
            width: disc,
            height: disc,
            borderRadius: disc / 2,
            backgroundColor: theme.colors.brand,
            borderColor: theme.colors.brandAccent,
            shadowColor: theme.colors.shadow,
          },
        ]}
      >
        <Icon name={icon} color={theme.colors.onBrand} size={disc * ICON_RATIO} />
      </View>
      {accents.map((accent, i) => (
        <View
          key={`${accent}-${i}`}
          style={[
            styles.satellite,
            {
              ...spots[i],
              width: satellite,
              height: satellite,
              borderRadius: satellite / 2,
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Icon name={accent} color={theme.colors.accentText} size={satellite * ICON_RATIO} />
        </View>
      ))}
    </View>
  );
}

const SCENE_RATIO = 1.35;
const RING_RATIO = 0.92;
const DISC_RATIO = 0.82;
const SATELLITE_RATIO = 0.3;
const ICON_RATIO = 0.48;

const styles = StyleSheet.create({
  scene: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1.5, borderStyle: 'dashed' },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  satellite: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
