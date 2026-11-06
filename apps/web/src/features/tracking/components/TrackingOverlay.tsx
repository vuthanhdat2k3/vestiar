import React, { useEffect, useRef } from 'react';
import {
  BodyMeasurements,
  NormalizedLandmark,
  POSE_CONNECTIONS,
  PoseLandmarkIndex,
} from '@vestiar/tryon-engine';

export interface TrackingOverlayProps {
  landmarks: NormalizedLandmark[];
  measurements: BodyMeasurements | null;
  showSkeleton: boolean;
  showMeasurements: boolean;
  facingMode: 'user' | 'environment';
  fitMode: 'cover' | 'contain';
  videoElement: HTMLVideoElement | null;
  className?: string;
}

export const TrackingOverlay: React.FC<TrackingOverlayProps> = ({
  landmarks,
  measurements,
  showSkeleton,
  showMeasurements,
  facingMode,
  fitMode,
  videoElement,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Synchronize canvas internal buffer size with video element resolution
    if (videoElement && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
      if (
        canvas.width !== videoElement.videoWidth ||
        canvas.height !== videoElement.videoHeight
      ) {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
      }
    } else if (canvas.width !== 1280 || canvas.height !== 720) {
      canvas.width = 1280;
      canvas.height = 720;
    }

    const width = canvas.width;
    const height = canvas.height;

    // Clear previous frame
    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length < 33) {
      return;
    }

    const toX = (normX: number) => normX * width;
    const toY = (normY: number) => normY * height;

    // 1. Draw Torso Bounding Region (Virtual Fitting Area)
    const ls = landmarks[PoseLandmarkIndex.LEFT_SHOULDER];
    const rs = landmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
    const rh = landmarks[PoseLandmarkIndex.RIGHT_HIP];
    const lh = landmarks[PoseLandmarkIndex.LEFT_HIP];

    const hasTorso =
      (ls.visibility ?? 1) > 0.4 &&
      (rs.visibility ?? 1) > 0.4 &&
      (lh.visibility ?? 1) > 0.4 &&
      (rh.visibility ?? 1) > 0.4;

    if (hasTorso) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(toX(ls.x), toY(ls.y));
      ctx.lineTo(toX(rs.x), toY(rs.y));
      ctx.lineTo(toX(rh.x), toY(rh.y));
      ctx.lineTo(toX(lh.x), toY(lh.y));
      ctx.closePath();

      // Holographic gradient fill
      const grad = ctx.createLinearGradient(
        toX(ls.x),
        toY(ls.y),
        toX(lh.x),
        toY(lh.y)
      );
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.18)');
      grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.12)');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0.15)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Subtle border
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Skeleton Connections
    if (showSkeleton) {
      ctx.save();
      for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
        const p1 = landmarks[startIdx];
        const p2 = landmarks[endIdx];

        if (!p1 || !p2) continue;
        const v1 = p1.visibility ?? 1.0;
        const v2 = p2.visibility ?? 1.0;

        if (v1 < 0.35 || v2 < 0.35) continue;

        ctx.beginPath();
        ctx.moveTo(toX(p1.x), toY(p1.y));
        ctx.lineTo(toX(p2.x), toY(p2.y));

        // Highlight Shoulder and Hip lines
        if (
          (startIdx === PoseLandmarkIndex.LEFT_SHOULDER && endIdx === PoseLandmarkIndex.RIGHT_SHOULDER) ||
          (startIdx === PoseLandmarkIndex.RIGHT_SHOULDER && endIdx === PoseLandmarkIndex.LEFT_SHOULDER)
        ) {
          ctx.strokeStyle = '#06b6d4'; // Cyan for shoulders
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 8;
        } else if (
          (startIdx === PoseLandmarkIndex.LEFT_HIP && endIdx === PoseLandmarkIndex.RIGHT_HIP) ||
          (startIdx === PoseLandmarkIndex.RIGHT_HIP && endIdx === PoseLandmarkIndex.LEFT_HIP)
        ) {
          ctx.strokeStyle = '#f59e0b'; // Amber for hips
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.lineWidth = 2;
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Draw All 33 Keypoints
    ctx.save();
    landmarks.forEach((lm, index) => {
      const vis = lm.visibility ?? 1.0;
      if (vis < 0.3) return; // Skip low-confidence points

      const cx = toX(lm.x);
      const cy = toY(lm.y);

      // Determine size and color
      const isMajorJoint =
        index === PoseLandmarkIndex.LEFT_SHOULDER ||
        index === PoseLandmarkIndex.RIGHT_SHOULDER ||
        index === PoseLandmarkIndex.LEFT_HIP ||
        index === PoseLandmarkIndex.RIGHT_HIP;

      const radius = isMajorJoint ? 6 : 4;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);

      if (vis >= 0.7) {
        ctx.fillStyle = isMajorJoint ? '#06b6d4' : '#10b981'; // Cyan or Emerald
      } else if (vis >= 0.45) {
        ctx.fillStyle = '#f59e0b'; // Amber
      } else {
        ctx.fillStyle = '#71717a'; // Zinc
      }

      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    ctx.restore();

    // 4. Draw Estimated Measurements Overlay
    if (showMeasurements && measurements) {
      ctx.save();

      // A. Neck Position
      if (measurements.neckPosition) {
        const nx = toX(measurements.neckPosition.x);
        const ny = toY(measurements.neckPosition.y);
        ctx.fillStyle = '#a855f7'; // Purple
        ctx.beginPath();
        // Diamond shape
        ctx.moveTo(nx, ny - 6);
        ctx.lineTo(nx + 6, ny);
        ctx.lineTo(nx, ny + 6);
        ctx.lineTo(nx - 6, ny);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // B. Torso Center
      if (measurements.torsoCenter) {
        const tx = toX(measurements.torsoCenter.x);
        const ty = toY(measurements.torsoCenter.y);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(tx, ty, 5, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // C. Waist Approximation line
      if (measurements.waistApproximation && measurements.hipWidthNormalized) {
        const wx = toX(measurements.waistApproximation.x);
        const wy = toY(measurements.waistApproximation.y);
        const halfSpan = (measurements.hipWidthNormalized * width * 0.9) / 2;

        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.moveTo(wx - halfSpan, wy);
        ctx.lineTo(wx + halfSpan, wy);
        ctx.strokeStyle = '#f43f5e'; // Rose
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.font = '10px -apple-system, sans-serif';
        ctx.fillStyle = '#fda4af';
        ctx.fillText('WAIST', wx - 16, wy - 4);
      }

      // D. Shoulder Width Tag
      if (measurements.shoulderCenter && measurements.shoulderWidthNormalized) {
        const sx = toX(measurements.shoulderCenter.x);
        const sy = toY(measurements.shoulderCenter.y);

        ctx.font = '11px -apple-system, sans-serif';
        ctx.fillStyle = '#06b6d4';
        const label = `Shoulder ~${Math.round(measurements.shoulderWidthNormalized * 100)}%`;
        ctx.fillText(label, sx - 35, sy - 10);
      }

      ctx.restore();
    }
  }, [landmarks, measurements, showSkeleton, showMeasurements, videoElement]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        objectFit: fitMode,
        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
      }}
      className={`pointer-events-none absolute inset-0 w-full h-full z-12 transition-transform duration-200 ${className}`}
    />
  );
};
