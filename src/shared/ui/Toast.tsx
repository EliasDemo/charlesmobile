import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { haptic, playSound } from '@/shared/lib';
import { sizes, spacing, useTheme, type StatusTone } from '@/shared/theme';
import { Icon, type IconName } from './Icon';
import { SuccessCheck, useReduceMotion } from './motion';
import { Text } from './Text';

type ToastTone = Extract<StatusTone, 'success' | 'danger'>;

interface ToastState {
  toast: { id: number; message: string; tone: ToastTone } | null;
  show: (message: string, tone?: ToastTone) => void;
  hide: () => void;
}

const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (message, tone = 'success') => {
    haptic(tone === 'success' ? 'success' : 'warning');
    playSound(tone === 'success' ? 'success' : 'error');
    set({ toast: { id: Date.now(), message, tone } });
  },
  hide: () => set({ toast: null }),
}));

/** Short confirmation at the bottom ("Guardado", "Cita marcada como atendida"); goes away alone. */
export const showToast = (message: string, tone?: ToastTone) => useToastStore.getState().show(message, tone);

const VISIBLE_MS = 3000;
const ENTER_MS = 280;
const ICON: Record<ToastTone, IconName> = { success: 'checkmark-circle', danger: 'alert-circle' };

/** Rendered once at the root of the app. Announced to screen readers. */
export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToastStore((s) => s.toast);
  const hide = useToastStore((s) => s.hide);
  const reduce = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!toast) return;
    AccessibilityInfo.announceForAccessibility(toast.message);
    if (reduce) progress.setValue(1);
    else {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }).start();
    }
    const timer = setTimeout(hide, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast, hide, reduce, progress]);
  if (!toast) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + spacing.xxxl + spacing.xl,
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [spacing.xl, 0] }) },
          ],
        },
      ]}
      accessibilityLiveRegion="polite"
      testID="toast"
    >
      <View
        style={[styles.toast, { backgroundColor: theme.colors.textPrimary, borderRadius: theme.radius.pill }]}
      >
        {toast.tone === 'success' ? (
          <SuccessCheck key={toast.id} size={sizes.icon + spacing.sm} />
        ) : (
          <Icon name={ICON[toast.tone]} size={sizes.icon} color={theme.colors.background} />
        )}
        <Text variant="label" style={{ color: theme.colors.background }}>
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.gutter, right: spacing.gutter, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: sizes.maxContentWidth,
  },
});
