import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CameraControls } from '../CameraControls';

describe('CameraControls component', () => {
  it('renders Start Camera button when status is idle', () => {
    const handleStart = vi.fn();
    render(
      <CameraControls
        status="idle"
        facingMode="environment"
        availableDevices={[]}
        activeDeviceId={null}
        fitMode="cover"
        onStart={handleStart}
        onStop={vi.fn()}
        onSwitchCamera={vi.fn()}
        onToggleFitMode={vi.fn()}
      />
    );

    const startBtn = screen.getByRole('button', { name: /start camera/i });
    expect(startBtn).toBeInTheDocument();

    fireEvent.click(startBtn);
    expect(handleStart).toHaveBeenCalledTimes(1);
  });

  it('renders Stop, Switch, and Fit Mode buttons when running', () => {
    const handleStop = vi.fn();
    const handleSwitch = vi.fn();
    const handleToggleFit = vi.fn();

    render(
      <CameraControls
        status="running"
        facingMode="environment"
        availableDevices={[]}
        activeDeviceId={null}
        fitMode="cover"
        onStart={vi.fn()}
        onStop={handleStop}
        onSwitchCamera={handleSwitch}
        onToggleFitMode={handleToggleFit}
      />
    );

    const stopBtn = screen.getByRole('button', { name: /stop camera/i });
    expect(stopBtn).toBeInTheDocument();
    fireEvent.click(stopBtn);
    expect(handleStop).toHaveBeenCalledTimes(1);

    const switchBtn = screen.getByRole('button', { name: /switch camera/i });
    expect(switchBtn).toBeInTheDocument();
    fireEvent.click(switchBtn);
    expect(handleSwitch).toHaveBeenCalledTimes(1);

    const fitBtn = screen.getByRole('button', { name: /toggle camera fit mode/i });
    expect(fitBtn).toBeInTheDocument();
    fireEvent.click(fitBtn);
    expect(handleToggleFit).toHaveBeenCalledTimes(1);
  });
});
