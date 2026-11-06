import '@testing-library/jest-dom';

// Ensure window.isSecureContext defaults to true in testing environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'isSecureContext', {
    writable: true,
    configurable: true,
    value: true,
  });

  // Mock HTMLMediaElement.prototype.play and pause
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};
}

// Default navigator.mediaDevices mock in jsdom
if (typeof navigator !== 'undefined') {
  const mockMediaDevices = {
    getUserMedia: () =>
      Promise.resolve({
        getTracks: () => [],
        getVideoTracks: () => [],
        getAudioTracks: () => [],
      } as unknown as MediaStream),
    enumerateDevices: () => Promise.resolve([]),
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    configurable: true,
    value: mockMediaDevices,
  });
}
