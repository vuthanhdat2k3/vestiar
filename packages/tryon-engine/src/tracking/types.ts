/**
 * MediaPipe Pose Landmarker 33 keypoint indices and tracking domain types.
 */

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
  presence?: number;
}

export enum PoseLandmarkIndex {
  NOSE = 0,
  LEFT_EYE_INNER = 1,
  LEFT_EYE = 2,
  LEFT_EYE_OUTER = 3,
  RIGHT_EYE_INNER = 4,
  RIGHT_EYE = 5,
  RIGHT_EYE_OUTER = 6,
  LEFT_EAR = 7,
  RIGHT_EAR = 8,
  MOUTH_LEFT = 9,
  MOUTH_RIGHT = 10,
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
  LEFT_PINKY = 17,
  RIGHT_PINKY = 18,
  LEFT_INDEX = 19,
  RIGHT_INDEX = 20,
  LEFT_THUMB = 21,
  RIGHT_THUMB = 22,
  LEFT_HIP = 23,
  RIGHT_HIP = 24,
  LEFT_KNEE = 25,
  RIGHT_KNEE = 26,
  LEFT_ANKLE = 27,
  RIGHT_ANKLE = 28,
  LEFT_HEEL = 29,
  RIGHT_HEEL = 30,
  LEFT_FOOT_INDEX = 31,
  RIGHT_FOOT_INDEX = 32,
}

/**
 * Standard 35 MediaPipe Pose Skeleton Connections.
 */
export const POSE_CONNECTIONS: ReadonlyArray<[number, number]> = [
  // Facial / Head
  [PoseLandmarkIndex.NOSE, PoseLandmarkIndex.LEFT_EYE_INNER],
  [PoseLandmarkIndex.LEFT_EYE_INNER, PoseLandmarkIndex.LEFT_EYE],
  [PoseLandmarkIndex.LEFT_EYE, PoseLandmarkIndex.LEFT_EYE_OUTER],
  [PoseLandmarkIndex.LEFT_EYE_OUTER, PoseLandmarkIndex.LEFT_EAR],
  [PoseLandmarkIndex.NOSE, PoseLandmarkIndex.RIGHT_EYE_INNER],
  [PoseLandmarkIndex.RIGHT_EYE_INNER, PoseLandmarkIndex.RIGHT_EYE],
  [PoseLandmarkIndex.RIGHT_EYE, PoseLandmarkIndex.RIGHT_EYE_OUTER],
  [PoseLandmarkIndex.RIGHT_EYE_OUTER, PoseLandmarkIndex.RIGHT_EAR],
  [PoseLandmarkIndex.MOUTH_LEFT, PoseLandmarkIndex.MOUTH_RIGHT],

  // Upper Body & Torso
  [PoseLandmarkIndex.LEFT_SHOULDER, PoseLandmarkIndex.RIGHT_SHOULDER],
  [PoseLandmarkIndex.LEFT_SHOULDER, PoseLandmarkIndex.LEFT_ELBOW],
  [PoseLandmarkIndex.LEFT_ELBOW, PoseLandmarkIndex.LEFT_WRIST],
  [PoseLandmarkIndex.LEFT_WRIST, PoseLandmarkIndex.LEFT_PINKY],
  [PoseLandmarkIndex.LEFT_WRIST, PoseLandmarkIndex.LEFT_INDEX],
  [PoseLandmarkIndex.LEFT_WRIST, PoseLandmarkIndex.LEFT_THUMB],
  [PoseLandmarkIndex.LEFT_PINKY, PoseLandmarkIndex.LEFT_INDEX],
  [PoseLandmarkIndex.RIGHT_SHOULDER, PoseLandmarkIndex.RIGHT_ELBOW],
  [PoseLandmarkIndex.RIGHT_ELBOW, PoseLandmarkIndex.RIGHT_WRIST],
  [PoseLandmarkIndex.RIGHT_WRIST, PoseLandmarkIndex.RIGHT_PINKY],
  [PoseLandmarkIndex.RIGHT_WRIST, PoseLandmarkIndex.RIGHT_INDEX],
  [PoseLandmarkIndex.RIGHT_WRIST, PoseLandmarkIndex.RIGHT_THUMB],
  [PoseLandmarkIndex.RIGHT_PINKY, PoseLandmarkIndex.RIGHT_INDEX],

  // Torso Sides
  [PoseLandmarkIndex.LEFT_SHOULDER, PoseLandmarkIndex.LEFT_HIP],
  [PoseLandmarkIndex.RIGHT_SHOULDER, PoseLandmarkIndex.RIGHT_HIP],
  [PoseLandmarkIndex.LEFT_HIP, PoseLandmarkIndex.RIGHT_HIP],

  // Lower Body
  [PoseLandmarkIndex.LEFT_HIP, PoseLandmarkIndex.LEFT_KNEE],
  [PoseLandmarkIndex.LEFT_KNEE, PoseLandmarkIndex.LEFT_ANKLE],
  [PoseLandmarkIndex.LEFT_ANKLE, PoseLandmarkIndex.LEFT_HEEL],
  [PoseLandmarkIndex.LEFT_HEEL, PoseLandmarkIndex.LEFT_FOOT_INDEX],
  [PoseLandmarkIndex.LEFT_ANKLE, PoseLandmarkIndex.LEFT_FOOT_INDEX],
  [PoseLandmarkIndex.RIGHT_HIP, PoseLandmarkIndex.RIGHT_KNEE],
  [PoseLandmarkIndex.RIGHT_KNEE, PoseLandmarkIndex.RIGHT_ANKLE],
  [PoseLandmarkIndex.RIGHT_ANKLE, PoseLandmarkIndex.RIGHT_HEEL],
  [PoseLandmarkIndex.RIGHT_HEEL, PoseLandmarkIndex.RIGHT_FOOT_INDEX],
  [PoseLandmarkIndex.RIGHT_ANKLE, PoseLandmarkIndex.RIGHT_FOOT_INDEX],
];

export interface PoseLandmarkerConfig {
  modelAssetPath?: string;
  wasmPath?: string;
  delegate?: 'GPU' | 'CPU';
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
  numPoses?: number;
  outputSegmentationMasks?: boolean;
}

export interface PoseDetectionResult {
  landmarks: NormalizedLandmark[];
  worldLandmarks?: NormalizedLandmark[];
  timestampMs: number;
  inferenceLatencyMs: number;
  hasBody: boolean;
}

export interface EstimatedPoint {
  x: number;
  y: number;
  z: number;
  confidence: number;
  isEstimated: true;
}

export interface BodyMeasurements {
  // Directly detected landmarks
  leftShoulder: NormalizedLandmark | null;
  rightShoulder: NormalizedLandmark | null;
  leftElbow: NormalizedLandmark | null;
  rightElbow: NormalizedLandmark | null;
  leftWrist: NormalizedLandmark | null;
  rightWrist: NormalizedLandmark | null;
  leftHip: NormalizedLandmark | null;
  rightHip: NormalizedLandmark | null;
  leftKnee: NormalizedLandmark | null;
  rightKnee: NormalizedLandmark | null;
  leftAnkle: NormalizedLandmark | null;
  rightAnkle: NormalizedLandmark | null;

  // Estimated landmarks & structural lines
  neckPosition: EstimatedPoint | null;
  shoulderCenter: EstimatedPoint | null;
  shoulderWidthNormalized: number | null;
  torsoCenter: EstimatedPoint | null;
  torsoHeightNormalized: number | null;
  waistApproximation: EstimatedPoint | null;
  hipCenter: EstimatedPoint | null;
  hipWidthNormalized: number | null;

  // Explicit notice stating this is not an official medical measurement
  disclaimer: string;
}

export interface PoseTrackingState {
  isReady: boolean;
  isTracking: boolean;
  activeDelegate: 'GPU' | 'CPU' | null;
  fps: number;
  latencyMs: number;
  hasBody: boolean;
  error: string | null;
}
