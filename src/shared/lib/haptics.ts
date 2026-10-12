import * as Haptics from 'expo-haptics';
import { requireOptionalNativeModule } from 'expo';

export type HapticKind = 'success' | 'warning' | 'light';

/**
 * A light vibration on important confirmations. Does nothing when the installed build has no
 * haptics module yet, or when the device cannot vibrate.
 */
export function haptic(kind: HapticKind = 'light') {
  if (!requireOptionalNativeModule('ExpoHaptics')) return;
  const run =
    kind === 'light'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : Haptics.notificationAsync(
          kind === 'success'
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning,
        );
  void run.catch(() => undefined);
}
