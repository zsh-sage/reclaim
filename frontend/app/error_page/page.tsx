"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";

// ─── Rolling Digit Component ──────────────────────────────────────────────────

function RollingDigit({ target, delay }: { target: number; delay: number }) {
  // Start with a random digit immediately — no 000 flash
  const [current, setCurrent] = useState(() => Math.floor(Math.random() * 10));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const rolls = 14 + Math.floor(Math.random() * 6);

    const tick = (elapsed: number) => {
      if (elapsed >= rolls) {
        setCurrent(target);
        setSettled(true);
        return;
      }
      setCurrent(Math.floor(Math.random() * 10));
      // Ease: speed starts at 50ms, slows to 120ms as it nears the end
      const ms = 50 + Math.floor((elapsed / rolls) * 70);
      // First digit rolls instantly; second and third have a small stagger
      setTimeout(() => tick(elapsed + 1), elapsed === 0 ? delay : ms);
    };

    tick(0);
  }, [target, delay]);

  return (
    <span
      className={`inline-block tabular-nums transition-colors duration-500 ${
        settled ? "text-on-surface" : "text-primary/50"
      }`}
      style={{ textShadow: settled ? "none" : "0 0 20px rgba(70,71,211,0.4)" }}
    >
      {current}
    </span>
  );
}


// ─── Astronaut SVG Character ──────────────────────────────────────────────────

function AstronautCharacter() {
  return (
    <div className="relative w-40 h-40 mx-auto mb-10">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50%       { transform: translateY(-16px) rotate(3deg); }
        }
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); transform-origin: bottom right; }
          25%       { transform: rotate(20deg); transform-origin: bottom right; }
          75%       { transform: rotate(-10deg); transform-origin: bottom right; }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95%            { transform: scaleY(0.1); }
        }
        .astronaut-body { animation: float 3.5s ease-in-out infinite; }
        .astronaut-arm  { animation: wave 2s ease-in-out infinite; }
        .astronaut-eye  { animation: blink 4s ease-in-out infinite; }
      `}</style>

      <svg
        viewBox="0 0 160 160"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Stars in background */}
        {[
          [20, 18], [130, 25], [148, 70], [15, 90], [140, 120],
          [35, 140], [110, 10], [70, 155],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={1.5}
            fill="#4647d3"
            opacity={0.3 + (i % 3) * 0.2}
          />
        ))}

        <g className="astronaut-body">
          {/* Jetpack */}
          <rect x="62" y="90" width="36" height="28" rx="6" fill="#c7c8ff" opacity="0.6" />
          <rect x="67" y="95" width="10" height="16" rx="3" fill="#4647d3" opacity="0.5" />
          <rect x="83" y="95" width="10" height="16" rx="3" fill="#4647d3" opacity="0.5" />
          {/* Thruster flames */}
          <ellipse cx="72" cy="120" rx="4" ry="6" fill="#f97316" opacity="0.7" />
          <ellipse cx="88" cy="120" rx="4" ry="6" fill="#f97316" opacity="0.7" />
          <ellipse cx="72" cy="123" rx="2" ry="3" fill="#fde68a" opacity="0.9" />
          <ellipse cx="88" cy="123" rx="2" ry="3" fill="#fde68a" opacity="0.9" />

          {/* Body / suit */}
          <ellipse cx="80" cy="92" rx="28" ry="30" fill="#e8e9ff" />
          <ellipse cx="80" cy="92" rx="24" ry="26" fill="#f0f0ff" />

          {/* Left arm (static) */}
          <ellipse cx="52" cy="88" rx="8" ry="14" fill="#e8e9ff" transform="rotate(-20 52 88)" />
          <circle cx="46" cy="98" r="7" fill="#d0d1ff" />

          {/* Right arm (waving) */}
          <g className="astronaut-arm">
            <ellipse cx="108" cy="82" rx="7" ry="13" fill="#e8e9ff" transform="rotate(20 108 82)" />
            <circle cx="115" cy="72" r="7" fill="#d0d1ff" />
          </g>

          {/* Legs */}
          <ellipse cx="70" cy="118" rx="8" ry="11" fill="#d0d1ff" transform="rotate(-10 70 118)" />
          <ellipse cx="90" cy="118" rx="8" ry="11" fill="#d0d1ff" transform="rotate(10 90 118)" />
          <circle cx="67" cy="127" r="7" fill="#c7c8ff" />
          <circle cx="93" cy="127" r="7" fill="#c7c8ff" />

          {/* Helmet */}
          <circle cx="80" cy="68" r="26" fill="#4647d3" opacity="0.15" />
          <circle cx="80" cy="68" r="24" fill="#ffffff" />
          <circle cx="80" cy="68" r="22" fill="#eef0ff" />
          {/* Visor */}
          <ellipse cx="80" cy="68" rx="14" ry="13" fill="#4647d3" opacity="0.85" />
          <ellipse cx="80" cy="68" rx="14" ry="13" fill="url(#visor-shine)" />
          {/* Visor reflection */}
          <ellipse cx="74" cy="62" rx="4" ry="3" fill="white" opacity="0.35" transform="rotate(-20 74 62)" />
          {/* Eyes inside visor */}
          <g className="astronaut-eye">
            <ellipse cx="75" cy="67" rx="3" ry="3.5" fill="white" />
            <ellipse cx="85" cy="67" rx="3" ry="3.5" fill="white" />
          </g>
          <circle cx="75" cy="67" r="1.5" fill="#1a1a2e" />
          <circle cx="85" cy="67" r="1.5" fill="#1a1a2e" />
          {/* Helmet ring */}
          <circle cx="80" cy="68" r="24" fill="none" stroke="#d0d1ff" strokeWidth="2.5" />

          {/* Suit details */}
          <rect x="72" y="82" width="16" height="8" rx="3" fill="#c7c8ff" />
          <circle cx="76" cy="86" r="2" fill="#4647d3" opacity="0.5" />
          <circle cx="84" cy="86" r="2" fill="#4647d3" opacity="0.5" />
        </g>

        <defs>
          <radialGradient id="visor-shine" cx="40%" cy="35%">
            <stop offset="0%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#4647d3" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

// ─── 404 Page ─────────────────────────────────────────────────────────────────

export default function ErrorPage() {
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-surface flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
      {/* Subtle background grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#4647d3 1px, transparent 1px), linear-gradient(90deg, #4647d3 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Faint radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-lg">
        {/* Astronaut */}
        <AstronautCharacter />

        {/* Rolling 404 */}
        <div
          className="font-headline font-black leading-none tracking-tighter mb-4 select-none"
          style={{ fontSize: "clamp(6rem, 20vw, 9rem)" }}
        >
          <RollingDigit target={4} delay={0} />
          <RollingDigit target={0} delay={200} />
          <RollingDigit target={4} delay={400} />
        </div>

        {/* Message */}
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-3">
          Lost in space
        </h1>
        <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mb-10">
          The page you're looking for drifted off into the void. Let's get you
          back to familiar ground.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Home
          </button>
        </div>
      </div>
    </main>
  );
}
