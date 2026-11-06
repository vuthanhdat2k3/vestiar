import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackingOverlay } from '../components/TrackingOverlay';
import { NormalizedLandmark } from '@vestiar/tryon-engine';

describe('TrackingOverlay component', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      closePath: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillText: vi.fn(),
      setLineDash: vi.fn(),
    };

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
  });

  it('renders canvas element cleanly with mirrored front-camera transform', () => {
    const { container } = render(
      <TrackingOverlay
        landmarks={[]}
        measurements={null}
        showSkeleton={true}
        showMeasurements={true}
        facingMode="user"
        fitMode="cover"
        videoElement={null}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveStyle('transform: scaleX(-1)');
  });

  it('renders unmirrored for rear camera (facingMode = environment)', () => {
    const { container } = render(
      <TrackingOverlay
        landmarks={[]}
        measurements={null}
        showSkeleton={true}
        showMeasurements={true}
        facingMode="environment"
        fitMode="cover"
        videoElement={null}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveStyle('transform: none');
  });

  it('draws landmarks and skeleton when valid 33 landmarks are provided', () => {
    const mockLandmarks: NormalizedLandmark[] = new Array(33).fill(0).map(() => ({
      x: 0.5,
      y: 0.5,
      z: 0.0,
      visibility: 0.9,
    }));

    render(
      <TrackingOverlay
        landmarks={mockLandmarks}
        measurements={null}
        showSkeleton={true}
        showMeasurements={false}
        facingMode="environment"
        fitMode="cover"
        videoElement={null}
      />
    );

    expect(mockCtx.clearRect).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled(); // drew landmark circles
    expect(mockCtx.stroke).toHaveBeenCalled();
  });
});
