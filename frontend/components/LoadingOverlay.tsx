"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function LoadingOverlay({ show }: { show: boolean }) {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (!show) { setDots(0); return; }
    const t = setInterval(() => setDots(p => (p + 1) % 4), 400);
    return () => clearInterval(t);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-surface flex flex-col items-center justify-center animate-in fade-in duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-2">
        <Image src="/images/logo.svg" alt="Reclaim Logo" width={40} height={40} className="w-10 h-10 object-contain" priority />
        <h1 className="font-headline text-4xl font-black text-on-surface tracking-tighter select-none">
          Reclaim<span className="text-primary">.</span>
        </h1>
      </div>

      {/* Tagline */}
      <p className="text-sm text-on-surface-variant font-body mb-10 max-w-xs text-center">
        From receipt to reimbursement — in minutes, not days
      </p>

      {/* Slim progress bar */}
      <div className="w-32 h-0.5 bg-surface-container-high rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-[loading_1.4s_ease-in-out_infinite]" />
      </div>

      <style>{`
        @keyframes loading {
          0%   { transform: translateX(-100%); width: 40%; }
          50%  { transform: translateX(150%);  width: 60%; }
          100% { transform: translateX(300%);  width: 40%; }
        }
      `}</style>
    </div>
  );
}
