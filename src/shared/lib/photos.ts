import { requireOptionalNativeModule } from 'expo';

/**
 * Picking and preparing photos to upload. The native modules arrive with the next build: until
 * then `photosAvailable()` is false and the screens explain it, without loading anything native.
 */
export const photosAvailable = () =>
  Boolean(requireOptionalNativeModule('ExponentImagePicker')) &&
  Boolean(requireOptionalNativeModule('ExpoImageManipulator'));

export interface PickedPhoto {
  uri: string;
  name: string;
  type: string;
}

export type PhotoSource = 'library' | 'camera';

export type PickResult =
  | { status: 'picked'; photo: PickedPhoto }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'unavailable' };

/** The backend recommends ~2000 px and JPEG: it also converts HEIC from iPhone (docs/api/IMAGENES.md). */
const MAX_WIDTH = 2000;
const QUALITY = 0.85;

/**
 * Lets the user choose (or take) one photo, optionally cropped to an aspect, and returns it
 * resized to JPEG, ready for the `file` field. The API strips all metadata (GPS included).
 */
export async function pickPhoto(source: PhotoSource, aspect?: [number, number]): Promise<PickResult> {
  if (!photosAvailable()) return { status: 'unavailable' };
  // Loaded only when the native modules exist (the installed build may not have them yet).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const picker = require('expo-image-picker') as typeof import('expo-image-picker');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const manipulator = require('expo-image-manipulator') as typeof import('expo-image-manipulator');

  const permission =
    source === 'camera'
      ? await picker.requestCameraPermissionsAsync()
      : await picker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: 'denied' };

  const options = { mediaTypes: ['images' as const], allowsEditing: Boolean(aspect), aspect, quality: 1 };
  const result =
    source === 'camera'
      ? await picker.launchCameraAsync(options)
      : await picker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { status: 'cancelled' };

  const resized = await manipulator.manipulateAsync(
    asset.uri,
    asset.width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [],
    { compress: QUALITY, format: manipulator.SaveFormat.JPEG },
  );
  return { status: 'picked', photo: { uri: resized.uri, name: 'photo.jpg', type: 'image/jpeg' } };
}

/** Multipart body with the photo in `file` plus text fields (React Native's FormData file shape). */
export function photoForm(photo: PickedPhoto, fields: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.append('file', photo as unknown as Blob);
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}
