import { Animated, Pressable, StyleSheet } from 'react-native';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { usePressScale } from './motion';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** Extra text for screen readers (e.g. "3 filtros activos"). */
  accessibilityHint?: string;
}

/** Toggleable pill for categories, filters and quick choices. */
export function Chip({ label, selected = false, onPress, accessibilityHint }: ChipProps) {
  const theme = useTheme();
  const press = usePressScale();
  return (
    <Animated.View style={press.style}>
      <Pressable
        {...press.handlers}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        style={({ pressed }) => [
          styles.chip,
          {
            borderRadius: theme.radius.pill,
            borderColor: selected ? theme.colors.primary : theme.colors.border,
            backgroundColor: selected
              ? theme.colors.primary
              : pressed
                ? theme.colors.primarySoft
                : theme.colors.surface,
          },
        ]}
      >
        <Text variant="label" color={selected ? 'onPrimary' : 'textPrimary'}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: sizes.borderWidth,
  },
});
