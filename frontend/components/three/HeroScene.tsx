"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Float, Lightformer, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";

/* ────────────────────────────────────────────────────────────────────────────
   Canvas-drawn textures. Drawn once fonts are ready so the wordmark uses the
   same Inter Tight face as the page (next/font exposes it via a CSS var).
   ──────────────────────────────────────────────────────────────────────────── */

function cssFont(varName: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const PAYPAL_NAVY = "#003087";
const PAYPAL_BLUE = "#0070e0";

/** Texture radius matches the 3D body's corner radius so edges line up exactly. */
const FACE_W = 1024;
const FACE_H = 640;
const FACE_R = 42;

function finishTexture(c: HTMLCanvasElement, anisotropy = 8) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  // Premultiplied alpha stops transparent (black) texels bleeding a dark fringe into edges.
  tex.premultiplyAlpha = true;
  return tex;
}

function makeCardFace(side: "front" | "back"): THREE.CanvasTexture {
  const W = FACE_W;
  const H = FACE_H;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const display = cssFont("--font-display", "system-ui");
  const mono = cssFont("--font-code", "ui-monospace");

  roundRect(ctx, 0, 0, W, H, FACE_R);
  ctx.save();
  ctx.clip();

  if (side === "front") {
    // White wallet-pass body
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // PayPal header band
    const band = ctx.createLinearGradient(0, 0, W, 0);
    band.addColorStop(0, PAYPAL_NAVY);
    band.addColorStop(1, PAYPAL_BLUE);
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, W, 150);

    ctx.fillStyle = "#ffffff";
    ctx.font = `700 58px ${display}`;
    ctx.fillText("PayPal", 60, 96);
    const ppW = ctx.measureText("PayPal").width;
    ctx.font = `500 30px ${display}`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("Payouts", 60 + ppW + 14, 96);

    // "Sent" pill
    // Sized from the measured label so it never overflows; right-aligned to the
    // same 60px margin as the wordmark on the left. Text is vertically centred.
    ctx.font = `600 26px ${display}`;
    const pillLabel = "Payout sent";
    const labelW = ctx.measureText(pillLabel).width;
    const padX = 22, dotR = 8, gap = 12, pillH = 56, pillY = 47;
    const pillW = padX + dotR * 2 + gap + labelW + padX;
    const pillX = W - 60 - pillW;
    const midY = pillY + pillH / 2;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = "#4ade80";
    ctx.beginPath(); ctx.arc(pillX + padX + dotR, midY, dotR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(pillLabel, pillX + padX + dotR * 2 + gap, midY + 1);
    ctx.textBaseline = "alphabetic";

    // Amount block
    ctx.fillStyle = "#6b6b80";
    ctx.font = `600 22px ${display}`;
    ctx.fillText("REIMBURSEMENT PAID", 60, 222);
    ctx.fillStyle = "#14142b";
    ctx.font = `600 100px ${display}`;
    ctx.fillText("RM 1,284.50", 56, 324);
    ctx.fillStyle = "#6b6b80";
    ctx.font = `500 26px ${display}`;
    ctx.fillText("to Aisha Rahman", 60, 368);

    // Timeline: submitted → AI verified → paid
    const steps: [string, string, string][] = [
      ["Submitted", "09:12", PAYPAL_BLUE],
      ["AI verified", "09:13", PAYPAL_BLUE],
      ["Paid", "09:14", PAYPAL_BLUE],
    ];
    const y = 450;
    const xs = [80, 420, 760];
    ctx.strokeStyle = PAYPAL_BLUE;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(xs[0], y); ctx.lineTo(xs[2], y); ctx.stroke();
    steps.forEach(([label, time, color], i) => {
      const x = xs[i];
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x - 2, y + 5); ctx.lineTo(x + 8, y - 6); ctx.stroke();
      ctx.fillStyle = "#14142b";
      ctx.font = `600 24px ${display}`;
      ctx.fillText(label, x - 20, y + 52);
      ctx.fillStyle = "#8b8ba0";
      ctx.font = `500 20px ${mono}`;
      ctx.fillText(time, x - 20, y + 80);
    });

    // Footer
    ctx.fillStyle = "#eceef4";
    ctx.fillRect(60, H - 74, W - 120, 1.5);
    ctx.fillStyle = "#14142b";
    ctx.font = `600 28px ${display}`;
    ctx.fillText("Reclaim", 60, H - 26);
    ctx.fillStyle = "#fe8500";
    ctx.fillText(".", 60 + ctx.measureText("Reclaim").width + 1, H - 26);
    ctx.fillStyle = "#8b8ba0";
    ctx.font = `500 20px ${mono}`;
    const meta = "Auto-approved by AI";
    ctx.fillText(meta, W - 60 - ctx.measureText(meta).width, H - 28);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0b0b1e");
    g.addColorStop(1, "#1a1f4a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(140, 0, 0, 140, 0, 560);
    glow.addColorStop(0, "rgba(0,112,224,0.45)");
    glow.addColorStop(1, "rgba(0,112,224,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `600 22px ${display}`;
    ctx.fillText("AI COMPLIANCE AUDIT", 60, 92);
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 64px ${display}`;
    ctx.fillText("Approved", 60, 172);
    ctx.fillStyle = "#4ade80";
    ctx.font = `500 28px ${mono}`;
    ctx.fillText("confidence 0.97", 60 + 330, 168);

    const rows = [
      "Fare within RM 800 travel cap",
      "Receipt date matches trip request",
      "No edits to AI-extracted fields",
    ];
    rows.forEach((label, i) => {
      const y = 250 + i * 86;
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      roundRect(ctx, 56, y, W - 112, 66, 18);
      ctx.fill();
      ctx.fillStyle = "#4ade80";
      ctx.beginPath(); ctx.arc(96, y + 33, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `500 28px ${display}`;
      ctx.fillText(label, 128, y + 43);
    });

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `500 20px ${mono}`;
    ctx.fillText("Policy: Travel & Expense v3 · §4.2 · Payout via PayPal", 60, H - 40);
  }

  ctx.restore();
  return finishTexture(c);
}

/* ──────────────────────────────────────────────────────────────────────────── */

type Textures = {
  front: THREE.CanvasTexture;
  back: THREE.CanvasTexture;
};

function useTextures(): Textures | null {
  const [tex, setTex] = useState<Textures | null>(null);
  useEffect(() => {
    let alive = true;
    const build = () => {
      if (!alive) return;
      setTex({
        front: makeCardFace("front"),
        back: makeCardFace("back"),
      });
    };
    if (document.fonts?.ready) document.fonts.ready.then(build);
    else build();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    return () => {
      if (!tex) return;
      tex.front.dispose();
      tex.back.dispose();
    };
  }, [tex]);
  return tex;
}

const CARD_W = 3.6;
const CARD_H = 2.25;
const CARD_D = 0.06;
const CARD_R = (FACE_R / FACE_W) * CARD_W;

/**
 * Rounded slab whose corner radius matches the face textures exactly, so no
 * body edge peeks out at the corners. A small bevel keeps the rim soft and light.
 */
function makeSlab(w: number, h: number, r: number, d: number) {
  const b = 0.012;
  const iw = w - 2 * b;
  const ih = h - 2 * b;
  const ir = Math.max(0.001, r - b);
  const x = -iw / 2;
  const y = -ih / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + ir, y);
  shape.lineTo(x + iw - ir, y);
  shape.absarc(x + iw - ir, y + ir, ir, -Math.PI / 2, 0, false);
  shape.lineTo(x + iw, y + ih - ir);
  shape.absarc(x + iw - ir, y + ih - ir, ir, 0, Math.PI / 2, false);
  shape.lineTo(x + ir, y + ih);
  shape.absarc(x + ir, y + ih - ir, ir, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + ir);
  shape.absarc(x + ir, y + ir, ir, Math.PI, Math.PI * 1.5, false);
  const inner = d - 2 * b;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: inner,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 6,
    curveSegments: 32,
  });
  geo.translate(0, 0, -inner / 2);
  geo.computeVertexNormals();
  return geo;
}

function Card({
  tex,
  flipped,
  onToggle,
  reduce,
}: {
  tex: Textures;
  flipped: boolean;
  onToggle: () => void;
  reduce: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const slab = useMemo(() => makeSlab(CARD_W, CARD_H, CARD_R, CARD_D), []);
  useEffect(() => () => slab.dispose(), [slab]);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    // Resting three-quarter angle reads as a physical object; pointer adds parallax.
    const targetY = (flipped ? Math.PI : 0) - 0.24 + (reduce ? 0 : state.pointer.x * 0.4);
    const targetX = 0.1 + (reduce ? 0 : -state.pointer.y * 0.25);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 5, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 5, dt);
    const s = hovered ? 1.04 : 1;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, s, 8, dt));
  });

  return (
    <group
      ref={group}
      rotation={[0, -0.35, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh geometry={slab}>
        <meshPhysicalMaterial color="#f4f6fb" roughness={0.35} metalness={0} clearcoat={0.6} clearcoatRoughness={0.25} />
      </mesh>
      <mesh position={[0, 0, CARD_D / 2 + 0.002]}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshPhysicalMaterial
          map={tex.front}
          emissive="#ffffff"
          emissiveMap={tex.front}
          emissiveIntensity={0.32}
          transparent
          premultipliedAlpha
          toneMapped={false}
          roughness={0.32}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.12}
        />
      </mesh>
      <mesh position={[0, 0, -(CARD_D / 2 + 0.002)]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshPhysicalMaterial
          map={tex.back}
          transparent
          premultipliedAlpha
          toneMapped={false}
          roughness={0.35}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
    </group>
  );
}

function FrameDriver() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let raf = 0;
    let n = 0;
    let lastInput = performance.now();
    const mark = () => {
      lastInput = performance.now();
    };
    const opts = { passive: true } as const;
    window.addEventListener("pointermove", mark, opts);
    window.addEventListener("pointerdown", mark, opts);
    window.addEventListener("keydown", mark, opts);
    const tick = () => {
      n++;
      if (performance.now() - lastInput < 1500 || n % 2 === 0) invalidate();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", mark);
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
    };
  }, [invalidate]);
  return null;
}

/** Pull the camera back on narrow canvases so the pass never clips while tilting. */
function ResponsiveCamera() {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const camera = get().camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const fitWidth = 2.3 / (Math.tan(halfFov) * aspect);
    const fitHeight = 1.55 / Math.tan(halfFov);
    camera.position.z = Math.max(fitWidth, fitHeight);
    camera.updateProjectionMatrix();
  }, [get, size.width, size.height]);
  return null;
}

function Scene({ flipped, onToggle, reduce }: { flipped: boolean; onToggle: () => void; reduce: boolean }) {
  const tex = useTextures();
  if (!tex) return null;
  return (
    <>
      <ResponsiveCamera />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      {/* Neutral studio lighting: soft white key + rim, no coloured spill */}
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3} position={[0, 3, 4]} scale={[10, 2, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.2} position={[-5, 0, 2]} scale={[2, 8, 1]} color="#eef0ff" />
        <Lightformer form="rect" intensity={1.2} position={[5, 0, 2]} scale={[2, 8, 1]} color="#ffffff" />
      </Environment>

      {reduce ? (
        <Card tex={tex} flipped={flipped} onToggle={onToggle} reduce />
      ) : (
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
          <Card tex={tex} flipped={flipped} onToggle={onToggle} reduce={false} />
        </Float>
      )}
    </>
  );
}

export default function HeroScene({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [ready, setReady] = useState(false);
  const [dpr, setDpr] = useState(1.5);

  // Mount WebGL after the page is interactive so it never competes with first paint/hydration.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
    if (w.requestIdleCallback) {
      const h = w.requestIdleCallback(() => setReady(true), { timeout: 1500 });
      return () => w.cancelIdleCallback?.(h);
    }
    const t = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Stop rendering when scrolled away — saves battery on laptops/phones.
  useEffect(() => {
    if (!wrap.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className={`relative ${className}`}>
      {/* Soft contact shadow — static CSS, costs nothing per frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[74%] h-10 w-[58%] -translate-x-1/2 rounded-[50%] bg-[#14142b]/20 blur-2xl"
      />
      {!ready ? (
        <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
          <div className="aspect-[1.6] w-[60%] -rotate-6 rounded-[22px] bg-white shadow-float ring-1 ring-on-surface/5" />
        </div>
      ) : (
      <Canvas
        dpr={[1, dpr]}
        camera={{ position: [0, 0, 6.2], fov: 40 }}
        frameloop={!visible ? "never" : "demand"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        aria-hidden="true"
      >
        <FrameDriver />
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} />
        <Suspense fallback={null}>
          <Scene flipped={flipped} onToggle={() => setFlipped((f) => !f)} reduce={reduce} />
        </Suspense>
      </Canvas>
      )}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full px-3 py-1.5 text-[12px] font-medium text-on-surface-variant transition-colors hover:text-on-surface"
      >
        {flipped ? "Show the Payout" : "Flip to See the AI Audit"}
      </button>
    </div>
  );
}
