import { CameraError } from '../types/camera.types';

/**
 * Maps raw browser exceptions or environment errors to typed, user-friendly CameraErrors.
 */
export function normalizeCameraError(err: unknown): CameraError {
  // First, check if the error is a recognized DOMException or Error
  if (err && typeof err === 'object') {
    const error = err as { name?: string; message?: string };
    const name = error.name || '';

    switch (name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          type: 'NOT_ALLOWED',
          message: 'Camera permission was denied.',
          userInstruction:
            'On iPhone: Open Settings > Safari > Camera, and select "Ask" or "Allow". Then refresh this page and tap "Start Camera".',
          originalError: err,
        };

      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return {
          type: 'NOT_FOUND',
          message: 'No camera device found on this system.',
          userInstruction:
            'Please ensure your device has an active camera connected and not disabled in system settings.',
          originalError: err,
        };

      case 'NotReadableError':
      case 'TrackStartError':
        return {
          type: 'NOT_READABLE',
          message: 'Camera is currently in use by another application or blocked by the operating system.',
          userInstruction:
            'Close other apps using the camera (such as FaceTime, Instagram, or another browser tab) and try again.',
          originalError: err,
        };

      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return {
          type: 'OVERCONSTRAINED',
          message: 'Camera cannot satisfy the requested resolution or framerate constraints.',
          userInstruction:
            'VestiAR will automatically adjust to standard camera settings.',
          originalError: err,
        };

      case 'AbortError':
        return {
          type: 'ABORT',
          message: 'Camera hardware or initialization aborted.',
          userInstruction: 'Please restart the camera or refresh the browser.',
          originalError: err,
        };

      case 'SecurityError':
        return {
          type: 'SECURITY',
          message: 'Camera access was blocked by browser security policy.',
          userInstruction:
            'Ensure the page is served over HTTPS and not embedded inside a restricted iframe.',
          originalError: err,
        };
    }
  }

  // Next, check secure context
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return {
      type: 'INSECURE_CONTEXT',
      message: 'Camera access requires a secure HTTPS context.',
      userInstruction:
        'iOS Safari disables camera access on insecure HTTP origins. Please access VestiAR via HTTPS using your LAN IP or localhost.',
      originalError: err,
    };
  }

  // Next, check browser support for getUserMedia
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      type: 'UNSUPPORTED',
      message: 'Your browser does not support camera capture via mediaDevices.',
      userInstruction:
        'Please use a modern browser such as Safari on iOS (14.3+) or Chrome/Edge on Desktop.',
      originalError: err,
    };
  }

  // Fallback unknown
  const fallbackMessage =
    err && typeof err === 'object' && 'message' in err
      ? String((err as any).message)
      : typeof err === 'string'
      ? err
      : 'An unexpected camera error occurred.';

  return {
    type: 'UNKNOWN',
    message: fallbackMessage || 'An unexpected camera error occurred.',
    userInstruction: 'Please refresh the page and try again.',
    originalError: err,
  };
}
