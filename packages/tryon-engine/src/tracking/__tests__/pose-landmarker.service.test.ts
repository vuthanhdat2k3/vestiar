import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PoseLandmarkerService } from '../pose-landmarker.service';

const mockLandmarks = [
  new Array(33).fill(0).map(() => ({
    x: 0.5,
    y: 0.5,
    z: 0.0,
    visibility: 0.9,
  })),
];

const mockLandmarkerInstance = {
  detectForVideo: vi.fn((_video: any, _timestamp: number) => ({
    landmarks: mockLandmarks,
    worldLandmarks: mockLandmarks,
  })),
  close: vi.fn(),
};

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn().mockResolvedValue({}),
  },
  PoseLandmarker: {
    createFromOptions: vi.fn().mockImplementation((_wasm, options) => {
      if (options?.baseOptions?.delegate === 'FORCE_GPU_FAIL') {
        throw new Error('WebGL Context Lost / Not Supported');
      }
      return Promise.resolve(mockLandmarkerInstance);
    }),
  },
}));

function createMockVideo(readyState = 4, videoWidth = 1280, videoHeight = 720, paused = false): HTMLVideoElement {
  return {
    readyState,
    videoWidth,
    videoHeight,
    paused,
  } as unknown as HTMLVideoElement;
}

describe('PoseLandmarkerService', () => {
  let service: PoseLandmarkerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PoseLandmarkerService();
  });

  it('initializes successfully with GPU delegate by default', async () => {
    await service.initialize({ delegate: 'GPU' });
    expect(service.getIsReady()).toBe(true);
    expect(service.getActiveDelegate()).toBe('GPU');
  });

  it('falls back to CPU delegate when GPU initialization throws an error', async () => {
    const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
    (PoseLandmarker.createFromOptions as any).mockImplementationOnce(() => {
      throw new Error('WebGL unavailable');
    });

    await service.initialize({ delegate: 'GPU' });
    expect(service.getIsReady()).toBe(true);
    expect(service.getActiveDelegate()).toBe('CPU');
  });

  it('detects landmarks from video frame and returns structured result', async () => {
    await service.initialize();
    const video = createMockVideo();

    const result = service.detectForVideo(video, 100);
    expect(result).not.toBeNull();
    expect(result?.landmarks).toHaveLength(33);
    expect(result?.hasBody).toBe(true);
    expect(result?.inferenceLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result?.timestampMs).toBe(100);
  });

  it('enforces monotonic increasing timestamps to satisfy MediaPipe requirements', async () => {
    await service.initialize();
    const video = createMockVideo();

    const r1 = service.detectForVideo(video, 1000);
    expect(r1?.timestampMs).toBe(1000);

    // Call again with non-increasing timestamp (same or earlier)
    const r2 = service.detectForVideo(video, 1000);
    expect(r2?.timestampMs).toBe(1001);

    const r3 = service.detectForVideo(video, 500);
    expect(r3?.timestampMs).toBe(1002);
  });

  it('rejects unready, paused, or zero-dimension video elements', async () => {
    await service.initialize();

    const notReadyVideo = createMockVideo(1, 1280, 720); // readyState < 2
    expect(service.detectForVideo(notReadyVideo)).toBeNull();

    const zeroDimensionVideo = createMockVideo(4, 0, 0);
    expect(service.detectForVideo(zeroDimensionVideo)).toBeNull();

    const pausedVideo = createMockVideo(4, 1280, 720, true);
    expect(service.detectForVideo(pausedVideo)).toBeNull();
  });

  it('disposes underlying landmarker and resets internal state', async () => {
    await service.initialize();
    expect(service.getIsReady()).toBe(true);

    service.dispose();
    expect(mockLandmarkerInstance.close).toHaveBeenCalledTimes(1);
    expect(service.getIsReady()).toBe(false);
    expect(service.getActiveDelegate()).toBeNull();
  });
});
