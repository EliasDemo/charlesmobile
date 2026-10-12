import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

/**
 * A photo that can be pinched to zoom (and dragged while zoomed); a double tap zooms in or back.
 * Releasing below 1× springs back to the normal size.
 */
export function ZoomableImage({
  uri,
  style,
  accessibilityLabel,
}: {
  uri: string;
  style: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withSpring(1);
    saved.value = 1;
    x.value = withSpring(0);
    y.value = withSpring(0);
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(0.8, saved.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value <= 1) reset();
      else saved.value = scale.value;
    });
  const pan = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      if (saved.value <= 1) return;
      x.value = savedX.value + e.translationX;
      y.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (saved.value > 1) reset();
      else {
        scale.value = withSpring(DOUBLE_TAP_SCALE);
        saved.value = DOUBLE_TAP_SCALE;
      }
    });

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <Animated.View
        style={animated}
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
      >
        <Image source={{ uri }} style={style} resizeMode="contain" />
      </Animated.View>
    </GestureDetector>
  );
}
