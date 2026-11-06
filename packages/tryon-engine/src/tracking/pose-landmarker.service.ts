import {
  FilesetResolver,
  PoseLandmarker,
} from '@mediapipe/tasks-vision';
import {
  NormalizedLandmark,
  PoseDetectionResult,
  PoseLandmarkerConfig,
} from './types';

const DEFAULT_LOCAL_WASM = '/wasm';
const CDN_WASM_FALLBACK = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const DEFAULT_LOCAL_MODEL = '/models/pose_landmarker_lite.task';
const CDN_MODEL_FALLBACK =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

export class PoseLandmarkerService {
  private landmarker: PoseLandmarker | null = null;
  private isInitializing = false;
  private isReady = false;
  private activeDelegate: 'GPU' | 'CPU' | null = null;
  private lastTimestampMs = -1;

  public getIsReady(): boolean {
    return this.isReady;
  }

  public getActiveDelegate(): 'GPU' | 'CPU' | null {
    return this.activeDelegate;
  }

  /**
   * Initializes MediaPipe Pose Landmarker in VIDEO mode.
   * Attempts GPU delegate first, with automatic CPU fallback.
   */
  public async initialize(config: PoseLandmarkerConfig = {}): Promise<void> {
    if (this.isReady) return;
    if (this.isInitializing) {
      // Wait until ongoing initialization finishes
      while (this.isInitializing) {
        await new Promise((r) => setTimeout(r, 50));
      }
      return;
    }

    this.isInitializing = true;

    const requestedDelegate = config.delegate || 'GPU';

    try {
      // 1. Resolve WASM fileset
      let visionWasm;
      try {
        const localWasm = config.wasmPath || DEFAULT_LOCAL_WASM;
        visionWasm = await FilesetResolver.forVisionTasks(localWasm);
      } catch (wasmErr) {
        console.warn('VestiAR: Local WASM load failed, falling back to CDN:', wasmErr);
        visionWasm = await FilesetResolver.forVisionTasks(CDN_WASM_FALLBACK);
      }

      // 2. Prepare Model Asset Path
      const modelAssetPath = config.modelAssetPath || DEFAULT_LOCAL_MODEL;

      // 3. Attempt initialization with requested delegate (default GPU)
      try {
        this.landmarker = await this.createLandmarkerInstance(
          visionWasm,
          modelAssetPath,
          requestedDelegate,
          config
        );
        this.activeDelegate = requestedDelegate;
      } catch (gpuErr) {
        if (requestedDelegate === 'GPU') {
          console.warn(
            'VestiAR: GPU delegate initialization failed. Falling back to CPU delegate:',
            gpuErr
          );
          // Fallback to CPU delegate
          this.landmarker = await this.createLandmarkerInstance(
            visionWasm,
            modelAssetPath,
            'CPU',
            config
          );
          this.activeDelegate = 'CPU';
        } else {
          throw gpuErr;
        }
      }

      this.isReady = true;
    } catch (err) {
      this.isReady = false;
      this.activeDelegate = null;
      throw new Error(
        `Failed to initialize MediaPipe PoseLandmarker: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      this.isInitializing = false;
    }
  }

  private async createLandmarkerInstance(
    visionWasm: any,
    modelPath: string,
    delegate: 'GPU' | 'CPU',
    config: PoseLandmarkerConfig
  ): Promise<PoseLandmarker> {
    const baseOptions = {
      modelAssetPath: modelPath,
      delegate,
    };

    try {
      return await PoseLandmarker.createFromOptions(visionWasm, {
        baseOptions,
        runningMode: 'VIDEO',
        numPoses: config.numPoses || 1,
        minPoseDetectionConfidence: config.minPoseDetectionConfidence ?? 0.5,
        minPosePresenceConfidence: config.minPosePresenceConfidence ?? 0.5,
        minTrackingConfidence: config.minTrackingConfidence ?? 0.5,
        outputSegmentationMasks: config.outputSegmentationMasks ?? false,
      });
    } catch (createErr) {
      const errMsg = String(createErr).toLowerCase();
      const isFetchFailure =
        errMsg.includes('fetch') ||
        errMsg.includes('404') ||
        errMsg.includes('network') ||
        errMsg.includes('failed to load');
      const isGpuFailure =
        errMsg.includes('webgl') ||
        errMsg.includes('gpu') ||
        errMsg.includes('gl_') ||
        errMsg.includes('context');

      // If local model fetch failed, try CDN model fallback (unless it was a GPU context error)
      if (modelPath !== CDN_MODEL_FALLBACK && isFetchFailure && !isGpuFailure) {
        console.warn('VestiAR: Local model load failed, retrying with CDN fallback:', createErr);
        return await PoseLandmarker.createFromOptions(visionWasm, {
          baseOptions: {
            modelAssetPath: CDN_MODEL_FALLBACK,
            delegate,
          },
          runningMode: 'VIDEO',
          numPoses: config.numPoses || 1,
          minPoseDetectionConfidence: config.minPoseDetectionConfidence ?? 0.5,
          minPosePresenceConfidence: config.minPosePresenceConfidence ?? 0.5,
          minTrackingConfidence: config.minTrackingConfidence ?? 0.5,
          outputSegmentationMasks: config.outputSegmentationMasks ?? false,
        });
      }
      throw createErr;
    }
  }

  /**
   * Process a single video frame for pose landmarker detection.
   * Ensures monotonically increasing timestamps as required by MediaPipe.
   */
  public detectForVideo(
    video: HTMLVideoElement,
    timestampMs?: number
  ): PoseDetectionResult | null {
    if (!this.isReady || !this.landmarker) return null;
    if (
      video.readyState < 2 ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0 ||
      video.paused
    ) {
      return null;
    }

    // MediaPipe requires strictly monotonic increasing timestamps
    let targetTime = timestampMs ?? performance.now();
    if (targetTime <= this.lastTimestampMs) {
      targetTime = this.lastTimestampMs + 1;
    }
    this.lastTimestampMs = targetTime;

    const startTime = performance.now();
    try {
      const result = this.landmarker.detectForVideo(video, targetTime);
      const inferenceLatencyMs = performance.now() - startTime;

      const rawLandmarks = result.landmarks && result.landmarks[0] ? result.landmarks[0] : [];
      const worldLandmarks =
        result.worldLandmarks && result.worldLandmarks[0] ? result.worldLandmarks[0] : undefined;

      const landmarks: NormalizedLandmark[] = rawLandmarks.map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility,
        presence: (lm as { presence?: number }).presence,
      }));

      return {
        landmarks,
        worldLandmarks,
        timestampMs: targetTime,
        inferenceLatencyMs,
        hasBody: landmarks.length > 0,
      };
    } catch (err) {
      console.error('VestiAR: PoseLandmarker detectForVideo error:', err);
      return null;
    }
  }

  /**
   * Disposes of the underlying MediaPipe landmarker and releases WebGL/WASM resources.
   */
  public dispose(): void {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (err) {
        console.warn('VestiAR: Error closing PoseLandmarker instance:', err);
      }
      this.landmarker = null;
    }
    this.isReady = false;
    this.activeDelegate = null;
    this.lastTimestampMs = -1;
  }
}

export const poseLandmarkerService = new PoseLandmarkerService();
