# VestiAR - AI Virtual Fitting Room

VestiAR is an AI-powered real-time virtual fitting room designed to let users try on garments directly on their bodies through smartphone and web cameras.

---

## iPhone Camera Streaming Workflow

VestiAR uses native browser `navigator.mediaDevices.getUserMedia()` on iOS Safari over local HTTPS. No external webcam utilities (such as Camo, OBS, or DroidCam) are needed.

```
+--------------------------+       Same Wi-Fi LAN       +--------------------------+
|      iPhone Safari       | <------------------------> |     Windows 11 Dev PC    |
|   https://<LAN_IP>:5173  |   Local HTTPS (mkcert)     |   pnpm dev (0.0.0.0)     |
+--------------------------+                            +--------------------------+
```

---

## Getting Started (Windows 11 & PowerShell)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18+ (Node 24 tested)
- [pnpm](https://pnpm.io/) v9+ (pnpm 11 tested)
- [mkcert](https://github.com/FiloSottile/mkcert) (`winget install FiloSottile.mkcert`)

### 2. Setup HTTPS & Local Certificates
Generate locally trusted development certificates:
```powershell
pnpm setup:https
```
This detects your active LAN IP address and generates development certificates in `apps/web/.certs/`.

### 3. Start Development Server
```powershell
pnpm dev
```
The terminal will display the exact URLs:
- **Local PC:** `https://localhost:5173`
- **iPhone Safari:** `https://<YOUR_LAN_IP>:5173`

### 4. Open on iPhone Safari (2 Cách Tiện Lợi)
- **Cách 1 (Quét mã QR)**: 
  - Mở Camera iPhone, hướng vào mã QR in ngay trên terminal (hoặc nút **"Quét Mã QR Bằng iPhone"** trên màn hình PC).
  - Chạm vào thông báo Safari xuất hiện trên iPhone.
- **Cách 2 (Nhập link thủ công)**:
  - Mở Safari trên iPhone và gõ: `https://<YOUR_LAN_IP>:5173`.

Sau khi mở, nhấn **"Start Camera"** và chọn **Allow** (Cho phép) để bắt đầu truyền video trực tiếp!

For certificate trust settings and iOS Safari troubleshooting, see [iPhone Camera Setup Guide](docs/development/iphone-camera-setup.md).

---

## Project Structure

```text
vestiar/
├── apps/
│   └── web/                                # React 19 + TypeScript + Vite web app
│       └── src/
│           ├── features/
│           │   └── camera/                 # Reusable camera module
│           │       ├── components/         # CameraPreview, CameraControls, CameraStatus
│           │       ├── hooks/              # useCamera hook (lifecycle, fps, visibility)
│           │       ├── services/           # camera.service.ts (React-independent)
│           │       ├── types/              # Camera types and constraints
│           │       └── utils/              # Error normalizer and iOS diagnostic messages
│           ├── App.tsx                     # Main fitting studio view
│           └── main.tsx
├── packages/
│   └── tryon-engine/                       # Core virtual try-on engine
│       └── src/
│           └── camera/camera-source.ts     # Video source contract for MediaPipe
├── docs/
│   └── development/
│       └── iphone-camera-setup.md          # Comprehensive iOS Safari setup guide
└── scripts/
    └── setup-https.ps1                     # PowerShell HTTPS certificate setup script
```

---

## Automated Tests

Run the full Vitest suite:
```powershell
pnpm test
```

Watch mode:
```powershell
pnpm test:watch
```

Build production bundle:
```powershell
pnpm build
```

---

## Roadmap & Next Milestones

1. **Camera Integration (Completed)**: Native iOS Safari browser camera access over HTTPS.
2. **MediaPipe Tracking**: Integrate MediaPipe Pose Landmarker and Selfie Segmenter using the video stream reference.
3. **Three.js Virtual Garments**: 3D garment mesh deformation and physics overlay.
