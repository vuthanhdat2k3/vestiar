import {
  CameraCapabilitiesInfo,
  CameraDeviceInfo,
  CameraError,
  CameraStartOptions,
  CameraStatus,
  FacingMode,
} from '../types/camera.types';
import { normalizeCameraError } from '../utils/camera-errors';

type StreamListener = (stream: MediaStream | null) => void;
type StatusListener = (status: CameraStatus) => void;
type ErrorListener = (error: CameraError | null) => void;
type DevicesListener = (devices: CameraDeviceInfo[]) => void;

/**
 * Core Camera Service for VestiAR.
 * Completely decoupled from React to allow usage across UI, workers, or testing suites.
 */
export class CameraService {
  private currentStream: MediaStream | null = null;
  private status: CameraStatus = 'idle';
  private facingMode: FacingMode = 'environment';
  private activeDeviceId: string | null = null;
  private availableDevices: CameraDeviceInfo[] = [];

  private streamListeners = new Set<StreamListener>();
  private statusListeners = new Set<StatusListener>();
  private errorListeners = new Set<ErrorListener>();
  private devicesListeners = new Set<DevicesListener>();

  private deviceChangeHandler = () => {
    this.enumerateDevices().catch(() => {});
  };

  private trackEndedHandler = () => {
    this.handleTrackEnded();
  };

  constructor() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
    }
  }

  /**
   * Checks whether the current runtime environment supports camera access.
   */
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  /**
   * Checks if the current origin is a secure context (HTTPS or localhost).
   */
  public isSecureContext(): boolean {
    if (typeof window === 'undefined') return false;
    return !!window.isSecureContext;
  }

  public getStatus(): CameraStatus {
    return this.status;
  }

  public getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  public getActiveFacingMode(): FacingMode {
    return this.facingMode;
  }

  public getActiveDeviceId(): string | null {
    return this.activeDeviceId;
  }

  public getAvailableDevices(): CameraDeviceInfo[] {
    return [...this.availableDevices];
  }

  /**
   * Enumerate available video input devices.
   */
  public async enumerateDevices(): Promise<CameraDeviceInfo[]> {
    if (!this.isSupported()) return [];

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      this.availableDevices = videoDevices.map((device, index) => {
        let inferredFacingMode: FacingMode | undefined;
        const lowerLabel = device.label.toLowerCase();
        if (lowerLabel.includes('back') || lowerLabel.includes('rear') || lowerLabel.includes('environment')) {
          inferredFacingMode = 'environment';
        } else if (lowerLabel.includes('front') || lowerLabel.includes('user') || lowerLabel.includes('facetime')) {
          inferredFacingMode = 'user';
        }

        return {
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
          facingMode: inferredFacingMode,
        };
      });

      this.notifyDevicesListeners();
      return this.availableDevices;
    } catch {
      return [];
    }
  }

  /**
   * Request explicit camera permissions.
   */
  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      throw normalizeCameraError(new Error('Browser does not support getUserMedia'));
    }

    if (!this.isSecureContext()) {
      throw normalizeCameraError(new Error('Insecure context'));
    }

    this.setStatus('requesting');
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });
      // Stop temporary stream immediately after permission is granted
      tempStream.getTracks().forEach((t) => t.stop());
      this.setStatus('idle');
      await this.enumerateDevices();
      return true;
    } catch (err) {
      const cameraErr = normalizeCameraError(err);
      this.notifyErrorListeners(cameraErr);
      this.setStatus('error');
      throw cameraErr;
    }
  }

  /**
   * Start camera stream with optimal constraints and automatic fallbacks.
   */
  public async start(options: CameraStartOptions = {}): Promise<MediaStream> {
    if (!this.isSupported()) {
      const err = normalizeCameraError(new Error('Browser does not support getUserMedia'));
      this.notifyErrorListeners(err);
      this.setStatus('error');
      throw err;
    }

    if (!this.isSecureContext()) {
      const err = normalizeCameraError(new Error('Insecure context'));
      this.notifyErrorListeners(err);
      this.setStatus('error');
      throw err;
    }

    // Stop any existing stream first to avoid iOS Safari stream lockups
    this.stopInternal();

    const targetFacingMode = options.facingMode || this.facingMode;
    this.facingMode = targetFacingMode;
    this.activeDeviceId = options.deviceId || null;
    this.setStatus('starting');
    this.notifyErrorListeners(null);

    // Build constraints list in order of preference: Preferred -> Relaxed -> Minimal
    const constraintCandidates: MediaStreamConstraints[] = [];

    // 1. Preferred constraints
    if (options.deviceId) {
      constraintCandidates.push({
        audio: false,
        video: {
          deviceId: { exact: options.deviceId },
          width: { ideal: options.idealWidth || 1280 },
          height: { ideal: options.idealHeight || 720 },
          frameRate: { ideal: options.idealFrameRate || 30, max: 30 },
        },
      });
    } else {
      constraintCandidates.push({
        audio: false,
        video: {
          facingMode: { ideal: targetFacingMode },
          width: { ideal: options.idealWidth || 1280 },
          height: { ideal: options.idealHeight || 720 },
          frameRate: { ideal: options.idealFrameRate || 30, max: 30 },
        },
      });
    }

    // 2. Relaxed constraints (facingMode only)
    constraintCandidates.push({
      audio: false,
      video: options.deviceId
        ? { deviceId: { ideal: options.deviceId } }
        : { facingMode: { ideal: targetFacingMode } },
    });

    // 3. Minimal fallback (any video)
    constraintCandidates.push({
      audio: false,
      video: true,
    });

    let lastError: unknown = null;
    let stream: MediaStream | null = null;

    for (const constraints of constraintCandidates) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) break;
      } catch (err) {
        lastError = err;
        // If permission was denied or insecure, do not keep trying looser constraints
        const normalized = normalizeCameraError(err);
        if (normalized.type === 'NOT_ALLOWED' || normalized.type === 'SECURITY') {
          break;
        }
      }
    }

    if (!stream) {
      const cameraErr = normalizeCameraError(lastError);
      this.setStatus('error');
      this.notifyErrorListeners(cameraErr);
      throw cameraErr;
    }

    this.currentStream = stream;
    const videoTrack = stream.getVideoTracks()[0];

    if (videoTrack) {
      videoTrack.addEventListener('ended', this.trackEndedHandler);
      const settings = videoTrack.getSettings ? videoTrack.getSettings() : {};
      if (settings.deviceId) {
        this.activeDeviceId = settings.deviceId;
      }
      if (settings.facingMode === 'user' || settings.facingMode === 'environment') {
        this.facingMode = settings.facingMode;
      } else {
        this.facingMode = targetFacingMode;
      }
    } else {
      this.facingMode = targetFacingMode;
    }

    this.setStatus('running');
    this.notifyStreamListeners(stream);
    await this.enumerateDevices();

    return stream;
  }

  /**
   * Stops the active camera stream and releases all hardware tracks.
   */
  public stop(): void {
    this.stopInternal();
    this.setStatus('idle');
    this.notifyStreamListeners(null);
  }

  private stopInternal(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => {
        track.removeEventListener('ended', this.trackEndedHandler);
        track.stop();
      });
      this.currentStream = null;
    }
  }

  /**
   * Restarts the camera using previous or provided options.
   */
  public async restart(options?: CameraStartOptions): Promise<MediaStream> {
    return this.start({
      facingMode: this.facingMode,
      deviceId: this.activeDeviceId || undefined,
      ...options,
    });
  }

  /**
   * Switches between environment (rear) and user (front) cameras.
   */
  public async switchCamera(targetFacingMode?: FacingMode, deviceId?: string): Promise<MediaStream> {
    const nextMode: FacingMode = targetFacingMode || (this.facingMode === 'environment' ? 'user' : 'environment');
    return this.start({
      facingMode: nextMode,
      deviceId,
    });
  }

  /**
   * Returns current active track's capabilities and settings if supported.
   */
  public getVideoCapabilities(): CameraCapabilitiesInfo {
    const track = this.currentStream?.getVideoTracks()[0];
    if (!track) return {};

    const settings = track.getSettings ? track.getSettings() : {};
    return {
      width: settings.width,
      height: settings.height,
      frameRate: settings.frameRate,
      facingMode: settings.facingMode,
      aspectRatio: settings.aspectRatio,
    };
  }

  private handleTrackEnded(): void {
    this.stopInternal();
    const err: CameraError = {
      type: 'TRACK_ENDED',
      message: 'Camera stream disconnected or ended by the operating system.',
      userInstruction: 'Please restart the camera.',
    };
    this.notifyErrorListeners(err);
    this.setStatus('error');
    this.notifyStreamListeners(null);
  }

  private setStatus(status: CameraStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach((listener) => listener(status));
    }
  }

  private notifyStreamListeners(stream: MediaStream | null): void {
    this.streamListeners.forEach((listener) => listener(stream));
  }

  private notifyErrorListeners(err: CameraError | null): void {
    this.errorListeners.forEach((listener) => listener(err));
  }

  private notifyDevicesListeners(): void {
    this.devicesListeners.forEach((listener) => listener([...this.availableDevices]));
  }

  // Subscription methods
  public onStreamChange(listener: StreamListener): () => void {
    this.streamListeners.add(listener);
    return () => this.streamListeners.delete(listener);
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  public onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  public onDevicesChange(listener: DevicesListener): () => void {
    this.devicesListeners.add(listener);
    return () => this.devicesListeners.delete(listener);
  }

  public destroy(): void {
    this.stop();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
    }
    this.streamListeners.clear();
    this.statusListeners.clear();
    this.errorListeners.clear();
    this.devicesListeners.clear();
  }
}

// Export singleton instance for app-wide camera management
export const cameraService = new CameraService();
