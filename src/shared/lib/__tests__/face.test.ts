import { combineFaceFrames, measureDetected, measureFace, measurementFields, straighten } from '../face';

/** An oval-ish contour: 36 points around (0,0), 100 wide and 140 tall. */
const oval = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * 2 * Math.PI;
  return { x: 50 * Math.cos(a), y: 70 * Math.sin(a) };
});

describe('measureFace', () => {
  it('turns the face contour into 4 proportional measurements', () => {
    const m = measureFace(oval)!;
    expect(m.faceLength).toBe(140);
    // Widest around the cheekbones, narrower at the forehead and the jaw.
    expect(m.cheekboneWidth).toBeGreaterThan(m.foreheadWidth);
    expect(m.cheekboneWidth).toBeGreaterThan(m.jawWidth);
  });

  it('gives nothing for a contour that is not a face', () => {
    expect(measureFace([{ x: 0, y: 0 }])).toBeNull();
    expect(measureFace(Array.from({ length: 10 }, () => ({ x: 1, y: 1 })))).toBeNull();
  });

  it('sends only the 4 numbers with an upload', () => {
    expect(
      measurementFields({ faceLength: 140, foreheadWidth: 90, cheekboneWidth: 100, jawWidth: 80 }),
    ).toEqual({
      faceLength: '140',
      foreheadWidth: '90',
      cheekboneWidth: '100',
      jawWidth: '80',
    });
    expect(measurementFields(null)).toEqual({});
  });
});

describe('protocol v2', () => {
  const eyes = (angle: number) => ({
    leftEye: { x: -20 * Math.cos(angle), y: -20 * Math.sin(angle) - 10 },
    rightEye: { x: 20 * Math.cos(angle), y: 20 * Math.sin(angle) - 10 },
  });
  const rotate = (points: { x: number; y: number }[], angle: number, center = { x: 0, y: -10 }) =>
    points.map((p) => ({
      x: center.x + (p.x - center.x) * Math.cos(angle) - (p.y - center.y) * Math.sin(angle),
      y: center.y + (p.x - center.x) * Math.sin(angle) + (p.y - center.y) * Math.cos(angle),
    }));

  it('adds the chin width at 90 %, narrower than the jaw', () => {
    const m = measureFace(oval)!;
    expect(m.chinWidth).toBeGreaterThan(0);
    expect(m.chinWidth!).toBeLessThan(m.jawWidth);
  });

  it('straightens a tilted head by the eyes before measuring', () => {
    const tilt = 0.3;
    const { leftEye, rightEye } = eyes(tilt);
    const straight = measureFace(straighten(rotate(oval, tilt), leftEye, rightEye))!;
    expect(straight.faceLength).toBeCloseTo(140, -1);
    expect(straight).toEqual(measureFace(oval));
  });

  const face = (overrides: object = {}) => ({
    frame: { width: 500 },
    rotationX: 2,
    rotationY: -3,
    rotationZ: 0,
    contours: { face: { points: oval } },
    ...overrides,
  });

  it('checks one face, looking ahead and close enough', () => {
    expect(measureDetected([], 1000).status).toBe('noFace');
    expect(measureDetected([face(), face()], 1000).status).toBe('manyFaces');
    expect(measureDetected([face({ rotationY: 20 })], 1000).status).toBe('notFrontal');
    expect(measureDetected([face({ rotationX: -25 })], 1000).status).toBe('notFrontal');
    expect(measureDetected([face({ frame: { width: 300 } })], 1000).status).toBe('tooFar');
    const ok = measureDetected([face()], 1000);
    expect(ok.status === 'measured' && ok.measurements.headPose).toEqual({ yaw: -3, pitch: 2, roll: 0 });
  });

  it('combines the photos with the median of each measurement and the mean pose', () => {
    const base = { faceLength: 140, foreheadWidth: 90, cheekboneWidth: 100, jawWidth: 80, chinWidth: 50 };
    const m = combineFaceFrames([
      { ...base, headPose: { yaw: 0, pitch: 0, roll: 0 } },
      { ...base, faceLength: 200, headPose: { yaw: 6, pitch: 3, roll: 3 } },
      { ...base, faceLength: 142, headPose: { yaw: 3, pitch: 0, roll: 0 } },
    ])!;
    expect(m.faceLength).toBe(142);
    expect(m.chinWidth).toBe(50);
    expect(m.headPose).toEqual({ yaw: 3, pitch: 1, roll: 1 });
  });

  it('sends the chin width with an upload when there is one', () => {
    expect(
      measurementFields({
        faceLength: 140,
        foreheadWidth: 90,
        cheekboneWidth: 100,
        jawWidth: 80,
        chinWidth: 40,
      }).chinWidth,
    ).toBe('40');
  });
});
