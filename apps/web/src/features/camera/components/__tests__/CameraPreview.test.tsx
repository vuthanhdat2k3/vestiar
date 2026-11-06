import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CameraPreview } from '../CameraPreview';
import { cameraService } from '../../services/camera.service';

function createMockStream() {
  const track = {
    kind: 'video',
    readyState: 'live',
    stop: vi.fn(),
    getSettings: () => ({ width: 1280, height: 720, frameRate: 30, facingMode: 'environment' }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  return {
    getTracks: () => [track],
    getVideoTracks: () => [track],
    getAudioTracks: () => [],
  } as unknown as MediaStream;
}

describe('CameraPreview component', () => {
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
        getUserMedia: vi.fn().mockResolvedValue(createMockStream()),
        enumerateDevices: vi.fn().mockResolvedValue([]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  });

  it('renders the VestiAR brand and initial standby screen', async () => {
    await act(async () => {
      render(<CameraPreview autoStart={false} />);
    });

    expect(screen.getByText('VestiAR')).toBeInTheDocument();
    expect(screen.getByText(/Virtual Fitting Room Camera/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start camera/i })).toBeInTheDocument();
  });

  it('starts the camera and reveals video on Start click', async () => {
    await act(async () => {
      render(<CameraPreview autoStart={false} />);
    });

    const startBtn = screen.getByRole('button', { name: /start camera/i });
    await act(async () => {
      fireEvent.click(startBtn);
    });

    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('renders Safari guide modal when help button is clicked', async () => {
    await act(async () => {
      render(<CameraPreview autoStart={false} />);
    });

    const helpBtn = screen.getByRole('button', { name: /help/i });
    await act(async () => {
      fireEvent.click(helpBtn);
    });

    expect(screen.getByText(/iPhone Safari Camera Guide/i)).toBeInTheDocument();
    expect(screen.getByText(/Same Wi-Fi Network:/i)).toBeInTheDocument();

    const gotItBtn = screen.getByRole('button', { name: /got it/i });
    await act(async () => {
      fireEvent.click(gotItBtn);
    });
    expect(screen.queryByText(/iPhone Safari Camera Guide/i)).not.toBeInTheDocument();
  });
});
