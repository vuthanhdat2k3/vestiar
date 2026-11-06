import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { normalizeCameraError } from '../camera-errors';

describe('normalizeCameraError', () => {
  const originalIsSecureContext = window.isSecureContext;
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      configurable: true,
      value: originalIsSecureContext,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: originalMediaDevices,
    });
  });

  it('detects insecure context (HTTP on non-localhost)', () => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      configurable: true,
      value: false,
    });

    const error = normalizeCameraError(new Error('Insecure'));
    expect(error.type).toBe('INSECURE_CONTEXT');
    expect(error.userInstruction).toContain('HTTPS');
  });

  it('detects unsupported browser when mediaDevices is missing', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: undefined,
    });

    const error = normalizeCameraError(new Error('No mediaDevices'));
    expect(error.type).toBe('UNSUPPORTED');
  });

  it('maps NotAllowedError to NOT_ALLOWED with iOS Safari instructions', () => {
    const domErr = new DOMException('Permission denied', 'NotAllowedError');
    const error = normalizeCameraError(domErr);
    expect(error.type).toBe('NOT_ALLOWED');
    expect(error.userInstruction).toContain('Settings > Safari > Camera');
  });

  it('maps NotFoundError to NOT_FOUND', () => {
    const domErr = new DOMException('No camera', 'NotFoundError');
    const error = normalizeCameraError(domErr);
    expect(error.type).toBe('NOT_FOUND');
  });

  it('maps NotReadableError to NOT_READABLE', () => {
    const domErr = new DOMException('Device in use', 'NotReadableError');
    const error = normalizeCameraError(domErr);
    expect(error.type).toBe('NOT_READABLE');
    expect(error.userInstruction).toContain('Close other apps');
  });

  it('maps OverconstrainedError to OVERCONSTRAINED', () => {
    const domErr = new DOMException('Constraints failed', 'OverconstrainedError');
    const error = normalizeCameraError(domErr);
    expect(error.type).toBe('OVERCONSTRAINED');
  });

  it('maps AbortError to ABORT', () => {
    const domErr = new DOMException('Aborted', 'AbortError');
    const error = normalizeCameraError(domErr);
    expect(error.type).toBe('ABORT');
  });

  it('maps SecurityError to SECURITY', () => {
    const domErr = new DOMException('Blocked by CSP', 'SecurityError');
    const error = normalizeCameraError(domErr);
    expect(error.type).toBe('SECURITY');
  });

  it('falls back to UNKNOWN for unexpected errors', () => {
    const error = normalizeCameraError({ message: 'Custom unexpected crash' });
    expect(error.type).toBe('UNKNOWN');
    expect(error.message).toBe('Custom unexpected crash');
  });
});
