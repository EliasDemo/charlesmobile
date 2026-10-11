import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { create } from 'zustand';
import { sizes, useTheme } from '@/shared/theme';
import { Icon } from './Icon';
import { Text, type TextProps } from './Text';

// Every effect is built with React Native's Animated (no native module, no new build) and turns
// off when the system "reduce motion" setting is on.

const useMotionStore = create<{ reduce: boolean }>(() => ({ reduce: false }));
let listening = false;

function listenReduceMotion() {
  if (listening) return;
  listening = true;
  void AccessibilityInfo.isReduceMotionEnabled()
    .then((reduce) => useMotionStore.setState({ reduce }))
    .catch(() => undefined);
  AccessibilityInfo.addEventListener('reduceMotionChanged', (reduce) => useMotionStore.setState({ reduce }));
}

/** Reads the system setting again (the change event keeps it updated afterwards). */
export function syncReduceMotion(): Promise<void> {
  return AccessibilityInfo.isReduceMotionEnabled()
    .then((reduce) => useMotionStore.setState({ reduce }))
    .catch(() => undefined);
}

/** True when the system asks for less motion (one listener for the whole app). */
export function useReduceMotion() {
  useEffect(listenReduceMotion, []);
  return useMotionStore((s) => s.reduce);
}

const PRESSED_SCALE = 0.96;

/** Small "bounce" while pressing: spread `handlers` on the Pressable and `style` on its wrapper. */
export function usePressScale() {
  const reduce = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  return {
    style: { transform: [{ scale }] },
    handlers: reduce ? {} : { onPressIn: () => to(PRESSED_SCALE), onPressOut: () => to(1) },
  };
}

const STAGGER_MS = 45;
const MAX_STAGGERED = 8;
const APPEAR_MS = 260;
const APPEAR_OFFSET = 12;

/** Appears sliding up slightly; items of a list come in one after another (`index`). */
export function FadeIn({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) return progress.setValue(1);
    Animated.timing(progress, {
      toValue: 1,
      duration: APPEAR_MS,
      delay: Math.min(index, MAX_STAGGERED) * STAGGER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, index, reduce]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [APPEAR_OFFSET, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const COUNT_MS = 600;

/** A number that counts up to its value (day summary). Screen readers get the final value. */
export function AnimatedNumber({ value, ...textProps }: { value: number } & Omit<TextProps, 'children'>) {
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce) {
      from.current = value;
      return;
    }
    const anim = new Animated.Value(from.current);
    const id = anim.addListener(({ value: v }) => setShown(Math.round(v)));
    Animated.timing(anim, {
      toValue: value,
      duration: COUNT_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      from.current = value;
    });
    return () => anim.removeListener(id);
  }, [value, reduce]);
  return <Text {...textProps}>{String(reduce ? value : shown)}</Text>;
}

/** Check that pops in with a spring: success of a booking, a saved change, a marked attendance. */
export function SuccessCheck({ size = sizes.iconLarge }: { size?: number }) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) return scale.setValue(1);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 14, speed: 10 }).start();
  }, [scale, reduce]);
  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.statusSuccessBg,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        transform: [{ scale }],
      }}
    >
      <Icon name="checkmark" size={size * CHECK_RATIO} color={theme.colors.statusSuccessFg} />
    </Animated.View>
  );
}

const CHECK_RATIO = 0.6;

/** Short wiggle each time `trigger` grows (a new notice arrived). */
export function useWiggle(trigger: number) {
  const reduce = useReduceMotion();
  const [rotation] = useState(() => new Animated.Value(0));
  const previous = useRef(trigger);
  useEffect(() => {
    const grew = trigger > previous.current;
    previous.current = trigger;
    if (!grew || reduce) return;
    const step = (toValue: number) =>
      Animated.timing(rotation, { toValue, duration: WIGGLE_STEP_MS, useNativeDriver: true });
    Animated.sequence([step(1), step(-1), step(1), step(-1), step(0)]).start();
  }, [trigger, reduce, rotation]);
  return {
    transform: [{ rotate: rotation.interpolate({ inputRange: [-1, 1], outputRange: ['-15deg', '15deg'] }) }],
  };
}

const WIGGLE_STEP_MS = 70;

/** Small pop when it becomes active (tab icons). */
export function usePopWhen(active: boolean) {
  const reduce = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!active || reduce) return;
    scale.setValue(POP_START);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 16, speed: 14 }).start();
  }, [active, reduce, scale]);
  return { transform: [{ scale }] };
}

const POP_START = 0.75;

/** Fades the content in again whenever `key` changes (switching between client and shop mode). */
export function useFadeOnChange(key: string) {
  const reduce = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  const previous = useRef(key);
  useEffect(() => {
    if (previous.current === key) return;
    previous.current = key;
    if (reduce) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: APPEAR_MS * 1.5, useNativeDriver: true }).start();
  }, [key, reduce, opacity]);
  return { opacity };
}
