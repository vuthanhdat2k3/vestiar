import React from 'react';
import { CameraDeviceInfo, CameraStatus, FacingMode } from '../types/camera.types';
import { Play, Square, SwitchCamera, Maximize2, Minimize2, Camera } from 'lucide-react';

export interface CameraControlsProps {
  status: CameraStatus;
  facingMode: FacingMode;
  availableDevices: CameraDeviceInfo[];
  activeDeviceId: string | null;
  fitMode: 'cover' | 'contain';
  onStart: () => void;
  onStop: () => void;
  onSwitchCamera: () => void;
  onSelectDevice?: (deviceId: string) => void;
  onToggleFitMode: () => void;
  className?: string;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  status,
  facingMode,
  availableDevices,
  activeDeviceId,
  fitMode,
  onStart,
  onStop,
  onSwitchCamera,
  onSelectDevice,
  onToggleFitMode,
  className = '',
}) => {
  const isRunning = status === 'running';
  const isTransitioning = status === 'starting' || status === 'requesting' || status === 'stopping';

  return (
    <div
      className={`flex flex-col items-center gap-3 select-none ${className}`}
      style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Device Selector Pill (if multiple video inputs detected) */}
      {isRunning && availableDevices.length > 1 && onSelectDevice && (
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-xs text-zinc-300">
          <Camera className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={activeDeviceId || ''}
            onChange={(e) => onSelectDevice(e.target.value)}
            className="bg-transparent text-white text-xs outline-none cursor-pointer border-none"
          >
            {availableDevices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId} className="bg-zinc-900 text-white">
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Floating Control Bar */}
      <div className="flex items-center gap-4 bg-zinc-950/80 backdrop-blur-xl border border-white/15 px-6 py-3.5 rounded-full shadow-2xl">
        {/* Fit Mode Toggle */}
        {isRunning && (
          <button
            type="button"
            onClick={onToggleFitMode}
            title={fitMode === 'cover' ? 'Switch to Contain (Uncropped)' : 'Switch to Cover (Full Screen)'}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 active:scale-95 transition-all text-zinc-300 hover:text-white border border-white/10"
            aria-label="Toggle camera fit mode"
          >
            {fitMode === 'cover' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}

        {/* Primary Action Button (Start / Stop) */}
        {!isRunning ? (
          <button
            type="button"
            onClick={onStart}
            disabled={isTransitioning}
            className="h-12 px-6 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 transition-all text-black font-semibold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Start Camera"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Start Camera</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            disabled={isTransitioning}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-rose-600/90 hover:bg-rose-500 active:scale-95 transition-all text-white shadow-lg shadow-rose-600/30 disabled:opacity-50"
            title="Stop Camera Stream"
            aria-label="Stop Camera"
          >
            <Square className="w-4 h-4 fill-white" />
          </button>
        )}

        {/* Switch Camera (Front / Rear) */}
        {isRunning && (
          <button
            type="button"
            onClick={onSwitchCamera}
            disabled={isTransitioning}
            title={`Switch to ${facingMode === 'environment' ? 'Front' : 'Rear'} Camera`}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 active:scale-95 transition-all text-zinc-300 hover:text-white border border-white/10 disabled:opacity-50"
            aria-label="Switch Camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
