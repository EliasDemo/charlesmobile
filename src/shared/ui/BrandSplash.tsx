import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { sizes, useTheme } from '@/shared/theme';
import { useReduceMotion } from './motion';

// Same image as the native splash, so the hand-off is seamless.
const LOGO = require('../../../assets/splash-icon.png') as number;

const POP_MS = 420;
const HOLD_MS = 250;
const FADE_MS = 320;
const START_SCALE = 0.85;

/**
 * Animated continuation of the native splash: the logo pops in while the app finishes loading,
 * then the whole layer fades out over the first screen. Instant with "reduce motion".
 */
export function BrandSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(START_SCALE));
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [layerOpacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduce) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 8 }),
      Animated.timing(logoOpacity, { toValue: 1, duration: POP_MS, useNativeDriver: true }),
    ]).start();
  }, [reduce, scale, logoOpacity]);

  useEffect(() => {
    if (!ready) return;
    if (reduce) return onDone();
    Animated.timing(layerOpacity, {
      toValue: 0,
      duration: FADE_MS,
      delay: HOLD_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(onDone);
  }, [ready, reduce, layerOpacity, onDone]);

  return (
    <Animated.View
      pointerEvents={ready ? 'none' : 'auto'}
      style={[
        StyleSheet.absoluteFill,
        styles.center,
        { backgroundColor: theme.colors.brand, opacity: layerOpacity },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="brand-splash"
    >
      <Animated.Image
        source={LOGO}
        style={{
          width: SPLASH_LOGO,
          height: SPLASH_LOGO,
          opacity: reduce ? 1 : logoOpacity,
          transform: [{ scale: reduce ? 1 : scale }],
        }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

/** Same width as the native splash image (app.config.ts, expo-splash-screen imageWidth). */
const SPLASH_LOGO = sizes.splashLogo;

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
