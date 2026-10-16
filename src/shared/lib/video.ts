import * as picker from 'expo-image-picker';
import { requireOptionalNativeModule } from 'expo';
import { TurboModuleRegistry } from 'react-native';
import { photosAvailable } from './photos';

/** The backend rejects longer videos (TOO_LONG) and bigger files (413); docs/api/CARRERA.md §4. */
export const VIDEO_MAX_SECONDS = 30;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

/** Playing needs expo-video, which arrives with the next build. */
export const videoPlaybackAvailable = () => Boolean(requireOptionalNativeModule('ExpoVideo'));

/** Uploading also needs the picker and the compressor (react-native-compressor on Nitro). */
export const videoUploadAvailable = () =>
  photosAvailable() && TurboModuleRegistry.get('NitroModules') !== null;

export interface PickedVideo {
  uri: string;
  name: string;
  type: string;
}

export type PickVideoResult =
  | { status: 'picked'; video: PickedVideo }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'tooLong' }
  | { status: 'tooLarge' };

/**
 * Chooses or records a video of up to 30 s and compresses it before uploading. iOS lets the person
 * trim it in the picker; Android limits recording to 30 s, and a longer video from the gallery is
 * refused here (the server would refuse it too).
 */
export async function pickVideo(
  source: 'library' | 'camera',
  onCompressProgress?: (fraction: number) => void,
): Promise<PickVideoResult> {
  if (!videoUploadAvailable()) return { status: 'unavailable' };
  const permission =
    source === 'camera'
      ? await picker.requestCameraPermissionsAsync()
      : await picker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: 'denied' };

  const options: picker.ImagePickerOptions = {
    mediaTypes: ['videos'],
    allowsEditing: true,
    videoMaxDuration: VIDEO_MAX_SECONDS,
    quality: 1,
  };
  const result =
    source === 'camera'
      ? await picker.launchCameraAsync(options)
      : await picker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { status: 'cancelled' };
  // `duration` is in milliseconds; a little margin for rounding.
  if (asset.duration && asset.duration > (VIDEO_MAX_SECONDS + 0.5) * 1000) return { status: 'tooLong' };

  // Loaded only here: the module does not exist in builds without it (rule 12).
  const { Video, getFileSize } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react-native-compressor') as typeof import('react-native-compressor');
  const uri = await Video.compress(asset.uri, { compressionMethod: 'auto' }, (progress: number) =>
    onCompressProgress?.(progress),
  );
  if (Number(await getFileSize(uri)) > VIDEO_MAX_BYTES) return { status: 'tooLarge' };
  return { status: 'picked', video: { uri, name: 'video.mp4', type: 'video/mp4' } };
}

/** Multipart body with the video in `file` (React Native's FormData file shape). */
export function videoForm(video: PickedVideo, caption?: string): FormData {
  const form = new FormData();
  form.append('file', video as unknown as Blob);
  if (caption?.trim()) form.append('caption', caption.trim());
  return form;
}
