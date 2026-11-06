import React, { useState, forwardRef } from 'react';
import { useCamera, UseCameraOptions } from '../hooks/useCamera';
import { CameraStatus as CameraStatusType, FacingMode } from '../types/camera.types';
import { CameraControls } from './CameraControls';
import { CameraStatus } from './CameraStatus';
import { QRCodeModal } from './QRCodeModal';
import {
  Camera,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Smartphone,
  HelpCircle,
  QrCode,
} from 'lucide-react';

export interface CameraPreviewRenderProps {
  videoElement: HTMLVideoElement | null;
  fitMode: 'cover' | 'contain';
  facingMode: FacingMode;
  status: CameraStatusType;
}

export interface CameraPreviewProps extends UseCameraOptions {
  className?: string;
  onVideoRefReady?: (video: HTMLVideoElement | null) => void;
  headerSlot?: React.ReactNode;
  children?: React.ReactNode | ((props: CameraPreviewRenderProps) => React.ReactNode);
}

export const CameraPreview = forwardRef<HTMLVideoElement, CameraPreviewProps>(
  (
    {
      className = '',
      autoStart = false,
      defaultFacingMode = 'environment',
      onFrame,
      onVideoRefReady,
      headerSlot,
      children,
    },
    forwardedRef
  ) => {
    const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
    const [showHelp, setShowHelp] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);

    const {
      status,
      error,
      facingMode,
      availableDevices,
      activeDeviceId,
      resolution,
      fps,
      isSecureContext,
      videoRef,
      startCamera,
      stopCamera,
      switchCamera,
      retry,
    } = useCamera({ autoStart, defaultFacingMode, onFrame });

    // Combine ref with forwardedRef if present
    const setVideoNode = (node: HTMLVideoElement | null) => {
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
      }
      if (onVideoRefReady) {
        onVideoRefReady(node);
      }
    };

    const handleSwitchCamera = () => {
      switchCamera();
    };

    const handleSelectDevice = (deviceId: string) => {
      startCamera({ deviceId });
    };

    return (
      <div
        className={`relative w-full h-full min-h-screen bg-[#070709] text-white flex flex-col justify-between overflow-hidden select-none ${className}`}
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {/* Top Bar: Brand, Status HUD, Help Button */}
        <header className="relative z-20 flex items-center justify-between px-4 py-3.5 sm:px-8 sm:py-5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-200 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <div>
              <span className="text-base font-semibold tracking-wider uppercase text-white">VestiAR</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-zinc-400 font-light">
                AI Fitting Studio
              </span>
            </div>
          </div>

          <CameraStatus
            status={status}
            resolution={resolution}
            fps={fps}
            facingMode={facingMode}
            isSecureContext={isSecureContext}
          />

          {headerSlot}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="w-9 h-9 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 flex items-center justify-center text-amber-400 hover:text-amber-300 transition-all"
              title="Quét mã QR mở trên iPhone"
              aria-label="QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowHelp((prev) => !prev)}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
              title="Camera Help & Safari Guide"
              aria-label="Help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Center Viewport: Video Stream & State Overlays */}
        <main className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
          {/* Active Video Element */}
          <video
            ref={setVideoNode}
            autoPlay
            playsInline
            muted
            aria-label="Live Camera Stream"
            style={{
              objectFit: fitMode,
              // Mirror front camera for natural selfie view; keep rear camera unmirrored
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            }}
            className={`w-full h-full transition-opacity duration-300 ${
              status === 'running' ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Custom Overlays (e.g. MediaPipe Tracking Overlay) */}
          {status === 'running' &&
            (typeof children === 'function'
              ? children({
                  videoElement: videoRef.current,
                  fitMode,
                  facingMode,
                  status,
                })
              : children)}

          {/* AR Fitting Reticles & Frame Guides (Visible when camera is active) */}
          {status === 'running' && (
            <div className="pointer-events-none absolute inset-6 sm:inset-12 flex flex-col justify-between border border-white/15 rounded-3xl z-10 transition-all">
              {/* Top Corners */}
              <div className="flex justify-between p-3">
                <div className="w-6 h-6 border-t-2 border-l-2 border-amber-400/80 rounded-tl-md" />
                <div className="w-6 h-6 border-t-2 border-r-2 border-amber-400/80 rounded-tr-md" />
              </div>
              {/* Subtle Body Alignment Marker */}
              <div className="self-center flex flex-col items-center opacity-40">
                <div className="w-px h-8 bg-white/50" />
                <div className="w-2 h-2 rounded-full border border-white/60 my-1" />
                <div className="w-px h-8 bg-white/50" />
              </div>
              {/* Bottom Corners */}
              <div className="flex justify-between p-3">
                <div className="w-6 h-6 border-b-2 border-l-2 border-amber-400/80 rounded-bl-md" />
                <div className="w-6 h-6 border-b-2 border-r-2 border-amber-400/80 rounded-br-md" />
              </div>
            </div>
          )}

          {/* State: Starting / Loading Spinner */}
          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-15">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
                <Camera className="w-6 h-6 text-amber-400 absolute" />
              </div>
              <p className="mt-4 text-sm font-medium tracking-wide text-zinc-300">
                Accessing iPhone Camera...
              </p>
              <p className="mt-1 text-xs text-zinc-500">Please tap "Allow" if Safari prompts</p>
            </div>
          )}

          {/* State: Idle / Standby Screen */}
          {status === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-15">
              <div className="w-20 h-20 rounded-3xl bg-zinc-900/90 border border-white/10 flex items-center justify-center shadow-2xl mb-6">
                <Smartphone className="w-9 h-9 text-amber-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                Virtual Fitting Room Camera
              </h2>
              <p className="mt-2 text-sm text-zinc-400 max-w-sm font-light leading-relaxed">
                Stream live high-definition video directly from your iPhone browser for AI garment fitting.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-7 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-black font-semibold text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2"
                >
                  <Camera className="w-4 h-4 fill-black" />
                  <span>Bật Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 text-white font-medium text-sm border border-white/15 transition-all flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>Quét Mã QR Bằng iPhone</span>
                </button>
              </div>
            </div>
          )}

          {/* State: Error Screen */}
          {status === 'error' && error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-15 bg-black/85 backdrop-blur-md">
              <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/30 flex items-center justify-center mb-5 text-rose-400 shadow-xl">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white">{error.message}</h3>
              <p className="mt-2 text-sm text-zinc-300 max-w-md font-light leading-relaxed bg-zinc-900/70 border border-white/10 p-4 rounded-xl">
                {error.userInstruction}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => retry()}
                  className="px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-medium text-sm transition-all flex items-center gap-2 shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => stopCamera()}
                  className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white text-sm transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Safari Help Drawer / Modal */}
          {showHelp && (
            <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-zinc-950 border border-white/15 rounded-3xl p-6 shadow-2xl text-left">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-amber-400" />
                    <h4 className="font-semibold text-white">iPhone Safari Camera Guide</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHelp(false)}
                    className="text-zinc-400 hover:text-white text-sm"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-4 space-y-3.5 text-xs text-zinc-300 leading-relaxed">
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                      1
                    </span>
                    <p>
                      <strong>Same Wi-Fi Network:</strong> Verify that your iPhone and development PC are connected to the exact same Wi-Fi.
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                      2
                    </span>
                    <p>
                      <strong>Secure HTTPS:</strong> Camera access on iOS strictly requires HTTPS. Make sure the URL starts with <code className="text-amber-300">https://</code>.
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                      3
                    </span>
                    <p>
                      <strong>Permissions:</strong> If camera doesn't start, open iPhone <em>Settings &gt; Safari &gt; Camera</em> and choose "Ask" or "Allow".
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                      4
                    </span>
                    <p>
                      <strong>Single App Access:</strong> iOS allows only one app to access the camera at a time. Close FaceTime or other camera apps if blocked.
                    </p>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setShowHelp(false)}
                    className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-all"
                  >
                    Got It
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Modal for Mobile Quick Connect */}
          <QRCodeModal
            isOpen={showQrModal}
            onClose={() => setShowQrModal(false)}
          />
        </main>

        {/* Bottom Floating Control Dock */}
        <footer className="relative z-20 pb-6 pt-2 px-4 flex justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <CameraControls
            status={status}
            facingMode={facingMode}
            availableDevices={availableDevices}
            activeDeviceId={activeDeviceId}
            fitMode={fitMode}
            onStart={() => startCamera()}
            onStop={() => stopCamera()}
            onSwitchCamera={handleSwitchCamera}
            onSelectDevice={handleSelectDevice}
            onToggleFitMode={() => setFitMode((m) => (m === 'cover' ? 'contain' : 'cover'))}
          />
        </footer>
      </div>
    );
  }
);

CameraPreview.displayName = 'CameraPreview';
