import { useCallback, useEffect, useRef, useState } from 'react';
import { cameraService } from '../services/camera.service';
import {
  CameraDeviceInfo,
  CameraError,
  CameraResolution,
  CameraStartOptions,
  CameraStatus,
  FacingMode,
} from '../types/camera.types';

export interface UseCameraOptions {
  autoStart?: boolean;
  defaultFacingMode?: FacingMode;
  onFrame?: (video: HTMLVideoElement) => void;
}

export interface UseCameraReturn {
  // States
  status: CameraStatus;
  stream: MediaStream | null;
  error: CameraError | null;
  facingMode: FacingMode;
  availableDevices: CameraDeviceInfo[];
  activeDeviceId: string | null;
  resolution: CameraResolution | null;
  fps: number;
  isSupported: boolean;
  isSecureContext: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;

  // Actions
  startCamera: (options?: CameraStartOptions) => Promise<MediaStream | null>;
  stopCamera: () => void;
  restartCamera: (options?: CameraStartOptions) => Promise<MediaStream | null>;
  switchCamera: (targetFacingMode?: FacingMode, deviceId?: string) => Promise<MediaStream | null>;
  retry: () => Promise<MediaStream | null>;
  clearError: () => void;
  getVideoElement: () => HTMLVideoElement | null;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { autoStart = false, defaultFacingMode = 'environment', onFrame } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<CameraStatus>(cameraService.getStatus());
  const [stream, setStream] = useState<MediaStream | null>(cameraService.getCurrentStream());
  const [error, setError] = useState<CameraError | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>(cameraService.getActiveFacingMode() || defaultFacingMode);
  const [availableDevices, setAvailableDevices] = useState<CameraDeviceInfo[]>(cameraService.getAvailableDevices());
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(cameraService.getActiveDeviceId());
  const [resolution, setResolution] = useState<CameraResolution | null>(null);
  const [fps, setFps] = useState<number>(0);

  const isSupported = cameraService.isSupported();
  const isSecureContext = cameraService.isSecureContext();

  const fpsFramesRef = useRef<number[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const wasRunningBeforeHiddenRef = useRef<boolean>(false);

  // FPS Counter & Frame Loop
  useEffect(() => {
    let active = true;

    const measureFps = () => {
      if (!active) return;
      const now = performance.now();
      const frames = fpsFramesRef.current;

      // Filter out frames older than 1 second
      while (frames.length > 0 && frames[0] <= now - 1000) {
        frames.shift();
      }
      frames.push(now);
      setFps(frames.length);

      if (videoRef.current && onFrame && videoRef.current.readyState >= 2) {
        onFrame(videoRef.current);
      }

      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype && videoRef.current) {
        // Safari 15.4+ and modern browsers support requestVideoFrameCallback
        (videoRef.current as any).requestVideoFrameCallback(measureFps);
      } else {
        animFrameIdRef.current = requestAnimationFrame(measureFps);
      }
    };

    if (status === 'running' && videoRef.current) {
      fpsFramesRef.current = [];
      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        (videoRef.current as any).requestVideoFrameCallback(measureFps);
      } else {
        animFrameIdRef.current = requestAnimationFrame(measureFps);
      }
    } else {
      setFps(0);
    }

    return () => {
      active = false;
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [status, onFrame]);

  // Sync stream to HTMLVideoElement
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      const handleLoadedMetadata = () => {
        if (video.videoWidth && video.videoHeight) {
          setResolution({
            width: video.videoWidth,
            height: video.videoHeight,
          });
        }
        video.play().catch((playErr) => {
          console.warn('VestiAR: Autoplay was prevented by browser policy:', playErr);
        });
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    } else {
      video.srcObject = null;
      setResolution(null);
    }
  }, [stream]);

  // Subscribe to CameraService events
  useEffect(() => {
    const unsubStream = cameraService.onStreamChange((newStream) => {
      setStream(newStream);
      setFacingMode(cameraService.getActiveFacingMode());
      setActiveDeviceId(cameraService.getActiveDeviceId());
    });

    const unsubStatus = cameraService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    const unsubError = cameraService.onError((newError) => {
      setError(newError);
    });

    const unsubDevices = cameraService.onDevicesChange((newDevices) => {
      setAvailableDevices(newDevices);
    });

    // Populate devices on mount
    cameraService.enumerateDevices().catch(() => {});

    return () => {
      unsubStream();
      unsubStatus();
      unsubError();
      unsubDevices();
    };
  }, []);

  // Handle Page Visibility Changes (iOS Safari background / tab-switch behavior)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (cameraService.getStatus() === 'running') {
          wasRunningBeforeHiddenRef.current = true;
        }
      } else if (document.visibilityState === 'visible') {
        if (wasRunningBeforeHiddenRef.current) {
          wasRunningBeforeHiddenRef.current = false;
          const current = cameraService.getCurrentStream();
          const activeTrack = current?.getVideoTracks()[0];
          // If track was ended or muted by OS during backgrounding, restart camera
          if (!activeTrack || activeTrack.readyState === 'ended') {
            cameraService.restart().catch(() => {});
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Actions
  const startCamera = useCallback(
    async (startOptions?: CameraStartOptions): Promise<MediaStream | null> => {
      try {
        setError(null);
        const newStream = await cameraService.start({
          facingMode: startOptions?.facingMode || facingMode,
          ...startOptions,
        });
        return newStream;
      } catch (err) {
        return null;
      }
    },
    [facingMode]
  );

  const stopCamera = useCallback(() => {
    cameraService.stop();
    setResolution(null);
    setFps(0);
  }, []);

  const restartCamera = useCallback(
    async (startOptions?: CameraStartOptions): Promise<MediaStream | null> => {
      try {
        setError(null);
        return await cameraService.restart(startOptions);
      } catch {
        return null;
      }
    },
    []
  );

  const switchCamera = useCallback(
    async (targetFacingMode?: FacingMode, deviceId?: string): Promise<MediaStream | null> => {
      try {
        setError(null);
        return await cameraService.switchCamera(targetFacingMode, deviceId);
      } catch {
        return null;
      }
    },
    []
  );

  const retry = useCallback(async (): Promise<MediaStream | null> => {
    return startCamera();
  }, [startCamera]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getVideoElement = useCallback(() => {
    return videoRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }

    return () => {
      cameraService.stop();
    };
  }, [autoStart, startCamera]);

  return {
    status,
    stream,
    error,
    facingMode,
    availableDevices,
    activeDeviceId,
    resolution,
    fps,
    isSupported,
    isSecureContext,
    videoRef,
    startCamera,
    stopCamera,
    restartCamera,
    switchCamera,
    retry,
    clearError,
    getVideoElement,
  };
}
