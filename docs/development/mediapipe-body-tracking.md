# MediaPipe Real-Time Body Tracking Guide

This document details the architecture, model configuration, coordinate normalization, performance optimizations, and iOS Safari compatibility for the MediaPipe Pose Landmarker integration in VestiAR.

---

## 1. Overview & Architecture

The VestiAR tracking subsystem is completely decoupled from the React view layer, implemented in `@vestiar/tryon-engine`:

```
┌─────────────────────────────────┐
│     HTMLVideoElement            │  ◄── Live iPhone / Web Camera
│  (CameraPreview / CameraService)│
└────────────────┬────────────────┘
                 │ onFrame(video)
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ @vestiar/tryon-engine: PoseTrackingPipeline                    │
│  - isProcessing concurrency lock (prevents frame queue lag)     │
│  - Target FPS rate limiter (e.g., 30 FPS)                      │
│  - Monotonic timestamp generation                               │
│  - Actual CV FPS & Latency calculation                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ PoseLandmarkerService (MediaPipe Tasks-Vision)                  │
│  - Delegate: GPU (WebGL/WebGPU) with automatic CPU fallback     │
│  - Running Mode: 'VIDEO'                                        │
│  - Model: pose_landmarker_lite.task (Local / CDN fallback)      │
│  - 33 Normalized Body Landmarks (x, y, z, visibility)           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ extractBodyMeasurements() (measurements.ts)                     │
│  - Key Joints: Shoulders, Hips, Elbows, Wrists, Knees, Ankles   │
│  - Structural Lines: Shoulder Width, Hip Width, Torso Center    │
│  - Estimated Points (isEstimated: true): Neck, Waist, Spine     │
└────────────────┬────────────────────────────────────────────────┘
                 │ onResult(result, measurements)
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ apps/web: usePoseTracking() & TrackingOverlay (Canvas 2D)      │
│  - High-precision rendering over live camera feed               │
│  - Mirrored transform (scaleX(-1)) for front/selfie camera      │
│  - Interactive HUD & Toggles: Tracking, Skeleton, Measurements  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Model & WASM Asset Locations

### Local Asset Serving
To avoid external network latency and support offline development, assets are served directly by Vite from `apps/web/public`:

1. **MediaPipe Model**:
   - Local file: `apps/web/public/models/pose_landmarker_lite.task` (~5.5 MB)
   - Source: Google Cloud Storage Float16 optimized lite model.
   - Fallback: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task`
2. **WASM Binaries**:
   - Local directory: `apps/web/public/wasm/` (`vision_wasm_internal.wasm`, `vision_wasm_internal.js`)
   - Source: `@mediapipe/tasks-vision/wasm`
   - Fallback: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm`

A PowerShell download script is provided to refresh assets whenever needed:
```powershell
pnpm models:download
```

---

## 3. The 33 MediaPipe Pose Landmarks

MediaPipe detects 33 landmark points in normalized coordinate space $[0.0, 1.0]$:

```
                  0 - Nose
             1 - Left Eye Inner          4 - Right Eye Inner
             2 - Left Eye                5 - Right Eye
             3 - Left Eye Outer          6 - Right Eye Outer
             7 - Left Ear                8 - Right Ear
             9 - Mouth Left             10 - Mouth Right
                  
         11 - Left Shoulder             12 - Right Shoulder
         |                                |
         |                                |
         13 - Left Elbow                14 - Right Elbow
         |                                |
         |                                |
         15 - Left Wrist                16 - Right Wrist
         17 - Pinky  19 - Index         18 - Pinky  20 - Index
         21 - Thumb                     22 - Thumb
         
               23 - Left Hip           24 - Right Hip
               |                          |
               |                          |
               25 - Left Knee          26 - Right Knee
               |                          |
               |                          |
               27 - Left Ankle         28 - Right Ankle
               29 - Left Heel          30 - Right Heel
               31 - Left Foot Index    32 - Right Foot Index
```

### Direct vs. Estimated Body Measurements

| Measurement | Type | Method | Purpose in Virtual Fitting |
| :--- | :--- | :--- | :--- |
| **Shoulder Points (11, 12)** | Direct | MediaPipe landmark detection | Anchor point for shirts, jackets, dresses |
| **Shoulder Width & Center** | Estimated (`isEstimated: true`) | Midpoint and Euclidean distance $L_2(11, 12)$ | Garment scaling and collar horizontal placement |
| **Hip Points (23, 24)** | Direct | MediaPipe landmark detection | Waistband anchor for pants, skirts |
| **Hip Width & Center** | Estimated (`isEstimated: true`) | Midpoint and Euclidean distance $L_2(23, 24)$ | Lower garment proportion scaling |
| **Neck Position** | Estimated (`isEstimated: true`) | Interpolated along spine vector above shoulders | Collar and neckline fit |
| **Torso Center** | Estimated (`isEstimated: true`) | Midpoint of shoulder center and hip center | Upper body garment 3D alignment |
| **Waist Approximation** | Estimated (`isEstimated: true`) | 60% down the torso line from shoulders to hips | Belt line, tuck-in position |

> **Disclaimer**: These values are 2D screen-space proportional estimates for AR clothing visualization. They are not physical tailor or medical measurements.

---

## 4. Performance Optimizations

1. **Non-Blocking Concurrency Gate (`isProcessing`)**:
   MediaPipe inference takes ~12–25ms. If the camera delivers frames at 60 FPS (every 16ms), queuing inferences would cause latency accumulation (video and skeleton getting out of sync).
   `PoseTrackingPipeline` skips incoming frames while an inference is already running, keeping latency minimal and real-time.
2. **Configurable Target FPS Limiter**:
   Default is set to 30 FPS. Can be throttled to 20 or 15 FPS on lower-power mobile hardware to conserve battery.
3. **Monotonic Timestamp Enforcement**:
   MediaPipe `detectForVideo` throws a runtime exception if `timestamp <= previousTimestamp`. The pipeline guarantees strictly increasing timestamps even during clock jitter or tab suspension.
4. **Canvas 2D Overlay Sync**:
   The canvas resolution is dynamically synchronized with the video stream's intrinsic pixel dimensions (`videoWidth`, `videoHeight`). The canvas CSS inherits `object-fit` and `scaleX(-1)` from the video element, ensuring zero parallax error between camera preview and skeleton overlay.

---

## 5. iPhone Safari & iOS Considerations

- **GPU vs. CPU Delegate**: On modern iOS (A15+ Bionic), WebGL GPU delegate provides high inference speeds (~15–25ms). If iOS Low Power Mode is enabled or WebGL context is throttled by Safari, `PoseLandmarkerService` automatically falls back to `'CPU'` without throwing unhandled exceptions.
- **Front vs. Rear Camera Alignment**:
  - Rear camera (`environment`): rendered normally.
  - Front camera (`user`): mirrored horizontally (`scaleX(-1)`). The canvas overlay applies the exact same CSS transform, so skeleton lines follow your body naturally like a mirror.
- **Background Lifecycle**: When switching tabs or locking the iPhone, MediaPipe execution is paused. Once Safari returns to the foreground (`visibilitychange`), tracking resumes seamlessly.

---

## 6. Developer Controls & Verification

The user interface includes a dedicated Tracking HUD on top of `CameraPreview`:
- **Pose Status**: Displays `Pose Tracked` (cyan) when a human body is detected, or `Searching Pose...` (amber) when searching.
- **Inference Latency (ms)**: Real measured inference duration.
- **Processing FPS**: Rolling window measurement of MediaPipe detections per second.
- **Delegate Badge**: Shows whether GPU or CPU is actively executing.
- **Interactive Toggles**:
  - `Tracking On/Off`: Starts/stops MediaPipe inference.
  - `Skeleton`: Toggles 33 landmarks and 35 bone connections.
  - `Fitting Lines`: Toggles shoulder line, hip line, neck marker, waist line, and torso bounding zone.
