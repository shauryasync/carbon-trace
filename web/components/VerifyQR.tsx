"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// Encodes a link to the verify page for this serial.
export default function VerifyQR({ serial }: { serial: number }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(`${window.location.origin}/verify?serial=${serial}`);
  }, [serial]);

  if (!url) return null;

  return (
    <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
      <QRCodeSVG value={url} size={96} />
      <div className="text-sm">
        <p className="font-medium text-slate-800">Scan to verify this serial</p>
        <p className="mt-1 break-all text-xs text-slate-500">{url}</p>
      </div>
    </div>
  );
}