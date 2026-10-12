import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/shared/theme';
import { useReduceMotion } from './motion';

const PIECES = 28;
const FALL_MS = 1800;
const PIECE = 10;

/** Deterministic pseudo-random per piece (same picture on every render). */
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * A short burst of confetti over the screen (booking confirmed). Decorative: hidden from screen
 * readers, does not block touches, and skipped with "reduce motion".
 */
export function Celebration({ visible }: { visible: boolean }) {
  const reduce = useReduceMotion();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const colors = useMemo(
    () => [theme.colors.primary, theme.colors.success, theme.colors.warning, theme.colors.primaryPressed],
    [theme],
  );
  if (!visible || reduce) return null;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="celebration"
    >
      {Array.from({ length: PIECES }, (_, i) => (
        <Piece key={i} index={i} width={width} height={height} color={colors[i % colors.length]!} />
      ))}
    </View>
  );
}

function Piece({
  index,
  width,
  height,
  color,
}: {
  index: number;
  width: number;
  height: number;
  color: string;
}) {
  const progress = useSharedValue(0);
  const x = rand(index, 1) * width;
  const drift = (rand(index, 2) - 0.5) * width * 0.3;
  const spin = (rand(index, 3) - 0.5) * 720;
  const delay = rand(index, 4) * 400;
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: FALL_MS, easing: Easing.out(Easing.quad) }));
  }, [progress, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * 0.9,
    transform: [
      { translateX: x + drift * progress.value },
      { translateY: -PIECE * 2 + progress.value * height * 0.85 },
      { rotate: `${spin * progress.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[styles.piece, { backgroundColor: color, borderRadius: index % 3 === 0 ? PIECE / 2 : 2 }, style]}
    />
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, left: 0, width: PIECE, height: PIECE * 1.6 },
});
