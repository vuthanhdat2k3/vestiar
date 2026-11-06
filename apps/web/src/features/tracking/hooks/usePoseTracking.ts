import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BodyMeasurements,
  NormalizedLandmark,
  PoseDetectionResult,
  PoseTrackingPipeline,
  PoseTrackingState,
} from '@vestiar/tryon-engine';

export interface UsePoseTrackingOptions {
  autoStart?: boolean;
  targetFps?: number;
}

export interface UsePoseTrackingReturn {
  // State
  isReady: boolean;
  isTracking: boolean;
  activeDelegate: 'GPU' | 'CPU' | null;
  fps: number;
  latencyMs: number;
  hasBody: boolean;
  error: string | null;
  landmarks: NormalizedLandmark[];
  measurements: BodyMeasurements | null;

  // Visual toggles
  isEnabled: boolean;
  showSkeleton: boolean;
  showMeasurements: boolean;

  // Actions
  toggleTracking: () => void;
  enableTracking: () => void;
  disableTracking: () => void;
  toggleSkeleton: () => void;
  toggleMeasurements: () => void;
  processFrame: (video: HTMLVideoElement) => Promise<void>;
  pipelineRef: React.MutableRefObject<PoseTrackingPipeline | null>;
}

export function usePoseTracking(options: UsePoseTrackingOptions = {}): UsePoseTrackingReturn {
  const { autoStart = true, targetFps = 30 } = options;

  const pipelineRef = useRef<PoseTrackingPipeline | null>(null);

  const [state, setState] = useState<PoseTrackingState>({
    isReady: false,
    isTracking: false,
    activeDelegate: null,
    fps: 0,
    latencyMs: 0,
    hasBody: false,
    error: null,
  });

  const [landmarks, setLandmarks] = useState<NormalizedLandmark[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurements | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(autoStart);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [showMeasurements, setShowMeasurements] = useState<boolean>(true);

  // Initialize pipeline on mount
  useEffect(() => {
    const pipeline = new PoseTrackingPipeline();
    pipelineRef.current = pipeline;

    const unsubResult = pipeline.onResult(
      (result: PoseDetectionResult, meas: BodyMeasurements) => {
        setLandmarks(result.landmarks);
        setMeasurements(meas);
      }
    );

    const unsubState = pipeline.onStateChange((newState: PoseTrackingState) => {
      setState(newState);
    });

    const unsubError = pipeline.onError((err: Error) => {
      setState((prev) => ({ ...prev, error: err.message }));
    });

    pipeline
      .initialize({ targetFps })
      .then(() => {
        if (autoStart) {
          pipeline.start();
        }
      })
      .catch((initErr) => {
        setState((prev) => ({
          ...prev,
          error: initErr instanceof Error ? initErr.message : String(initErr),
        }));
      });

    return () => {
      unsubResult();
      unsubState();
      unsubError();
      pipeline.dispose();
      pipelineRef.current = null;
    };
  }, [autoStart, targetFps]);

  const enableTracking = useCallback(() => {
    setIsEnabled(true);
    pipelineRef.current?.start();
  }, []);

  const disableTracking = useCallback(() => {
    setIsEnabled(false);
    pipelineRef.current?.stop();
    setLandmarks([]);
    setMeasurements(null);
  }, []);

  const toggleTracking = useCallback(() => {
    if (isEnabled) {
      disableTracking();
    } else {
      enableTracking();
    }
  }, [isEnabled, enableTracking, disableTracking]);

  const toggleSkeleton = useCallback(() => {
    setShowSkeleton((prev) => !prev);
  }, []);

  const toggleMeasurements = useCallback(() => {
    setShowMeasurements((prev) => !prev);
  }, []);

  const processFrame = useCallback(
    async (video: HTMLVideoElement) => {
      if (!isEnabled || !pipelineRef.current) return;
      await pipelineRef.current.processFrame(video);
    },
    [isEnabled]
  );

  return {
    isReady: state.isReady,
    isTracking: state.isTracking && isEnabled,
    activeDelegate: state.activeDelegate,
    fps: state.fps,
    latencyMs: state.latencyMs,
    hasBody: state.hasBody,
    error: state.error,
    landmarks,
    measurements,
    isEnabled,
    showSkeleton,
    showMeasurements,
    toggleTracking,
    enableTracking,
    disableTracking,
    toggleSkeleton,
    toggleMeasurements,
    processFrame,
    pipelineRef,
  };
}
