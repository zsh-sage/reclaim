"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Compact radial gauge (0–100). SVG on a <g> wrapper so transforms stay centered. */
export function RingGauge({ value, size = 64, label }: { value: number; size?: number; label: string }) {
  const reduce = useReducedMotion();
  const v = Math.max(0, Math.min(100, value)) / 100;
  const stroke = 7;
  const r = (size - stroke) / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4647d3" />
          <stop offset="60%" stopColor="#105bff" />
          <stop offset="100%" stopColor="#fe8500" />
        </linearGradient>
      </defs>
      <g style={{ transformBox: "fill-box", transformOrigin: "center", transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ebebef" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: reduce ? v : 0 }}
          animate={{ pathLength: v }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </g>
    </svg>
  );
}
