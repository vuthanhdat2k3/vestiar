import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import QRCode from 'qrcode';

function getLanIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function vestiarBannerPlugin(): Plugin {
  return {
    name: 'vestiar-banner',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const lanIp = getLanIpAddress();
        const port = 5173;
        const iphoneUrl = `https://${lanIp}:${port}`;

        setTimeout(async () => {
          console.log('\n\x1b[36m%s\x1b[0m', '═════════════════════════════════════════════════════════════');
          console.log('\x1b[1m\x1b[32m%s\x1b[0m', '  👗 VestiAR - Virtual Fitting Room (Camera Integration)  ');
          console.log('\x1b[36m%s\x1b[0m', '═════════════════════════════════════════════════════════════');
          console.log('\x1b[1m  Local:   \x1b[0m\x1b[34mhttps://localhost:%d\x1b[0m', port);
          console.log('\x1b[1m  iPhone:  \x1b[0m\x1b[32m%s\x1b[0m', iphoneUrl);
          console.log('');
          console.log('\x1b[33m  📲 QUÉT MÃ QR DƯỚI ĐÂY BẰNG IPHONE ĐỂ MỞ NHANH:\x1b[0m');

          try {
            const qrAscii = await QRCode.toString(iphoneUrl, { type: 'terminal', small: true });
            console.log(qrAscii);
          } catch (qrErr) {
            console.warn('Could not generate terminal QR:', qrErr);
          }

          console.log('\x1b[33m  iPhone Safari Instructions:\x1b[0m');
          console.log('  1. Đảm bảo iPhone và PC cùng kết nối một mạng Wi-Fi.');
          console.log('  2. Dùng camera iPhone quét mã QR ở trên hoặc mở: \x1b[32m%s\x1b[0m', iphoneUrl);
          console.log('  3. Nhấn "Start Camera" và chọn Allow (Cho phép) khi Safari hỏi.');
          console.log('\x1b[36m%s\x1b[0m\n', '═════════════════════════════════════════════════════════════');
        }, 150);
      });
    },
  };
}

export default defineConfig(() => {
  const certPath = path.resolve(__dirname, '.certs/cert.pem');
  const keyPath = path.resolve(__dirname, '.certs/key.pem');

  const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

  const httpsConfig = hasCerts
    ? {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      }
    : undefined;

  if (!hasCerts) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  HTTPS certificates not found in apps/web/.certs/. Run `pnpm setup:https` to generate them.');
  }

  return {
    plugins: [react(), tailwindcss(), vestiarBannerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      https: httpsConfig,
    },
  };
});
