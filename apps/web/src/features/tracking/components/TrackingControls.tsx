import React from 'react';
import { Activity, Eye, EyeOff, UserCheck, UserX, Zap } from 'lucide-react';

export interface TrackingControlsProps {
  isReady: boolean;
  isTracking: boolean;
  isEnabled: boolean;
  hasBody: boolean;
  activeDelegate: 'GPU' | 'CPU' | null;
  fps: number;
  latencyMs: number;
  showSkeleton: boolean;
  showMeasurements: boolean;
  onToggleTracking: () => void;
  onToggleSkeleton: () => void;
  onToggleMeasurements: () => void;
  className?: string;
}

export const TrackingControls: React.FC<TrackingControlsProps> = ({
  isReady,
  isTracking,
  isEnabled,
  hasBody,
  activeDelegate,
  fps,
  latencyMs,
  showSkeleton,
  showMeasurements,
  onToggleTracking,
  onToggleSkeleton,
  onToggleMeasurements,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 select-none ${className}`}
      style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* 1. CV HUD / Tracking Status Badge */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-white shadow-lg">
        {isEnabled && isTracking ? (
          <>
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  hasBody ? 'bg-cyan-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  hasBody ? 'bg-cyan-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span
              className={`font-semibold tracking-wider text-[11px] uppercase ${
                hasBody ? 'text-cyan-400' : 'text-amber-400'
              }`}
            >
              {hasBody ? 'Pose Tracked' : 'Searching Pose...'}
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-zinc-600" />
            <span className="text-zinc-400 text-[11px] uppercase tracking-wider">Tracking Off</span>
          </>
        )}

        {/* Live CV Latency & FPS */}
        {isEnabled && isTracking && (
          <>
            <span className="text-zinc-600">•</span>
            <span className="font-mono text-zinc-300 text-[11px]">
              {latencyMs > 0 ? `${latencyMs}ms` : '--'}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="font-mono text-cyan-300 text-[11px]">
              {fps > 0 ? `${fps} FPS` : '-- FPS'}
            </span>
          </>
        )}

        {/* Hardware Acceleration Delegate */}
        {activeDelegate && isEnabled && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
              activeDelegate === 'GPU'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-300 border border-white/10'
            }`}
            title={`MediaPipe hardware delegate: ${activeDelegate}`}
          >
            {activeDelegate}
          </span>
        )}
      </div>

      {/* 2. Interactive Control Buttons */}
      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 p-1 rounded-full shadow-lg">
        {/* Toggle Tracking */}
        <button
          type="button"
          onClick={onToggleTracking}
          disabled={!isReady}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all active:scale-95 ${
            isEnabled
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          } disabled:opacity-40`}
          title={isEnabled ? 'Disable MediaPipe Body Tracking' : 'Enable MediaPipe Body Tracking'}
          aria-label="Toggle Pose Tracking"
        >
          {isEnabled ? <Zap className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isEnabled ? 'Tracking On' : 'Tracking Off'}</span>
        </button>

        {/* Toggle Skeleton */}
        {isEnabled && (
          <button
            type="button"
            onClick={onToggleSkeleton}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all active:scale-95 ${
              showSkeleton
                ? 'bg-white/15 text-white border border-white/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }`}
            title={showSkeleton ? 'Hide Skeleton' : 'Show Skeleton'}
            aria-label="Toggle Skeleton Display"
          >
            {showSkeleton ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Skeleton</span>
          </button>
        )}

        {/* Toggle Measurements */}
        {isEnabled && (
          <button
            type="button"
            onClick={onToggleMeasurements}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all active:scale-95 ${
              showMeasurements
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }`}
            title={showMeasurements ? 'Hide Body Measurements' : 'Show Body Measurements'}
            aria-label="Toggle Body Measurements"
          >
            {showMeasurements ? (
              <UserCheck className="w-3.5 h-3.5" />
            ) : (
              <UserX className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Fitting Lines</span>
          </button>
        )}
      </div>
    </div>
  );
};
