import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, QrCode, X, Copy, Check } from 'lucide-react';

export interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [lanUrl, setLanUrl] = useState<string>('');

  useEffect(() => {
    // Generate URL based on current host or LAN IP
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol;

    const targetUrl =
      hostname === 'localhost' || hostname === '127.0.0.1'
        ? `${protocol}//${hostname}${port}`
        : window.location.href;

    setLanUrl(targetUrl);

    QRCode.toDataURL(
      targetUrl,
      {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [isOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(lanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-sm bg-zinc-950 border border-white/15 rounded-3xl p-6 shadow-2xl text-center">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <QrCode className="w-4 h-4" />
          </div>
          <h3 className="text-base font-semibold text-white tracking-wide">
            Quét mã mở trên iPhone
          </h3>
        </div>
        <p className="text-xs text-zinc-400 font-light mb-4">
          Dùng ứng dụng Camera của iPhone quét mã để mở phòng thử đồ AR trực tiếp trên Safari.
        </p>

        {/* QR Code Container */}
        <div className="flex items-center justify-center p-4 bg-white rounded-2xl shadow-inner mx-auto mb-4 w-64 h-64">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Mã QR mở trên iPhone"
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
              Đang tạo mã QR...
            </div>
          )}
        </div>

        {/* URL Pill & Copy Button */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl mb-4 text-left">
          <div className="truncate text-xs text-amber-300 font-mono flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">{lanUrl}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-all shrink-0"
            title="Sao chép liên kết"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-1.5 text-left text-[11px] text-zinc-400 bg-white/5 p-3 rounded-xl border border-white/5">
          <p className="flex items-start gap-1.5">
            <span className="text-amber-400 font-bold">•</span>
            <span>iPhone và máy tính phải kết nối <strong>cùng mạng Wi-Fi</strong>.</span>
          </p>
          <p className="flex items-start gap-1.5">
            <span className="text-amber-400 font-bold">•</span>
            <span>Mở Camera iPhone, hướng vào mã QR và chạm vào thông báo hiện lên trên màn hình.</span>
          </p>
          <p className="flex items-start gap-1.5">
            <span className="text-amber-400 font-bold">•</span>
            <span>Chọn <strong>Allow (Cho phép)</strong> khi Safari yêu cầu quyền truy cập Camera.</span>
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs transition-all shadow-lg shadow-amber-500/20"
        >
          Đã hiểu
        </button>
      </div>
    </div>
  );
};
