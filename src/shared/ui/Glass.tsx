import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/shared/theme';

const BLUR = 40;

/**
 * Frosted glass behind floating bars: the content shows blurred through it, with a soft tint of
 * the surface so labels keep their contrast in both themes.
 */
export function GlassBackground() {
  const theme = useTheme();
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={BLUR}
        tint={theme.scheme === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.tint, { backgroundColor: theme.colors.surface }]} />
    </View>
  );
}

/** A fade to the dark veil at the bottom of a photo, so text or labels over it stay readable. */
export function BottomFade() {
  const theme = useTheme();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['transparent', theme.colors.backdrop]}
      style={[StyleSheet.absoluteFill, styles.fade]}
    />
  );
}

const styles = StyleSheet.create({
  // Enough surface color to read the tab labels; the blur still shows the content behind.
  tint: { opacity: 0.72 },
  fade: { top: '45%' },
});
