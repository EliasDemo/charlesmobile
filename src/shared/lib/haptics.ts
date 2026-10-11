import { requireOptionalNativeModule } from 'expo';

export type HapticKind = 'success' | 'warning' | 'light';

/**
 * A light vibration on important confirmations. Does nothing when the installed build has no
 * haptics module yet, or when the device cannot vibrate.
 */
export function haptic(kind: HapticKind = 'light') {
  if (!requireOptionalNativeModule('ExpoHaptics')) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Haptics = require('expo-haptics') as typeof import('expo-haptics');
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
