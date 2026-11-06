import {
  BodyMeasurements,
  EstimatedPoint,
  NormalizedLandmark,
  PoseLandmarkIndex,
} from './types';

export function calcDistance2D(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calcMidpoint(
  p1: NormalizedLandmark,
  p2: NormalizedLandmark
): { x: number; y: number; z: number; confidence: number } {
  const conf1 = p1.visibility ?? p1.presence ?? 1.0;
  const conf2 = p2.visibility ?? p2.presence ?? 1.0;
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    z: (p1.z + p2.z) / 2,
    confidence: (conf1 + conf2) / 2,
  };
}

function isValidLandmark(
  landmark: NormalizedLandmark | undefined,
  minConfidence: number
): landmark is NormalizedLandmark {
  if (!landmark) return false;
  const conf = landmark.visibility ?? landmark.presence ?? 1.0;
  return conf >= minConfidence;
}

/**
 * Extracts key detected body landmarks and estimates essential structural fitting lines.
 * All estimated measurements are explicitly tagged with `isEstimated: true`.
 */
export function extractBodyMeasurements(
  landmarks: NormalizedLandmark[],
  minConfidence = 0.5
): BodyMeasurements {
  const disclaimer =
    'Screen-space proportional approximations for virtual try-on garment alignment; not physical or medical body measurements.';

  if (!landmarks || landmarks.length < 33) {
    return {
      leftShoulder: null,
      rightShoulder: null,
      leftElbow: null,
      rightElbow: null,
      leftWrist: null,
      rightWrist: null,
      leftHip: null,
      rightHip: null,
      leftKnee: null,
      rightKnee: null,
      leftAnkle: null,
      rightAnkle: null,
      neckPosition: null,
      shoulderCenter: null,
      shoulderWidthNormalized: null,
      torsoCenter: null,
      torsoHeightNormalized: null,
      waistApproximation: null,
      hipCenter: null,
      hipWidthNormalized: null,
      disclaimer,
    };
  }

  // Directly detected landmarks
  const ls = landmarks[PoseLandmarkIndex.LEFT_SHOULDER];
  const rs = landmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
  const le = landmarks[PoseLandmarkIndex.LEFT_ELBOW];
  const re = landmarks[PoseLandmarkIndex.RIGHT_ELBOW];
  const lw = landmarks[PoseLandmarkIndex.LEFT_WRIST];
  const rw = landmarks[PoseLandmarkIndex.RIGHT_WRIST];
  const lh = landmarks[PoseLandmarkIndex.LEFT_HIP];
  const rh = landmarks[PoseLandmarkIndex.RIGHT_HIP];
  const lk = landmarks[PoseLandmarkIndex.LEFT_KNEE];
  const rk = landmarks[PoseLandmarkIndex.RIGHT_KNEE];
  const la = landmarks[PoseLandmarkIndex.LEFT_ANKLE];
  const ra = landmarks[PoseLandmarkIndex.RIGHT_ANKLE];
  const nose = landmarks[PoseLandmarkIndex.NOSE];

  const validLs = isValidLandmark(ls, minConfidence) ? ls : null;
  const validRs = isValidLandmark(rs, minConfidence) ? rs : null;
  const validLh = isValidLandmark(lh, minConfidence) ? lh : null;
  const validRh = isValidLandmark(rh, minConfidence) ? rh : null;

  // 1. Shoulder center and width
  let shoulderCenter: EstimatedPoint | null = null;
  let shoulderWidthNormalized: number | null = null;
  if (validLs && validRs) {
    const mid = calcMidpoint(validLs, validRs);
    shoulderCenter = { ...mid, isEstimated: true };
    shoulderWidthNormalized = calcDistance2D(validLs, validRs);
  }

  // 2. Hip center and width
  let hipCenter: EstimatedPoint | null = null;
  let hipWidthNormalized: number | null = null;
  if (validLh && validRh) {
    const mid = calcMidpoint(validLh, validRh);
    hipCenter = { ...mid, isEstimated: true };
    hipWidthNormalized = calcDistance2D(validLh, validRh);
  }

  // 3. Torso center & height
  let torsoCenter: EstimatedPoint | null = null;
  let torsoHeightNormalized: number | null = null;
  if (shoulderCenter && hipCenter) {
    torsoCenter = {
      x: (shoulderCenter.x + hipCenter.x) / 2,
      y: (shoulderCenter.y + hipCenter.y) / 2,
      z: (shoulderCenter.z + hipCenter.z) / 2,
      confidence: (shoulderCenter.confidence + hipCenter.confidence) / 2,
      isEstimated: true,
    };
    torsoHeightNormalized = calcDistance2D(shoulderCenter, hipCenter);
  }

  // 4. Neck position estimation
  let neckPosition: EstimatedPoint | null = null;
  if (shoulderCenter) {
    if (isValidLandmark(nose, minConfidence)) {
      // Interpolate between shoulder center and nose (neck is ~70% down from nose or 30% up from shoulders)
      neckPosition = {
        x: shoulderCenter.x + (nose.x - shoulderCenter.x) * 0.35,
        y: shoulderCenter.y + (nose.y - shoulderCenter.y) * 0.35,
        z: shoulderCenter.z + (nose.z - shoulderCenter.z) * 0.35,
        confidence: (shoulderCenter.confidence + (nose.visibility ?? 1)) / 2,
        isEstimated: true,
      };
    } else if (torsoHeightNormalized) {
      neckPosition = {
        x: shoulderCenter.x,
        y: shoulderCenter.y - torsoHeightNormalized * 0.15,
        z: shoulderCenter.z,
        confidence: shoulderCenter.confidence * 0.8,
        isEstimated: true,
      };
    }
  }

  // 5. Waist approximation (estimated along torso centerline at ~60% down towards hips)
  let waistApproximation: EstimatedPoint | null = null;
  if (shoulderCenter && hipCenter) {
    const waistFactor = 0.6;
    waistApproximation = {
      x: shoulderCenter.x + (hipCenter.x - shoulderCenter.x) * waistFactor,
      y: shoulderCenter.y + (hipCenter.y - shoulderCenter.y) * waistFactor,
      z: shoulderCenter.z + (hipCenter.z - shoulderCenter.z) * waistFactor,
      confidence: (shoulderCenter.confidence + hipCenter.confidence) / 2,
      isEstimated: true,
    };
  }

  return {
    leftShoulder: validLs,
    rightShoulder: validRs,
    leftElbow: isValidLandmark(le, minConfidence) ? le : null,
    rightElbow: isValidLandmark(re, minConfidence) ? re : null,
    leftWrist: isValidLandmark(lw, minConfidence) ? lw : null,
    rightWrist: isValidLandmark(rw, minConfidence) ? rw : null,
    leftHip: validLh,
    rightHip: validRh,
    leftKnee: isValidLandmark(lk, minConfidence) ? lk : null,
    rightKnee: isValidLandmark(rk, minConfidence) ? rk : null,
    leftAnkle: isValidLandmark(la, minConfidence) ? la : null,
    rightAnkle: isValidLandmark(ra, minConfidence) ? ra : null,
    neckPosition,
    shoulderCenter,
    shoulderWidthNormalized,
    torsoCenter,
    torsoHeightNormalized,
    waistApproximation,
    hipCenter,
    hipWidthNormalized,
    disclaimer,
  };
}
