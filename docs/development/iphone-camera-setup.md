# iPhone Camera Integration & HTTPS Setup Guide

This guide details how to run VestiAR with real-time iPhone camera streaming over a local Wi-Fi network using direct browser APIs on iOS Safari.

---

## 1. Overview & Architecture

VestiAR uses direct browser camera access via `navigator.mediaDevices.getUserMedia()` on iOS Safari. No third-party webcam software (such as Camo, OBS, or DroidCam) is required.

```
┌─────────────────────────────────┐           Wi-Fi LAN           ┌─────────────────────────────────┐
│     iPhone (Safari / iOS)       │   ◄───────────────────────►   │       Windows 11 PC (Host)      │
│  - Captures high-res video feed │     HTTPS (WSS / TLS)         │  - Vite Dev Server (0.0.0.0)    │
│  - navigator.mediaDevices       │   https://192.168.0.x:5173    │  - mkcert TLS Certificates      │
│  - Hardware-accelerated camera  │                               │  - MediaPipe Try-on Engine      │
└─────────────────────────────────┘                               └─────────────────────────────────┘
```

### Why HTTPS is Required
iOS Safari enforces a strict security policy: `navigator.mediaDevices.getUserMedia` is **only** accessible within a Secure Context (`window.isSecureContext === true`). While `localhost` is treated as secure, accessing your development PC via a local IP (e.g. `http://192.168.0.103:5173`) over unencrypted HTTP will immediately disable camera access in Safari.

---

## 2. Prerequisites

- **Windows 11 PC** running Windows PowerShell (v5.1+ or PowerShell 7+)
- **Node.js**: v18.0.0 or higher (v24.x tested)
- **pnpm**: v9.0.0 or higher (v11.x tested)
- **iPhone**: Running iOS 14.3 or higher (tested with iOS 16, 17, 18)
- **Wi-Fi**: Both PC and iPhone connected to the **same local Wi-Fi network**

---

## 3. Quick Start (Windows PowerShell)

Open PowerShell in the project root (`G:\vestiar`):

```powershell
# 1. Install dependencies
pnpm install

# 2. Generate local HTTPS certificates with mkcert (one-time setup)
pnpm setup:https

# 3. Start the Vite HTTPS development server
pnpm dev
```

The terminal will display the active LAN URL:
```text
═════════════════════════════════════════════════════════════
  👗 VestiAR - Virtual Fitting Room (Camera Integration)  
═════════════════════════════════════════════════════════════
  Local:   https://localhost:5173
  iPhone:  https://192.168.0.103:5173

  iPhone Safari Instructions:
  1. Connect your iPhone to the same Wi-Fi network.
  2. Open Safari and navigate to: https://192.168.0.103:5173
  3. Tap "Start Camera" to initialize the camera preview.
═════════════════════════════════════════════════════════════
```

---

## 4. HTTPS Certificate Generation Details (`mkcert`)

### Automated Setup Script
We provide a dedicated PowerShell script (`scripts/setup-https.ps1`) that:
1. Detects your PC's active local IP address automatically.
2. Locates `mkcert` (or guides you to install it via WinGet/Chocolatey).
3. Generates certificates into `apps/web/.certs/cert.pem` and `key.pem`.
4. Copies the root CA certificate to `apps/web/.certs/rootCA.pem`.

You can also specify a custom IP address:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/setup-https.ps1 -CustomIp 192.168.1.150
```

### Manual mkcert Installation (if needed)
If `mkcert` is not already installed on your PC, install it using WinGet:
```powershell
winget install FiloSottile.mkcert
```
Or with Chocolatey:
```powershell
choco install mkcert -y
```

---

## 5. Trusting the Certificate on iPhone (Optional but Recommended)

When you first open `https://192.168.0.x:5173` on iPhone Safari, iOS may display a "This Connection Is Not Private" warning. You can tap **Show Details** -> **visit this website**.

To permanently trust the local development certificate on iOS:

1. **Transfer `rootCA.pem` to iPhone:**
   - Locate `apps/web/.certs/rootCA.pem` on your PC.
   - AirDrop, email, or send this file to your iPhone.
2. **Install Profile:**
   - On your iPhone, open the received `rootCA.pem`.
   - Tap **Allow** when prompted to download a configuration profile.
   - Go to iPhone **Settings** -> **Profile Downloaded** (near the top).
   - Tap **Install** in the top-right corner, enter your passcode, and confirm.
3. **Enable Full Trust:**
   - Go to iPhone **Settings** -> **General** -> **About** -> **Certificate Trust Settings** (at the very bottom).
   - Under "Enable full trust for root certificates", locate `mkcert ...` and toggle the switch **ON**.

Once enabled, Safari will display a green/locked padlock without any security prompts.

---

## 6. Windows Firewall Configuration

If your iPhone cannot connect to `https://192.168.0.x:5173`, the Windows Firewall may be blocking incoming connections on port `5173`.

Run this PowerShell command in an elevated prompt (or check your Firewall settings):

```powershell
New-NetFirewallRule -DisplayName "VestiAR Dev Server (Vite 5173)" `
  -Direction Inbound `
  -LocalPort 5173 `
  -Protocol TCP `
  -Action Allow
```

---

## 7. iOS Safari Camera Specifics & Best Practices

1. **Explicit User Gesture**: iOS Safari prevents starting camera streams automatically without an explicit user gesture (such as tapping "Start Camera").
2. **Video Element Attributes**:
   - `playsInline`: Required on iOS to prevent the video from taking over full-screen native iOS media player.
   - `muted`: Required for autoplay policies.
   - `autoPlay`: Allows continuous frame playback once user grants permission.
3. **Single Stream Policy**: iOS locks camera hardware if another tab or application (FaceTime, Instagram) holds the camera. VestiAR handles `track.ended` events and provides restart capabilities.
4. **Switching Front & Rear Cameras**: iOS Safari does not support changing constraints on an active track smoothly via `applyConstraints`. VestiAR stops the active stream completely before requesting the alternative lens, ensuring reliable switching without freezing.
5. **Background Lifecycle**: When switching Safari tabs or locking the phone, iOS pauses the media track. VestiAR registers `visibilitychange` listeners to automatically check track health upon resuming.

---

## 8. Troubleshooting Checklist

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `INSECURE_CONTEXT` error | Page opened via `http://` instead of `https://` | Ensure the URL begins with `https://`. |
| `NotAllowedError` | Camera access denied by user or Safari settings | In iOS: Go to **Settings > Safari > Camera** and set to **Ask** or **Allow**. Refresh the page. |
| Page will not load on iPhone | Wi-Fi mismatch or Windows Firewall | 1. Ensure PC and iPhone are on the same Wi-Fi.<br>2. Check Windows Firewall rule for port 5173. |
| Black preview screen | Safari autoplay blocked | Tap anywhere on screen or tap "Start Camera" again. Ensure `playsInline` and `muted` are set. |
| `NotReadableError` | Camera in use by another app | Close background camera apps (FaceTime, Camera app) on iPhone. |

---

## 9. Next Steps: MediaPipe Integration

The camera module exposes clean, reactive hooks:
```typescript
import { useCamera } from '@/features/camera';

const { videoRef, status, stream } = useCamera({
  onFrame: (videoElement) => {
    // MediaPipe PoseLandmarker / Segmenter consumes this directly
    poseLandmarker.detectForVideo(videoElement, performance.now());
  }
});
```
This enables zero-latency feeding into the Try-on Engine without coupling UI code to computer vision inference.
