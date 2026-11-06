import { extractBodyMeasurements } from './measurements';
import { poseLandmarkerService, PoseLandmarkerService } from './pose-landmarker.service';
import {
  BodyMeasurements,
  PoseDetectionResult,
  PoseLandmarkerConfig,
  PoseTrackingState,
} from './types';

export interface PipelineOptions extends PoseLandmarkerConfig {
  targetFps?: number; // Target inference FPS (e.g. 25-30)
}

type ResultListener = (result: PoseDetectionResult, measurements: BodyMeasurements) => void;
type StateListener = (state: PoseTrackingState) => void;
type ErrorListener = (error: Error) => void;

/**
 * Real-time Pose Tracking Pipeline.
 * Orchestrates video frame intake, concurrency locking, inference throttling, and measurement extraction.
 */
export class PoseTrackingPipeline {
  private service: PoseLandmarkerService;
  private isProcessing = false;
  private isTracking = false;
  private targetFps = 30;
  private lastInferenceTime = 0;
  private animFrameId: number | null = null;
  private videoElement: HTMLVideoElement | null = null;

  // FPS calculation
  private fpsTimestamps: number[] = [];
  private currentFps = 0;
  private currentLatency = 0;
  private hasDetectedBody = false;

  private resultListeners = new Set<ResultListener>();
  private stateListeners = new Set<StateListener>();
  private errorListeners = new Set<ErrorListener>();

  constructor(service: PoseLandmarkerService = poseLandmarkerService) {
    this.service = service;
  }

  public getState(): PoseTrackingState {
    return {
      isReady: this.service.getIsReady(),
      isTracking: this.isTracking,
      activeDelegate: this.service.getActiveDelegate(),
      fps: this.currentFps,
      latencyMs: this.currentLatency,
      hasBody: this.hasDetectedBody,
      error: null,
    };
  }

  /**
   * Initializes the pipeline and underlying pose service.
   */
  public async initialize(options: PipelineOptions = {}): Promise<void> {
    if (options.targetFps && options.targetFps > 0) {
      this.targetFps = options.targetFps;
    }
    await this.service.initialize(options);
    this.notifyState();
  }

  /**
   * Sets or switches the target HTMLVideoElement.
   */
  public setVideoSource(video: HTMLVideoElement | null): void {
    this.videoElement = video;
  }

  /**
   * Starts tracking on the attached or provided video element.
   */
  public start(video?: HTMLVideoElement): void {
    if (video) {
      this.videoElement = video;
    }
    if (this.isTracking) return;

    this.isTracking = true;
    this.fpsTimestamps = [];
    this.notifyState();
    this.scheduleNextFrame();
  }

  /**
   * Pauses/stops tracking loop without disposing the model.
   */
  public stop(): void {
    this.isTracking = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.currentFps = 0;
    this.hasDetectedBody = false;
    this.notifyState();
  }

  private scheduleNextFrame = (): void => {
    if (!this.isTracking) return;

    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      this.animFrameId = window.requestAnimationFrame(this.onAnimationFrame);
    }
  };

  private onAnimationFrame = async (): Promise<void> => {
    if (!this.isTracking) return;

    if (this.videoElement) {
      await this.processFrame(this.videoElement);
    }

    this.scheduleNextFrame();
  };

  /**
   * Processes a video frame with concurrency gating and rate throttling.
   */
  public async processFrame(video: HTMLVideoElement): Promise<PoseDetectionResult | null> {
    // 1. Guard against overlapping inference tasks
    if (this.isProcessing) {
      return null;
    }

    // 2. Throttle inference frequency if targetFps is specified
    const now = performance.now();
    const minFrameInterval = 1000 / this.targetFps;
    if (now - this.lastInferenceTime < minFrameInterval) {
      return null;
    }

    // 3. Verify video readiness
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0 || video.paused) {
      return null;
    }

    this.isProcessing = true;
    this.lastInferenceTime = now;

    try {
      const result = this.service.detectForVideo(video, now);

      if (result) {
        this.currentLatency = Math.round(result.inferenceLatencyMs);
        this.hasDetectedBody = result.hasBody;

        // Calculate CV processing FPS
        this.fpsTimestamps.push(now);
        while (this.fpsTimestamps.length > 0 && this.fpsTimestamps[0] <= now - 1000) {
          this.fpsTimestamps.shift();
        }
        this.currentFps = this.fpsTimestamps.length;

        // Extract body measurements and structural lines
        const measurements = extractBodyMeasurements(result.landmarks);

        // Notify subscribers
        this.notifyResult(result, measurements);
        this.notifyState();

        return result;
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      this.notifyError(errorObj);
    } finally {
      this.isProcessing = false;
    }

    return null;
  }

  // Event Subscription
  public onResult(listener: ResultListener): () => void {
    this.resultListeners.add(listener);
    return () => this.resultListeners.delete(listener);
  }

  public onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private notifyResult(result: PoseDetectionResult, measurements: BodyMeasurements): void {
    this.resultListeners.forEach((l) => l(result, measurements));
  }

  private notifyState(): void {
    const state = this.getState();
    this.stateListeners.forEach((l) => l(state));
  }

  private notifyError(err: Error): void {
    this.errorListeners.forEach((l) => l(err));
  }

  /**
   * Completely disposes of the pipeline and frees all computer vision memory.
   */
  public dispose(): void {
    this.stop();
    this.service.dispose();
    this.resultListeners.clear();
    this.stateListeners.clear();
    this.errorListeners.clear();
    this.videoElement = null;
  }
}
