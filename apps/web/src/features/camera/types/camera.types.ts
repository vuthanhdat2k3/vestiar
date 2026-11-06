/**
 * Camera domain types and interfaces for VestiAR.
 */

export type FacingMode = 'user' | 'environment';

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'error';

export type CameraErrorType =
  | 'NOT_ALLOWED'
  | 'NOT_FOUND'
  | 'NOT_READABLE'
  | 'OVERCONSTRAINED'
  | 'ABORT'
  | 'SECURITY'
  | 'UNSUPPORTED'
  | 'INSECURE_CONTEXT'
  | 'TRACK_ENDED'
  | 'UNKNOWN';

export interface CameraError {
  type: CameraErrorType;
  message: string;
  userInstruction: string;
  originalError?: unknown;
}

export interface CameraResolution {
  width: number;
  height: number;
}

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  facingMode?: FacingMode;
}

export interface CameraCapabilitiesInfo {
  width?: number;
  height?: number;
  frameRate?: number;
  facingMode?: string;
  aspectRatio?: number;
}

export interface CameraStartOptions {
  facingMode?: FacingMode;
  deviceId?: string;
  idealWidth?: number;
  idealHeight?: number;
  idealFrameRate?: number;
}

export interface CameraState {
  status: CameraStatus;
  stream: MediaStream | null;
  error: CameraError | null;
  facingMode: FacingMode;
  availableDevices: CameraDeviceInfo[];
  activeDeviceId: string | null;
  resolution: CameraResolution | null;
  fps: number;
  isSecureContext: boolean;
  isSupported: boolean;
}

export const PREFERRED_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
  },
};
