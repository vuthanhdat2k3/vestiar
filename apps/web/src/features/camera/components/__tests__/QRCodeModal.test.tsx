import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QRCodeModal } from '../QRCodeModal';

describe('QRCodeModal component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(<QRCodeModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders QR code modal when isOpen is true', async () => {
    await act(async () => {
      render(<QRCodeModal isOpen={true} onClose={vi.fn()} />);
    });

    expect(screen.getByText(/Quét mã mở trên iPhone/i)).toBeInTheDocument();
    expect(screen.getByText(/Dùng ứng dụng Camera của iPhone quét mã/i)).toBeInTheDocument();
  });

  it('invokes onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    await act(async () => {
      render(<QRCodeModal isOpen={true} onClose={handleClose} />);
    });

    const closeBtn = screen.getByRole('button', { name: /đóng/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
