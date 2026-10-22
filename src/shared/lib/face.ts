import * as picker from 'expo-image-picker';
import { NativeModules } from 'react-native';
import { photosAvailable } from './photos';

export interface Point {
  x: number;
  y: number;
}

/** The 4 proportional measurements the backend needs (any unit: only proportions count). */
export interface FaceMeasurements {
  faceLength: number;
  foreheadWidth: number;
  cheekboneWidth: number;
  jawWidth: number;
}

/** The detector (ML Kit) arrives with the next build; until then the scan explains it. */
export const faceScanAvailable = () => photosAvailable() && Boolean(NativeModules.FaceDetection);

/** Width of the face at a height: the nearest contour point on each side of the center. */
function widthAt(points: Point[], y: number, centerX: number): number {
  const nearest = (side: Point[]) =>
    side.reduce((best, p) => (Math.abs(p.y - y) < Math.abs(best.y - y) ? p : best), side[0]!);
  const left = points.filter((p) => p.x < centerX);
  const right = points.filter((p) => p.x >= centerX);
  if (left.length === 0 || right.length === 0) return 0;
  return Math.abs(nearest(right).x - nearest(left).x);
}

/**
 * From the face contour (ML Kit gives ~36 points around the face) to the 4 measurements:
 * length top to chin, and widths at the forehead (upper 15 %), cheekbones (widest, around 40 %)
 * and jaw (around 80 %). The points never leave the phone; only these numbers do.
 */
export function measureFace(contour: Point[]): FaceMeasurements | null {
  if (contour.length < 8) return null;
  const ys = contour.map((p) => p.y);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const length = bottom - top;
  if (length <= 0) return null;
  const centerX = contour.reduce((sum, p) => sum + p.x, 0) / contour.length;
  const at = (ratio: number) => widthAt(contour, top + length * ratio, centerX);
  const cheekbone = Math.max(at(0.35), at(0.4), at(0.45));
  const measurements = {
    faceLength: Math.round(length),
    foreheadWidth: Math.round(at(0.15)),
    cheekboneWidth: Math.round(cheekbone),
    jawWidth: Math.round(at(0.8)),
  };
  return Object.values(measurements).every((v) => v > 0) ? measurements : null;
}

export type FaceScanResult =
  | { status: 'measured'; measurements: FaceMeasurements }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'noFace' };

type Detector = {
  detect: (
    uri: string,
    options: { performanceMode: 'accurate'; contourMode: 'all' },
  ) => Promise<{ contours?: { face?: { points: Point[] } } }[]>;
};

/**
 * Takes a selfie with the front camera and measures the face on the phone. The photo and the
 * contour are discarded right away: nothing is stored or sent but the 4 numbers.
 */
export async function scanFace(): Promise<FaceScanResult> {
  if (!faceScanAvailable()) return { status: 'unavailable' };
  const permission = await picker.requestCameraPermissionsAsync();
  if (!permission.granted) return { status: 'denied' };
  const result = await picker.launchCameraAsync({
    mediaTypes: ['images'],
    cameraType: picker.CameraType.front,
    quality: 0.8,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { status: 'cancelled' };
  // Loaded only here: the module exists only in builds that include it (rule 12).
  const detector = // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('@react-native-ml-kit/face-detection') as { default: Detector }).default;
  const faces = await detector.detect(asset.uri, { performanceMode: 'accurate', contourMode: 'all' });
  const points = faces[0]?.contours?.face?.points;
  const measurements = points ? measureFace(points) : null;
  return measurements ? { status: 'measured', measurements } : { status: 'noFace' };
}

/**
 * Measures the face in a photo being uploaded (gallery or portfolio), when the detector exists.
 * Only the 4 numbers go with the upload; null when there is no clear face or no detector.
 */
export async function measurePhoto(uri: string): Promise<FaceMeasurements | null> {
  if (!faceScanAvailable()) return null;
  try {
    const detector = // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('@react-native-ml-kit/face-detection') as { default: Detector }).default;
    const faces = await detector.detect(uri, { performanceMode: 'accurate', contourMode: 'all' });
    const points = faces[0]?.contours?.face?.points;
    return points ? measureFace(points) : null;
  } catch {
    return null;
  }
}

/** The measurements as multipart fields of an upload. */
export const measurementFields = (m: FaceMeasurements | null): Record<string, string> =>
  m
    ? {
        faceLength: String(m.faceLength),
        foreheadWidth: String(m.foreheadWidth),
        cheekboneWidth: String(m.cheekboneWidth),
        jawWidth: String(m.jawWidth),
      }
    : {};
