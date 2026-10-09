import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, type DimensionValue } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';

const PULSE_MS = 800;
const PULSE_MIN_OPACITY = 0.4;

/** Respects the system "reduce motion" setting: a still placeholder instead of a pulse. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduce(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduce;
}

/** Block with a soft pulse, shaped like the content that is loading. */
export function Skeleton({
  width = '100%',
  height = spacing.lg,
}: {
  width?: DimensionValue;
  height?: number;
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: PULSE_MIN_OPACITY, duration: PULSE_MS, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: PULSE_MS, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);
  return (
    <Animated.View
      testID={reduceMotion ? 'skeleton-still' : 'skeleton'}
      style={{
        width,
        height,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.disabledBackground,
        opacity: reduceMotion ? 1 : opacity,
      }}
    />
  );
}

/** Placeholder of a card. */
export function SkeletonCard() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Skeleton width={sizes.avatar} height={sizes.avatar} />
      <View style={styles.lines}>
        <Skeleton width="70%" height={spacing.lg} />
        <Skeleton width="45%" height={spacing.md} />
        <Skeleton width="60%" height={spacing.md} />
      </View>
    </View>
  );
}

/** Loading state of a list or detail: skeleton cards, announced to screen readers. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  const { t } = useTranslation();
  return (
    <View
      style={styles.list}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('states.loading')}
      testID="loading-state"
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderWidth: sizes.borderWidth },
  lines: { flex: 1, gap: spacing.sm, justifyContent: 'center' },
  list: { gap: spacing.md },
});
