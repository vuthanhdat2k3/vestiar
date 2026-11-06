import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TrackingControls } from '../components/TrackingControls';

describe('TrackingControls component', () => {
  it('renders Tracking Off status when isEnabled is false', () => {
    render(
      <TrackingControls
        isReady={true}
        isTracking={false}
        isEnabled={false}
        hasBody={false}
        activeDelegate="GPU"
        fps={0}
        latencyMs={0}
        showSkeleton={true}
        showMeasurements={true}
        onToggleTracking={vi.fn()}
        onToggleSkeleton={vi.fn()}
        onToggleMeasurements={vi.fn()}
      />
    );

    expect(screen.getAllByText('Tracking Off')).toHaveLength(2);
  });

  it('renders Pose Tracked, latency, and FPS when active and tracking body', () => {
    render(
      <TrackingControls
        isReady={true}
        isTracking={true}
        isEnabled={true}
        hasBody={true}
        activeDelegate="GPU"
        fps={28}
        latencyMs={18}
        showSkeleton={true}
        showMeasurements={true}
        onToggleTracking={vi.fn()}
        onToggleSkeleton={vi.fn()}
        onToggleMeasurements={vi.fn()}
      />
    );

    expect(screen.getByText('Pose Tracked')).toBeInTheDocument();
    expect(screen.getByText('18ms')).toBeInTheDocument();
    expect(screen.getByText('28 FPS')).toBeInTheDocument();
    expect(screen.getByText('GPU')).toBeInTheDocument();
  });

  it('triggers toggle callbacks on button clicks', () => {
    const handleToggleTracking = vi.fn();
    const handleToggleSkeleton = vi.fn();
    const handleToggleMeasurements = vi.fn();

    render(
      <TrackingControls
        isReady={true}
        isTracking={true}
        isEnabled={true}
        hasBody={true}
        activeDelegate="GPU"
        fps={30}
        latencyMs={15}
        showSkeleton={true}
        showMeasurements={true}
        onToggleTracking={handleToggleTracking}
        onToggleSkeleton={handleToggleSkeleton}
        onToggleMeasurements={handleToggleMeasurements}
      />
    );

    const trackingBtn = screen.getByRole('button', { name: /toggle pose tracking/i });
    fireEvent.click(trackingBtn);
    expect(handleToggleTracking).toHaveBeenCalledTimes(1);

    const skeletonBtn = screen.getByRole('button', { name: /toggle skeleton display/i });
    fireEvent.click(skeletonBtn);
    expect(handleToggleSkeleton).toHaveBeenCalledTimes(1);

    const measBtn = screen.getByRole('button', { name: /toggle body measurements/i });
    fireEvent.click(measBtn);
    expect(handleToggleMeasurements).toHaveBeenCalledTimes(1);
  });
});
