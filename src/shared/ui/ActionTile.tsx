import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { spacing, touchTarget, useTheme, type StatusTone } from '@/shared/theme';
import { Icon, type IconName } from './Icon';
import { IconTile } from './InfoCard';
import { usePressScale } from './motion';
import { useSurfaceStyle } from './surface';
import { Text } from './Text';

export interface ActionTileProps {
  icon: IconName;
  label: string;
  /** One short line under the label. */
  hint?: string;
  onPress: () => void;
  /** Highlights a tile that needs attention (for example, the review of a new barbershop). */
  tone?: StatusTone;
}

/** A square-ish card with an icon and a label, for grids of sections ("Mi barbería"). */
export function ActionTile({ icon, label, hint, onPress, tone }: ActionTileProps) {
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const press = usePressScale();
  return (
    <Animated.View style={[styles.cell, press.style]}>
      <Pressable
        {...press.handlers}
        accessibilityRole="button"
        accessibilityLabel={hint ? `${label}. ${hint}` : label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.tile,
          surface,
          pressed ? { backgroundColor: theme.colors.primarySoft } : null,
        ]}
      >
        <View style={styles.top}>
          <IconTile icon={icon} tone={tone} />
          <Icon
            name="chevron-forward"
            size={theme.typography.label.fontSize}
            color={theme.colors.textMuted}
          />
        </View>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {hint}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/** Two columns that wrap: tiles keep the same width and grow to the screen. */
export function TileGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { flexGrow: 1, flexBasis: '40%' },
  tile: {
    flex: 1,
    minHeight: touchTarget * 2.5,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
});
