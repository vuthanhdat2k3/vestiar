import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PoseTrackingPipeline } from '../pose-tracking.pipeline';
import { PoseLandmarkerService } from '../pose-landmarker.service';

function createMockVideo(): HTMLVideoElement {
  return {
    readyState: 4,
    videoWidth: 1280,
    videoHeight: 720,
    paused: false,
  } as unknown as HTMLVideoElement;
}

function createMockService(): PoseLandmarkerService {
  const mockService = {
    getIsReady: vi.fn(() => true),
    getActiveDelegate: vi.fn(() => 'GPU' as const),
    initialize: vi.fn().mockResolvedValue(undefined),
    detectForVideo: vi.fn((_video: HTMLVideoElement, timestamp: number) => ({
      landmarks: new Array(33).fill({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }),
      timestampMs: timestamp,
      inferenceLatencyMs: 15,
      hasBody: true,
    })),
    dispose: vi.fn(),
  };

  return mockService as unknown as PoseLandmarkerService;
}

describe('PoseTrackingPipeline', () => {
  let mockService: ReturnType<typeof createMockService>;
  let pipeline: PoseTrackingPipeline;
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockService();
    pipeline = new PoseTrackingPipeline(mockService);
    mockVideo = createMockVideo();
  });

  afterEach(() => {
    pipeline.dispose();
  });

  it('initializes and reports initial idle state', async () => {
    await pipeline.initialize({ targetFps: 30 });
    const state = pipeline.getState();

    expect(state.isReady).toBe(true);
    expect(state.isTracking).toBe(false);
    expect(state.activeDelegate).toBe('GPU');
  });

  it('starts and stops tracking loop cleanly', async () => {
    await pipeline.initialize();
    const stateSpy = vi.fn();
    pipeline.onStateChange(stateSpy);

    pipeline.start(mockVideo);
    expect(pipeline.getState().isTracking).toBe(true);

    pipeline.stop();
    expect(pipeline.getState().isTracking).toBe(false);
  });

  it('processes frame, extracts measurements, and notifies result subscribers', async () => {
    await pipeline.initialize({ targetFps: 60 });
    const resultSpy = vi.fn();
    pipeline.onResult(resultSpy);

    const result = await pipeline.processFrame(mockVideo);
    expect(result).not.toBeNull();
    expect(result?.landmarks).toHaveLength(33);
    expect(resultSpy).toHaveBeenCalledTimes(1);

    const [receivedResult, receivedMeasurements] = resultSpy.mock.calls[0];
    expect(receivedResult.hasBody).toBe(true);
    expect(receivedMeasurements.shoulderCenter).not.toBeNull();
  });

  it('throttles inference rate according to targetFps', async () => {
    await pipeline.initialize({ targetFps: 10 }); // 100ms per frame
    pipeline.setVideoSource(mockVideo);

    const r1 = await pipeline.processFrame(mockVideo);
    expect(r1).not.toBeNull();

    // Immediately call again without time passing -> should be skipped
    const r2 = await pipeline.processFrame(mockVideo);
    expect(r2).toBeNull();
    expect(mockService.detectForVideo).toHaveBeenCalledTimes(1);
  });

  it('supports camera stream / video element replacement via setVideoSource', async () => {
    await pipeline.initialize();
    const video1 = createMockVideo();
    const video2 = createMockVideo();

    pipeline.setVideoSource(video1);
    await pipeline.processFrame(video1);

    pipeline.setVideoSource(video2);
    await pipeline.processFrame(video2);

    expect(mockService.detectForVideo).toHaveBeenCalledWith(video1, expect.any(Number));
  });

  it('disposes resources and clears all event listeners', async () => {
    await pipeline.initialize();
    pipeline.start(mockVideo);

    pipeline.dispose();
    expect(pipeline.getState().isTracking).toBe(false);
    expect(mockService.dispose).toHaveBeenCalledTimes(1);
  });
});
