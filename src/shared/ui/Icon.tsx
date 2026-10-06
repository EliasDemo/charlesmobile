import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { sizes } from '@/shared/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Decorative icon (hidden from screen readers: the text next to it carries the meaning). */
export function Icon({
  name,
  color,
  size = sizes.icon,
}: {
  name: IconName;
  color: ColorValue;
  size?: number;
}) {
  return (
    <Ionicons
      name={name}
      color={color}
      size={size}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
