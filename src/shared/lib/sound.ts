import { requireOptionalNativeModule } from 'expo';
import { useAppSettings } from './appSettings';

export type SoundKind = 'success' | 'message' | 'error' | 'notify' | 'tap';

const ASSETS: Record<SoundKind, number> = {
  success: require('../../../assets/sounds/success.wav'),
  message: require('../../../assets/sounds/message.wav'),
  error: require('../../../assets/sounds/error.wav'),
  notify: require('../../../assets/sounds/notify.wav'),
  tap: require('../../../assets/sounds/tap.wav'),
};

/** Sounds need expo-audio, which arrives with the next build. */
export const soundsAvailable = () => Boolean(requireOptionalNativeModule('ExpoAudio'));

/**
 * A short, soft sound for a moment that matters (booking confirmed, message, error). Silent when
 * the person turned sounds off, or when the installed build has no audio module yet.
 */
export function playSound(kind: SoundKind): void {
  if (!useAppSettings.getState().sounds || !soundsAvailable()) return;
  try {
    // Loaded only here: the module exists only in builds that include it (rule 12).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createAudioPlayer } = require('expo-audio') as typeof import('expo-audio');
    const player = createAudioPlayer(ASSETS[kind]);
    player.play();
    setTimeout(() => player.remove(), 3000);
  } catch {
    // A sound never breaks the app.
  }
}
