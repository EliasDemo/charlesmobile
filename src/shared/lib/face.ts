import * as picker from 'expo-image-picker';
import { NativeModules } from 'react-native';
import { photosAvailable } from './photos';

export interface Point {
  x: number;
  y: number;
}

/** Where the head points, in degrees (ML Kit's Euler angles). */
export interface HeadPose {
  /** Turned to the sides (Euler Y). */
  yaw: number;
  /** Up or down (Euler X). */
  pitch: number;
  /** Tilt (Euler Z); the contour is straightened before measuring. */
  roll: number;
}

/**
 * The proportional measurements the backend needs (any unit: only proportions count), plus the
 * head pose of the photos they came from (FORMA-DE-CARA.md §2, protocol v2).
 */
export interface FaceMeasurements {
  faceLength: number;
  foreheadWidth: number;
  cheekboneWidth: number;
  jawWidth: number;
  /** Width at 90 %: separates round from square and heart from diamond. */
  chinWidth?: number;
  headPose?: HeadPose;
}

type Widths = Omit<FaceMeasurements, 'headPose'>;

// Protocol v2: the classifier was calibrated with faces measured exactly like this.
const MAX_YAW = 15;
const MAX_PITCH = 20;
/** The face must fill at least 35 % of the photo's width. */
const MIN_FACE_RATIO = 0.35;
/** Photos taken and combined (median) when there is no live camera view. */
export const FACE_SHOTS = 3;

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

const centroid = (points: Point[]): Point => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
});

/**
 * Rotates the contour around the center of the eyes so the line between them is horizontal
 * (corrects a tilted head before measuring).
 */
export function straighten(contour: Point[], leftEye: Point, rightEye: Point): Point[] {
  const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
  // Whichever side the detector calls "left", the line is made horizontal (not upside down).
  const turn = Math.abs(angle) > Math.PI / 2 ? angle - Math.sign(angle) * Math.PI : angle;
  if (turn === 0) return contour;
  const center = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
  const cos = Math.cos(-turn);
  const sin = Math.sin(-turn);
  return contour.map((p) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
  });
}

/**
 * From the face contour (ML Kit gives ~36 points around the face) to the measurements: length top
 * to chin, and widths at the forehead (15 %), cheekbones (widest of 35/40/45 %), jaw (80 %) and
 * chin (90 %). The points never leave the phone; only these numbers do.
 */
export function measureFace(contour: Point[]): Widths | null {
  if (contour.length < 8) return null;
  const ys = contour.map((p) => p.y);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const length = bottom - top;
  if (length <= 0) return null;
  const centerX = centroid(contour).x;
  const at = (ratio: number) => widthAt(contour, top + length * ratio, centerX);
  const cheekbone = Math.max(at(0.35), at(0.4), at(0.45));
  const measurements = {
    faceLength: Math.round(length),
    foreheadWidth: Math.round(at(0.15)),
    cheekboneWidth: Math.round(cheekbone),
    jawWidth: Math.round(at(0.8)),
  };
  if (!Object.values(measurements).every((v) => v > 0)) return null;
  const chin = Math.round(at(0.9));
  return chin > 0 ? { ...measurements, chinWidth: chin } : measurements;
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};
const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** Several valid photos into one result: the median of each measurement and the mean pose. */
export function combineFaceFrames(frames: FaceMeasurements[]): FaceMeasurements | null {
  if (frames.length === 0) return null;
  const pick = (key: keyof Widths) => Math.round(median(frames.map((f) => f[key] ?? 0)));
  const chins = frames.map((f) => f.chinWidth).filter((v): v is number => v !== undefined);
  const poses = frames.map((f) => f.headPose).filter((p): p is HeadPose => p !== undefined);
  return {
    faceLength: pick('faceLength'),
    foreheadWidth: pick('foreheadWidth'),
    cheekboneWidth: pick('cheekboneWidth'),
    jawWidth: pick('jawWidth'),
    ...(chins.length ? { chinWidth: Math.round(median(chins)) } : {}),
    ...(poses.length
      ? {
          headPose: {
            yaw: Math.round(mean(poses.map((p) => p.yaw))),
            pitch: Math.round(mean(poses.map((p) => p.pitch))),
            roll: Math.round(mean(poses.map((p) => p.roll))),
          },
        }
      : {}),
  };
}

type DetectedFace = {
  frame?: { width: number };
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  contours?: { face?: { points: Point[] }; leftEye?: { points: Point[] }; rightEye?: { points: Point[] } };
};
type Detector = {
  detect: (
    uri: string,
    options: { performanceMode: 'accurate'; contourMode: 'all' },
  ) => Promise<DetectedFace[]>;
};

export type FaceFrameResult =
  | { status: 'measured'; measurements: FaceMeasurements }
  | { status: 'noFace' }
  | { status: 'manyFaces' }
  | { status: 'notFrontal' }
  | { status: 'tooFar' };

/**
 * Checks one detected photo (protocol v2) and measures it: one face, looking ahead, close enough,
 * the contour straightened by the eyes. `imageWidth` is the photo's width in pixels.
 */
export function measureDetected(faces: DetectedFace[], imageWidth?: number): FaceFrameResult {
  if (faces.length === 0) return { status: 'noFace' };
  if (faces.length > 1) return { status: 'manyFaces' };
  const face = faces[0]!;
  const pose: HeadPose = {
    yaw: face.rotationY ?? 0,
    pitch: face.rotationX ?? 0,
    roll: face.rotationZ ?? 0,
  };
  if (Math.abs(pose.yaw) > MAX_YAW || Math.abs(pose.pitch) > MAX_PITCH) return { status: 'notFrontal' };
  if (imageWidth && face.frame && face.frame.width < imageWidth * MIN_FACE_RATIO) return { status: 'tooFar' };
  const contour = face.contours?.face?.points;
  if (!contour) return { status: 'noFace' };
  const leftEye = face.contours?.leftEye?.points;
  const rightEye = face.contours?.rightEye?.points;
  const points =
    leftEye?.length && rightEye?.length
      ? straighten(contour, centroid(leftEye), centroid(rightEye))
      : contour;
  const widths = measureFace(points);
  return widths ? { status: 'measured', measurements: { ...widths, headPose: pose } } : { status: 'noFace' };
}

const loadDetector = () =>
  // Loaded only here: the module exists only in builds that include it (rule 12).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require('@react-native-ml-kit/face-detection') as { default: Detector }).default;

export type FaceScanResult =
  FaceFrameResult | { status: 'cancelled' } | { status: 'denied' } | { status: 'unavailable' };

/**
 * Takes one selfie with the front camera and measures it on the phone (one of the photos that
 * are combined). The photo and the contour are discarded right away: only the numbers remain.
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
  const faces = await loadDetector().detect(asset.uri, { performanceMode: 'accurate', contourMode: 'all' });
  return measureDetected(faces, asset.width);
}

/**
 * Measures the face in a photo being uploaded (gallery or portfolio), when the detector exists.
 * Only the numbers go with the upload; null when there is no clear, frontal face or no detector.
 */
export async function measurePhoto(uri: string): Promise<FaceMeasurements | null> {
  if (!faceScanAvailable()) return null;
  try {
    const faces = await loadDetector().detect(uri, { performanceMode: 'accurate', contourMode: 'all' });
    const result = measureDetected(faces);
    return result.status === 'measured' ? result.measurements : null;
  } catch {
    return null;
  }
}

/** The measurements as multipart fields of an upload (the pose is not part of uploads). */
export const measurementFields = (m: FaceMeasurements | null): Record<string, string> =>
  m
    ? {
        faceLength: String(m.faceLength),
        foreheadWidth: String(m.foreheadWidth),
        cheekboneWidth: String(m.cheekboneWidth),
        jawWidth: String(m.jawWidth),
        ...(m.chinWidth !== undefined ? { chinWidth: String(m.chinWidth) } : {}),
      }
    : {};
