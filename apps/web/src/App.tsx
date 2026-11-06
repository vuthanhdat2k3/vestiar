import React, { useRef } from 'react';
import { CameraPreview } from './features/camera';

export const App: React.FC = () => {
  const frameCountRef = useRef<number>(0);

  // Hook point for future MediaPipe Pose Landmarker or Image Segmenter
  const handleFrame = (video: HTMLVideoElement) => {
    frameCountRef.current++;
    // Future MediaPipe PoseLandmarker will process frames here
    if (frameCountRef.current % 300 === 0 && process.env.NODE_ENV === 'development') {
      console.debug('VestiAR: Frame ingested for MediaPipe pipeline', {
        width: video.videoWidth,
        height: video.videoHeight,
        frames: frameCountRef.current,
      });
    }
  };

  return (
    <div className="w-full h-full relative">
      <CameraPreview
        autoStart={false}
        defaultFacingMode="environment"
        onFrame={handleFrame}
      />
    </div>
  );
};

export default App;
