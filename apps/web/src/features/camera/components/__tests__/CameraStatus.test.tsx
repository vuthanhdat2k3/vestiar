import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CameraStatus } from '../CameraStatus';

describe('CameraStatus component', () => {
  it('renders LIVE indicator when status is running', () => {
    render(
      <CameraStatus
        status="running"
        resolution={{ width: 1280, height: 720 }}
        fps={30}
        facingMode="environment"
        isSecureContext={true}
      />
    );

    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByText(/1280 × 720/)).toBeInTheDocument();
    expect(screen.getByText(/30 FPS/)).toBeInTheDocument();
    expect(screen.getByText(/Rear Lens/)).toBeInTheDocument();
    expect(screen.getByText('HTTPS')).toBeInTheDocument();
  });

  it('renders STANDBY indicator when status is idle', () => {
    render(
      <CameraStatus
        status="idle"
        resolution={null}
        fps={0}
        facingMode="environment"
        isSecureContext={true}
      />
    );

    expect(screen.getByText('STANDBY')).toBeInTheDocument();
  });

  it('renders HTTP Insecure warning badge when isSecureContext is false', () => {
    render(
      <CameraStatus
        status="idle"
        resolution={null}
        fps={0}
        facingMode="environment"
        isSecureContext={false}
      />
    );

    expect(screen.getByText('HTTP Insecure')).toBeInTheDocument();
  });
});
