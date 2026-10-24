import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { APP_URL } from '../config.js';

// QR-Code zur Browser-Version der App (iPhone: einfach mit der Kamera scannen)
export function AppQrCode() {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    QRCode.toDataURL(APP_URL, { margin: 1, width: 256, color: { dark: '#05060a', light: '#ffffff' } })
      .then(setDataUrl)
      .catch((err) => console.warn('[qr] konnte QR-Code nicht erzeugen:', err));
  }, []);

  if (!dataUrl) return null;
  const label = APP_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <div className="flex h-[7vh] items-center gap-[0.6vw] rounded-[1.2vh] border border-white/10 bg-white/5 py-[0.5vh] pr-[0.8vw] pl-[0.5vh]">
      <img src={dataUrl} alt="QR-Code zur App" className="h-full rounded-[0.6vh]" />
      <div className="leading-tight whitespace-nowrap">
        <div className="text-[1.4vh] font-bold tracking-[0.15em] text-muted uppercase">📱 App im Browser</div>
        <div className="font-display text-[1.5vh] font-bold text-white">{label}</div>
      </div>
    </div>
  );
}
