import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { isApiError, useSession } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import {
  FACE_SHOTS,
  combineFaceFrames,
  faceScanAvailable,
  getCurrentCoordinates,
  requestLocationPermission,
  scanFace,
  type FaceMeasurements,
} from '@/shared/lib';
import { showToast, translateErrorMessage } from '@/shared/ui';
import {
  recommendHaircuts,
  rememberFaceShape,
  sendInteraction,
  type FaceShape,
  type HairType,
  type Maintenance,
  type Vibe,
} from '../api/faceApi';

/** Lima: where to look for photos and barbers when the location is not shared. */
const LIMA = { lat: -12.0464, lng: -77.0428 };

export type FaceStep = 'consent' | 'scan' | 'preferences' | 'result';

/**
 * "Cortes para tu cara": consent → selfie measured on the phone → optional preferences → cuts
 * with real photos and barbers nearby. The photo never leaves the phone (Ley 29733).
 */
export function useFaceRecommendation() {
  const authenticated = useSession((s) => s.status === 'authenticated');
  const [step, setStep] = useState<FaceStep>('consent');
  const [measurements, setMeasurements] = useState<FaceMeasurements | null>(null);
  // Protocol v2: several valid photos, combined with the median of each measurement.
  const [frames, setFrames] = useState<FaceMeasurements[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [hairType, setHairType] = useState<HairType | undefined>(undefined);
  const [vibe, setVibe] = useState<Vibe | undefined>(undefined);
  const [maintenance, setMaintenance] = useState<Maintenance | undefined>(undefined);

  const scan = useMutation({
    mutationFn: scanFace,
    onSuccess: (result) => {
      if (result.status === 'measured') {
        const next = [...frames, result.measurements];
        setMessage(null);
        if (next.length < FACE_SHOTS) {
          setFrames(next);
          return;
        }
        setFrames([]);
        setMeasurements(combineFaceFrames(next));
        setStep('preferences');
      } else if (result.status !== 'cancelled') setMessage(i18n.t(`face:scan.${result.status}`));
    },
    onError: () => setMessage(i18n.t('face:scan.noFace')),
  });

  const recommend = useMutation({
    mutationFn: async () => {
      let where = LIMA;
      if ((await requestLocationPermission().catch(() => 'denied')) === 'granted') {
        const c = await getCurrentCoordinates().catch(() => null);
        if (c) where = { lat: c.latitude, lng: c.longitude };
      }
      return recommendHaircuts({
        measurements: measurements!,
        ...where,
        radiusKm: 10,
        ...(hairType ? { hairType } : {}),
        ...(vibe ? { vibe } : {}),
        ...(maintenance ? { maintenance } : {}),
      });
    },
    onSuccess: () => setStep('result'),
    onError: (err) => {
      // The head was turned (400 headPose / frontalFace): take the photos again.
      if (isApiError(err) && err.status === 400 && JSON.stringify(err.details ?? '').includes('headPose')) {
        setMeasurements(null);
        setFrames([]);
        setStep('scan');
        setMessage(i18n.t('face:scan.notFrontal'));
        return;
      }
      setMessage(translateErrorMessage(err));
    },
  });

  const remember = useMutation({
    mutationFn: (shape: FaceShape) => rememberFaceShape(shape),
    onSuccess: () => showToast(i18n.t('face:result.remembered')),
    onError: (err) => setMessage(translateErrorMessage(err)),
  });

  return {
    step,
    available: faceScanAvailable(),
    accept: () => setStep('scan'),
    scan: () => scan.mutate(),
    isScanning: scan.isPending,
    /** Valid photos so far, of `shots`. */
    shotsTaken: frames.length,
    shots: FACE_SHOTS,
    hairType,
    setHairType,
    vibe,
    setVibe,
    maintenance,
    setMaintenance,
    recommend: () => recommend.mutate(),
    isRecommending: recommend.isPending,
    result: recommend.data ?? null,
    restart: () => {
      setMeasurements(null);
      setFrames([]);
      setStep('scan');
    },
    message,
    canRemember: authenticated,
    remember: (shape: FaceShape) => remember.mutate(shape),
    isRemembering: remember.isPending,
    /** Looking at a photo or booking a cut: only with a session; errors are ignored. */
    track: (input: { imageId?: string; styleKey?: string; kind: 'VIEW' | 'SAVE' | 'BOOK' }) => {
      if (authenticated) void sendInteraction(input).catch(() => undefined);
    },
  };
}
