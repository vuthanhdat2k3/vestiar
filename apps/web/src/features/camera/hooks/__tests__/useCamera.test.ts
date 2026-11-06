import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCamera } from '../useCamera';
import { cameraService } from '../../services/camera.service';

describe('useCamera hook', () => {
  beforeEach(() => {
    cameraService.stop();

    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      configurable: true,
      value: true,
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockImplementation((constraints: any) => {
          const requestedFacing =
            constraints?.video?.facingMode?.ideal ||
            constraints?.video?.facingMode ||
            'environment';
          const track = {
            kind: 'video',
            readyState: 'live',
            stop: vi.fn(),
            getSettings: vi.fn(() => ({
              width: 1280,
              height: 720,
              frameRate: 30,
              facingMode: requestedFacing,
            })),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          };
          const stream = {
            getTracks: () => [track],
            getVideoTracks: () => [track],
            getAudioTracks: () => [],
          } as unknown as MediaStream;
          return Promise.resolve(stream);
        }),
        enumerateDevices: vi.fn().mockResolvedValue([]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  });

  it('initializes with idle status and clean state', async () => {
    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useCamera());
      hookResult = result;
    });
    expect(hookResult.current.status).toBe('idle');
    expect(hookResult.current.stream).toBeNull();
    expect(hookResult.current.error).toBeNull();
    expect(hookResult.current.isSecureContext).toBe(true);
    expect(hookResult.current.isSupported).toBe(true);
  });

  it('starts camera stream when startCamera is called', async () => {
    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.status).toBe('running');
    expect(result.current.stream).not.toBeNull();
  });

  it('stops camera stream when stopCamera is called', async () => {
    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });
    expect(result.current.status).toBe('running');

    act(() => {
      result.current.stopCamera();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.stream).toBeNull();
  });

  it('switches camera from environment to user', async () => {
    const { result } = renderHook(() => useCamera({ defaultFacingMode: 'environment' }));

    await act(async () => {
      await result.current.startCamera();
    });

    await act(async () => {
      await result.current.switchCamera();
    });

    expect(result.current.facingMode).toBe('user');
  });

  it('stops camera tracks on unmount to prevent leaks', async () => {
    const { result, unmount } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });
    expect(result.current.status).toBe('running');

    unmount();
    expect(cameraService.getStatus()).toBe('idle');
  });
});
