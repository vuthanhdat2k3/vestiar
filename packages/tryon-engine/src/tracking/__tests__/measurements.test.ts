import { describe, it, expect } from 'vitest';
import { extractBodyMeasurements, calcDistance2D, calcMidpoint } from '../measurements';
import { NormalizedLandmark, PoseLandmarkIndex } from '../types';

function createMockLandmarks(overrides: Partial<Record<PoseLandmarkIndex, Partial<NormalizedLandmark>>> = {}): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = [];
  for (let i = 0; i < 33; i++) {
    landmarks.push({
      x: 0.5,
      y: 0.5,
      z: 0.0,
      visibility: 0.9,
      presence: 0.9,
    });
  }

  // Set realistic default points for shoulders and hips
  landmarks[PoseLandmarkIndex.NOSE] = { x: 0.5, y: 0.15, z: 0, visibility: 0.95 };
  landmarks[PoseLandmarkIndex.LEFT_SHOULDER] = { x: 0.6, y: 0.3, z: 0, visibility: 0.9 };
  landmarks[PoseLandmarkIndex.RIGHT_SHOULDER] = { x: 0.4, y: 0.3, z: 0, visibility: 0.9 };
  landmarks[PoseLandmarkIndex.LEFT_ELBOW] = { x: 0.65, y: 0.45, z: 0, visibility: 0.85 };
  landmarks[PoseLandmarkIndex.RIGHT_ELBOW] = { x: 0.35, y: 0.45, z: 0, visibility: 0.85 };
  landmarks[PoseLandmarkIndex.LEFT_WRIST] = { x: 0.7, y: 0.6, z: 0, visibility: 0.8 };
  landmarks[PoseLandmarkIndex.RIGHT_WRIST] = { x: 0.3, y: 0.6, z: 0, visibility: 0.8 };
  landmarks[PoseLandmarkIndex.LEFT_HIP] = { x: 0.58, y: 0.6, z: 0, visibility: 0.9 };
  landmarks[PoseLandmarkIndex.RIGHT_HIP] = { x: 0.42, y: 0.6, z: 0, visibility: 0.9 };
  landmarks[PoseLandmarkIndex.LEFT_KNEE] = { x: 0.57, y: 0.8, z: 0, visibility: 0.9 };
  landmarks[PoseLandmarkIndex.RIGHT_KNEE] = { x: 0.43, y: 0.8, z: 0, visibility: 0.9 };
  landmarks[PoseLandmarkIndex.LEFT_ANKLE] = { x: 0.56, y: 0.95, z: 0, visibility: 0.85 };
  landmarks[PoseLandmarkIndex.RIGHT_ANKLE] = { x: 0.44, y: 0.95, z: 0, visibility: 0.85 };

  for (const [key, val] of Object.entries(overrides)) {
    const idx = Number(key);
    landmarks[idx] = { ...landmarks[idx], ...val };
  }

  return landmarks;
}

describe('measurements: extractBodyMeasurements', () => {
  it('handles empty or incomplete landmarks gracefully', () => {
    const emptyResult = extractBodyMeasurements([]);
    expect(emptyResult.leftShoulder).toBeNull();
    expect(emptyResult.shoulderCenter).toBeNull();
    expect(emptyResult.disclaimer).toBeTruthy();

    const partialResult = extractBodyMeasurements(new Array(10).fill({ x: 0, y: 0, z: 0 }));
    expect(partialResult.rightShoulder).toBeNull();
  });

  it('calculates 2D Euclidean distance and midpoints accurately', () => {
    const p1 = { x: 0.1, y: 0.2 };
    const p2 = { x: 0.4, y: 0.6 };
    // dx = 0.3, dy = 0.4 -> distance = 0.5
    expect(calcDistance2D(p1, p2)).toBeCloseTo(0.5);

    const lm1: NormalizedLandmark = { x: 0.2, y: 0.4, z: 0.0, visibility: 0.8 };
    const lm2: NormalizedLandmark = { x: 0.4, y: 0.6, z: 0.2, visibility: 0.6 };
    const mid = calcMidpoint(lm1, lm2);
    expect(mid.x).toBeCloseTo(0.3);
    expect(mid.y).toBeCloseTo(0.5);
    expect(mid.z).toBeCloseTo(0.1);
    expect(mid.confidence).toBeCloseTo(0.7);
  });

  it('extracts all directly detected landmarks when visibility is high', () => {
    const landmarks = createMockLandmarks();
    const measurements = extractBodyMeasurements(landmarks);

    expect(measurements.leftShoulder).not.toBeNull();
    expect(measurements.rightShoulder).not.toBeNull();
    expect(measurements.leftElbow).not.toBeNull();
    expect(measurements.rightElbow).not.toBeNull();
    expect(measurements.leftWrist).not.toBeNull();
    expect(measurements.rightWrist).not.toBeNull();
    expect(measurements.leftHip).not.toBeNull();
    expect(measurements.rightHip).not.toBeNull();
    expect(measurements.leftKnee).not.toBeNull();
    expect(measurements.rightKnee).not.toBeNull();
    expect(measurements.leftAnkle).not.toBeNull();
    expect(measurements.rightAnkle).not.toBeNull();
  });

  it('filters out landmarks with visibility below confidence threshold', () => {
    const landmarks = createMockLandmarks({
      [PoseLandmarkIndex.LEFT_ELBOW]: { visibility: 0.3 }, // below default 0.5
      [PoseLandmarkIndex.RIGHT_ANKLE]: { visibility: 0.2 },
    });
    const measurements = extractBodyMeasurements(landmarks, 0.5);

    expect(measurements.leftElbow).toBeNull();
    expect(measurements.rightAnkle).toBeNull();
    // Others above 0.5 should still be present
    expect(measurements.rightElbow).not.toBeNull();
  });

  it('computes shoulder center and shoulder width with isEstimated: true', () => {
    const landmarks = createMockLandmarks({
      [PoseLandmarkIndex.LEFT_SHOULDER]: { x: 0.6, y: 0.3, z: 0, visibility: 0.9 },
      [PoseLandmarkIndex.RIGHT_SHOULDER]: { x: 0.4, y: 0.3, z: 0, visibility: 0.9 },
    });
    const measurements = extractBodyMeasurements(landmarks);

    expect(measurements.shoulderCenter).not.toBeNull();
    expect(measurements.shoulderCenter?.isEstimated).toBe(true);
    expect(measurements.shoulderCenter?.x).toBeCloseTo(0.5);
    expect(measurements.shoulderCenter?.y).toBeCloseTo(0.3);
    expect(measurements.shoulderWidthNormalized).toBeCloseTo(0.2);
  });

  it('computes hip center and hip width with isEstimated: true', () => {
    const landmarks = createMockLandmarks({
      [PoseLandmarkIndex.LEFT_HIP]: { x: 0.58, y: 0.6, z: 0, visibility: 0.9 },
      [PoseLandmarkIndex.RIGHT_HIP]: { x: 0.42, y: 0.6, z: 0, visibility: 0.9 },
    });
    const measurements = extractBodyMeasurements(landmarks);

    expect(measurements.hipCenter).not.toBeNull();
    expect(measurements.hipCenter?.isEstimated).toBe(true);
    expect(measurements.hipCenter?.x).toBeCloseTo(0.5);
    expect(measurements.hipWidthNormalized).toBeCloseTo(0.16);
  });

  it('computes torso center and waist approximation along the centerline', () => {
    const landmarks = createMockLandmarks();
    const measurements = extractBodyMeasurements(landmarks);

    expect(measurements.torsoCenter).not.toBeNull();
    expect(measurements.torsoCenter?.isEstimated).toBe(true);
    expect(measurements.torsoCenter?.x).toBeCloseTo(0.5);
    expect(measurements.torsoCenter?.y).toBeCloseTo(0.45); // midpoint of 0.3 and 0.6

    expect(measurements.waistApproximation).not.toBeNull();
    expect(measurements.waistApproximation?.isEstimated).toBe(true);
    // Waist at 60% down from shoulders (0.3) to hips (0.6): 0.3 + 0.3 * 0.6 = 0.48
    expect(measurements.waistApproximation?.y).toBeCloseTo(0.48);
  });

  it('estimates neck position with isEstimated: true', () => {
    const landmarks = createMockLandmarks();
    const measurements = extractBodyMeasurements(landmarks);

    expect(measurements.neckPosition).not.toBeNull();
    expect(measurements.neckPosition?.isEstimated).toBe(true);
    // Neck should be between nose (0.15) and shoulder center (0.3)
    expect(measurements.neckPosition!.y).toBeLessThan(0.3);
    expect(measurements.neckPosition!.y).toBeGreaterThan(0.15);
  });

  it('includes an explicit non-medical disclaimer', () => {
    const landmarks = createMockLandmarks();
    const measurements = extractBodyMeasurements(landmarks);

    expect(measurements.disclaimer).toContain('not physical or medical body measurements');
  });
});
