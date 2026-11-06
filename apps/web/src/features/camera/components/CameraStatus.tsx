import React from 'react';
import { CameraResolution, CameraStatus as StatusType, FacingMode } from '../types/camera.types';
import { ShieldCheck, ShieldAlert, Video, RefreshCw } from 'lucide-react';

export interface CameraStatusProps {
  status: StatusType;
  resolution: CameraResolution | null;
  fps: number;
  facingMode: FacingMode;
  isSecureContext: boolean;
  className?: string;
}

export const CameraStatus: React.FC<CameraStatusProps> = ({
  status,
  resolution,
  fps,
  facingMode,
  isSecureContext,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 select-none ${className}`}
      style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Live / Status Pill */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium tracking-wider uppercase text-white shadow-lg">
        {status === 'running' && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-semibold">LIVE</span>
          </>
        )}
        {status === 'starting' && (
          <>
            <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
            <span className="text-amber-300">STARTING</span>
          </>
        )}
        {status === 'idle' && (
          <>
            <span className="w-2 h-2 rounded-full bg-zinc-500" />
            <span className="text-zinc-400">STANDBY</span>
          </>
        )}
        {status === 'error' && (
          <>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-rose-400">OFFLINE</span>
          </>
        )}
      </div>

      {/* Resolution & FPS */}
      {status === 'running' && resolution && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-zinc-300 shadow-lg">
          <Video className="w-3.5 h-3.5 text-zinc-400" />
          <span>
            {resolution.width} × {resolution.height}
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-emerald-400 font-mono font-medium">{fps > 0 ? `${fps} FPS` : '-- FPS'}</span>
        </div>
      )}

      {/* Facing Mode */}
      {status === 'running' && (
        <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-zinc-300 capitalize shadow-lg">
          {facingMode === 'environment' ? 'Rear Lens' : 'Front Lens'}
        </div>
      )}

      {/* Security Status */}
      <div
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-md border text-xs shadow-lg ${
          isSecureContext
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}
        title={isSecureContext ? 'Secure HTTPS context active' : 'Insecure context: camera API restricted'}
      >
        {isSecureContext ? (
          <>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>HTTPS</span>
          </>
        ) : (
          <>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>HTTP Insecure</span>
          </>
        )}
      </div>
    </div>
  );
};
