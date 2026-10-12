import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { useReduceMotion } from './motion';

const SHIMMER_MS = 1200;

/** Block with a light band sweeping across (shimmer), shaped like the content that is loading. */
export function Skeleton({
  width = '100%',
  height = spacing.lg,
}: {
  width?: DimensionValue;
  height?: number;
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const [boxWidth, setBoxWidth] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: SHIMMER_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, reduceMotion]);
  return (
    <View
      testID={reduceMotion ? 'skeleton-still' : 'skeleton'}
      onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}
      style={{
        width,
        height,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.disabledBackground,
        overflow: 'hidden',
      }}
    >
      {reduceMotion || boxWidth === 0 ? null : (
        <Animated.View
          style={[
            styles.band,
            {
              width: boxWidth / 2,
              backgroundColor: theme.colors.surface,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-boxWidth / 2, boxWidth],
                  }),
                },
              ],
            },
          ]}
        />
      )}
    </View>
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

/** Loading wrapper shared by the shaped skeletons: announced once to screen readers. */
function Loading({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <View
      style={styles.list}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('states.loading')}
      testID="loading-state"
    >
      {children}
    </View>
  );
}

/** A barbershop page while it loads: cover, title, actions and a few rows. */
export function SkeletonDetail() {
  return (
    <Loading>
      <Skeleton height={sizes.cover} />
      <Skeleton width="60%" height={spacing.xl} />
      <Skeleton width="40%" height={spacing.lg} />
      <Skeleton height={touchTarget} />
      <SkeletonCard />
      <SkeletonCard />
    </Loading>
  );
}

/** The agenda while it loads: the time rail on the left and cards on the right. */
export function SkeletonTimeline({ rows = 3 }: { rows?: number }) {
  return (
    <Loading>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.timelineRow}>
          <View style={styles.rail}>
            <Skeleton width={spacing.xxxl} height={spacing.lg} />
            <Skeleton width={spacing.xxl} height={spacing.md} />
          </View>
          <View style={styles.flex}>
            <SkeletonCard />
          </View>
        </View>
      ))}
    </Loading>
  );
}

/** A photo grid while it loads. */
export function SkeletonGrid({ count = 6, size }: { count?: number; size: number }) {
  return (
    <Loading>
      <View style={styles.grid}>
        {Array.from({ length: count }, (_, i) => (
          <Skeleton key={i} width={size} height={size} />
        ))}
      </View>
    </Loading>
  );
}

const styles = StyleSheet.create({
  timelineRow: { flexDirection: 'row', gap: spacing.md },
  rail: { gap: spacing.xs, alignItems: 'flex-end' },
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderWidth: sizes.borderWidth },
  lines: { flex: 1, gap: spacing.sm, justifyContent: 'center' },
  list: { gap: spacing.md },
  band: { position: 'absolute', top: 0, bottom: 0, opacity: 0.5 },
});
