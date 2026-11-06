import React from 'react';
import { CameraPreview } from './features/camera';
import {
  TrackingControls,
  TrackingOverlay,
  usePoseTracking,
} from './features/tracking';

export const App: React.FC = () => {
  const tracking = usePoseTracking({
    autoStart: true,
    targetFps: 30,
  });

  return (
    <div className="w-full h-full relative">
      <CameraPreview
        autoStart={false}
        defaultFacingMode="environment"
        onFrame={(video) => {
          tracking.processFrame(video);
        }}
        headerSlot={
          <TrackingControls
            isReady={tracking.isReady}
            isTracking={tracking.isTracking}
            isEnabled={tracking.isEnabled}
            hasBody={tracking.hasBody}
            activeDelegate={tracking.activeDelegate}
            fps={tracking.fps}
            latencyMs={tracking.latencyMs}
            showSkeleton={tracking.showSkeleton}
            showMeasurements={tracking.showMeasurements}
            onToggleTracking={tracking.toggleTracking}
            onToggleSkeleton={tracking.toggleSkeleton}
            onToggleMeasurements={tracking.toggleMeasurements}
          />
        }
      >
        {({ videoElement, fitMode, facingMode }) =>
          tracking.isEnabled && (
            <TrackingOverlay
              landmarks={tracking.landmarks}
              measurements={tracking.measurements}
              showSkeleton={tracking.showSkeleton}
              showMeasurements={tracking.showMeasurements}
              facingMode={facingMode}
              fitMode={fitMode}
              videoElement={videoElement}
            />
          )
        }
      </CameraPreview>
    </div>
  );
};

export default App;
