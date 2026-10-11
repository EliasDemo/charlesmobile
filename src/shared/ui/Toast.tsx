import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { sizes, spacing, useTheme, type StatusTone } from '@/shared/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type ToastTone = Extract<StatusTone, 'success' | 'danger'>;

interface ToastState {
  toast: { id: number; message: string; tone: ToastTone } | null;
  show: (message: string, tone?: ToastTone) => void;
  hide: () => void;
}

const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (message, tone = 'success') => set({ toast: { id: Date.now(), message, tone } }),
  hide: () => set({ toast: null }),
}));

/** Short confirmation at the bottom ("Guardado", "Cita marcada como atendida"); goes away alone. */
export const showToast = (message: string, tone?: ToastTone) => useToastStore.getState().show(message, tone);

const VISIBLE_MS = 3000;
const ICON: Record<ToastTone, IconName> = { success: 'checkmark-circle', danger: 'alert-circle' };

/** Rendered once at the root of the app. Announced to screen readers. */
export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToastStore((s) => s.toast);
  const hide = useToastStore((s) => s.hide);
  useEffect(() => {
    if (!toast) return;
    AccessibilityInfo.announceForAccessibility(toast.message);
    const timer = setTimeout(hide, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast, hide]);
  if (!toast) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { bottom: insets.bottom + spacing.xxxl + spacing.xl }]}
      accessibilityLiveRegion="polite"
      testID="toast"
    >
      <View
        style={[styles.toast, { backgroundColor: theme.colors.textPrimary, borderRadius: theme.radius.pill }]}
      >
        <Icon name={ICON[toast.tone]} size={sizes.icon} color={theme.colors.background} />
        <Text variant="label" style={{ color: theme.colors.background }}>
          {toast.message}
        </Text>
      </View>
    </View>
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
