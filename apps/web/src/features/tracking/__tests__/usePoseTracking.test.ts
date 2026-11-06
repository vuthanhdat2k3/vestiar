import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePoseTracking } from '../hooks/usePoseTracking';

vi.mock('@vestiar/tryon-engine', () => {
  class MockPipeline {
    private stateCb?: Function;

    initialize = vi.fn().mockResolvedValue(undefined);
    start = vi.fn(() => {
      this.stateCb?.({
        isReady: true,
        isTracking: true,
        activeDelegate: 'GPU',
        fps: 30,
        latencyMs: 16,
        hasBody: true,
        error: null,
      });
    });
    stop = vi.fn(() => {
      this.stateCb?.({
        isReady: true,
        isTracking: false,
        activeDelegate: 'GPU',
        fps: 0,
        latencyMs: 0,
        hasBody: false,
        error: null,
      });
    });
    processFrame = vi.fn().mockResolvedValue(undefined);
    dispose = vi.fn();
    onResult = vi.fn(() => () => {});
    onStateChange = vi.fn((cb: Function) => {
      this.stateCb = cb;
      return () => {};
    });
    onError = vi.fn(() => () => {});
  }

  return {
    PoseTrackingPipeline: MockPipeline,
    extractBodyMeasurements: vi.fn(),
  };
});

describe('usePoseTracking hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default settings', async () => {
    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => usePoseTracking({ autoStart: false }));
      hookResult = result;
    });

    expect(hookResult.current.isEnabled).toBe(false);
    expect(hookResult.current.showSkeleton).toBe(true);
    expect(hookResult.current.showMeasurements).toBe(true);
  });

  it('enables and disables tracking via user actions', async () => {
    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => usePoseTracking({ autoStart: false }));
      hookResult = result;
    });

    act(() => {
      hookResult.current.enableTracking();
    });
    expect(hookResult.current.isEnabled).toBe(true);

    act(() => {
      hookResult.current.disableTracking();
    });
    expect(hookResult.current.isEnabled).toBe(false);
  });

  it('toggles skeleton and measurements visibility', async () => {
    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => usePoseTracking());
      hookResult = result;
    });

    expect(hookResult.current.showSkeleton).toBe(true);
    act(() => {
      hookResult.current.toggleSkeleton();
    });
    expect(hookResult.current.showSkeleton).toBe(false);

    expect(hookResult.current.showMeasurements).toBe(true);
    act(() => {
      hookResult.current.toggleMeasurements();
    });
    expect(hookResult.current.showMeasurements).toBe(false);
  });
});
