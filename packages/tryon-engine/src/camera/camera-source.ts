/**
 * Video source interface for MediaPipe Body Tracking & Three.js Virtual Fitting Pipeline.
 * Decouples the try-on computer vision engine from the camera capture implementation.
 */
export interface CameraVideoSource {
  getVideoElement(): HTMLVideoElement | null;
  getStream(): MediaStream | null;
  isReady(): boolean;
  onFrame?(callback: (video: HTMLVideoElement) => void): () => void;
}
