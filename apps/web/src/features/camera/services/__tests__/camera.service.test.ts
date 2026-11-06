import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CameraService } from '../camera.service';

function createMockTrack(label: string = 'Camera Track', facingMode: string = 'environment') {
  const listeners: Record<string, Function[]> = {};
  return {
    label,
    kind: 'video',
    readyState: 'live',
    stop: vi.fn(),
    getSettings: vi.fn(() => ({
      width: 1280,
      height: 720,
      frameRate: 30,
      facingMode,
      deviceId: 'mock-device-id',
    })),
    addEventListener: vi.fn((event: string, fn: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    }),
    removeEventListener: vi.fn((event: string, fn: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((cb) => cb !== fn);
      }
    }),
    _triggerEnded: () => {
      if (listeners['ended']) {
        listeners['ended'].forEach((fn) => fn());
      }
    },
  };
}

function createMockStream(tracks: any[] = [createMockTrack()]) {
  return {
    getTracks: vi.fn(() => tracks),
    getVideoTracks: vi.fn(() => tracks),
    getAudioTracks: vi.fn(() => []),
  } as unknown as MediaStream;
}

describe('CameraService', () => {
  let service: CameraService;
  let mockTrack: ReturnType<typeof createMockTrack>;
  let mockStream: MediaStream;

  beforeEach(() => {
    mockTrack = createMockTrack();
    mockStream = createMockStream([mockTrack]);

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
          const track = createMockTrack('Camera Track', requestedFacing);
          mockTrack = track;
          mockStream = createMockStream([track]);
          return Promise.resolve(mockStream);
        }),
        enumerateDevices: vi.fn().mockResolvedValue([
          {
            deviceId: 'dev-back',
            kind: 'videoinput',
            label: 'Back Camera',
          },
          {
            deviceId: 'dev-front',
            kind: 'videoinput',
            label: 'Front Camera',
          },
        ]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    service = new CameraService();
  });

  afterEach(() => {
    service.destroy();
  });

  it('reports supported in a secure environment with mediaDevices', () => {
    expect(service.isSupported()).toBe(true);
    expect(service.isSecureContext()).toBe(true);
  });

  it('enumerates video devices and infers facing modes', async () => {
    const devices = await service.enumerateDevices();
    expect(devices).toHaveLength(2);
    expect(devices[0].facingMode).toBe('environment');
    expect(devices[1].facingMode).toBe('user');
  });

  it('starts camera stream and notifies listeners', async () => {
    const statusSpy = vi.fn();
    const streamSpy = vi.fn();

    service.onStatusChange(statusSpy);
    service.onStreamChange(streamSpy);

    const stream = await service.start({ facingMode: 'environment' });

    expect(stream).toBe(mockStream);
    expect(service.getStatus()).toBe('running');
    expect(statusSpy).toHaveBeenCalledWith('starting');
    expect(statusSpy).toHaveBeenCalledWith('running');
    expect(streamSpy).toHaveBeenCalledWith(mockStream);
  });

  it('stops camera stream and releases tracks', async () => {
    await service.start();
    expect(service.getStatus()).toBe('running');

    service.stop();
    expect(mockTrack.stop).toHaveBeenCalled();
    expect(service.getStatus()).toBe('idle');
    expect(service.getCurrentStream()).toBeNull();
  });

  it('switches between rear and front cameras', async () => {
    await service.start({ facingMode: 'environment' });
    expect(service.getActiveFacingMode()).toBe('environment');

    await service.switchCamera();
    expect(service.getActiveFacingMode()).toBe('user');
  });

  it('restarts camera cleanly', async () => {
    await service.start({ facingMode: 'environment' });
    const restartStream = await service.restart();
    expect(restartStream).toBe(mockStream);
    expect(service.getStatus()).toBe('running');
  });

  it('handles permission denied error cleanly', async () => {
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(
      new DOMException('Permission denied', 'NotAllowedError')
    );

    const errorSpy = vi.fn();
    service.onError(errorSpy);

    await expect(service.start()).rejects.toMatchObject({
      type: 'NOT_ALLOWED',
    });
    expect(service.getStatus()).toBe('error');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('handles track disconnection / ended event', async () => {
    await service.start();
    expect(service.getStatus()).toBe('running');

    mockTrack._triggerEnded();

    expect(service.getStatus()).toBe('error');
    expect(service.getCurrentStream()).toBeNull();
  });

  it('falls back to relaxed constraints if preferred constraints fail', async () => {
    // First call rejects with OverconstrainedError, second succeeds
    (navigator.mediaDevices.getUserMedia as any)
      .mockRejectedValueOnce(new DOMException('Overconstrained', 'OverconstrainedError'))
      .mockResolvedValueOnce(mockStream);

    const stream = await service.start({ facingMode: 'environment' });
    expect(stream).toBe(mockStream);
    expect(service.getStatus()).toBe('running');
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
  });
});
