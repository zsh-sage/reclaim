"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Zap, ZapOff, Camera, FolderOpen, RotateCcw, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CameraModalProps {
  isOpen: boolean;
  onCapture: (file: File) => void;
  onClose: () => void;
}

/** Extend MediaStreamTrack for non-standard torch constraint */
type TorchTrack = MediaStreamTrack & {
  getCapabilities?: () => Record<string, unknown>;
  applyConstraints: (c: unknown) => Promise<void>;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CameraModal({ isOpen, onCapture, onClose }: CameraModalProps) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);

  const [torchOn, setTorchOn]               = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [notification, setNotification]     = useState("");
  const [flashOverlay, setFlashOverlay]     = useState(false);
  const [isCapturing, setIsCapturing]       = useState(false);
  const [cameraReady, setCameraReady]       = useState(false);
  const [cameraError, setCameraError]       = useState("");

  // After capture: hold the blob URL for the review screen
  const [previewBlob, setPreviewBlob]       = useState<string | null>(null);
  const [capturedFile, setCapturedFile]     = useState<File | null>(null);

  // ── Body class: hides the BottomNav while modal is open ───────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("camera-open");
    } else {
      document.body.classList.remove("camera-open");
    }
    return () => { document.body.classList.remove("camera-open"); };
  }, [isOpen]);

  // ── Auto-dismiss notification ─────────────────────────────────────────────
  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    const t = setTimeout(() => setNotification(""), 3500);
    return () => clearTimeout(t);
  }, []);

  // ── Start / stop camera ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // Reset all state when opening
    setPreviewBlob(null);
    setCapturedFile(null);
    setCameraReady(false);
    setCameraError("");
    setTorchOn(false);
    setTorchSupported(false);

    let active = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera API not supported on this device.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width:  { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (active) setCameraReady(true);
          };
        }

        // Detect torch
        const track = stream.getVideoTracks()[0] as TorchTrack;
        try {
          const caps = track.getCapabilities?.() as Record<string, unknown> | undefined;
          setTorchSupported(!!caps?.["torch"]);
        } catch { /* not supported */ }

      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Unknown error";
        if (msg.includes("Permission") || msg.includes("denied") || msg.includes("NotAllowed")) {
          setCameraError("Camera access was denied. Please allow camera permission in your browser settings.");
        } else if (msg.includes("not supported")) {
          setCameraError("Your device or browser does not support camera access.");
        } else {
          setCameraError("Unable to start the camera. Please check your device and try again.");
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [isOpen]);

  // ── Torch toggle ──────────────────────────────────────────────────────────
  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0] as TorchTrack | undefined;
    if (!track) return;

    if (!torchSupported) {
      showNotification("⚡ Flash is not supported on this device or browser.");
      return;
    }

    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      showNotification("Could not toggle flash. Your browser may restrict this feature.");
    }
  }

  // ── Stop stream helper (so preview doesn't block camera) ──────────────────
  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  // ── Capture photo ─────────────────────────────────────────────────────────
  async function handleCapture() {
    if (!videoRef.current || !canvasRef.current || isCapturing || !cameraReady) return;
    setIsCapturing(true);

    // Shutter flash
    setFlashOverlay(true);
    setTimeout(() => setFlashOverlay(false), 280);

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) { setIsCapturing(false); return; }
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
          const url  = URL.createObjectURL(blob);
          stopStream();
          setCapturedFile(file);
          setPreviewBlob(url);
        }
        setIsCapturing(false);
      },
      "image/jpeg",
      0.85,
    );
  }

  // ── File picker (from gallery / documents) ────────────────────────────────
  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    stopStream();
    setCapturedFile(file);
    setPreviewBlob(url);
    // Reset input so the same file can be re-picked after a retake
    e.target.value = "";
  }

  // ── Confirm: pass file up and close ──────────────────────────────────────
  function handleConfirm() {
    if (!capturedFile) return;
    if (previewBlob) URL.revokeObjectURL(previewBlob);
    onCapture(capturedFile);
    onClose();
  }

  // ── Retake: revoke URL, go back to viewfinder ─────────────────────────────
  function handleRetake() {
    if (previewBlob) {
      URL.revokeObjectURL(previewBlob);
      setPreviewBlob(null);
    }
    setCapturedFile(null);
    // Camera will restart via the isOpen useEffect (stream was stopped, trigger restart)
    // We need to manually restart since isOpen hasn't changed
    setTorchOn(false);
    setTorchSupported(false);
    setCameraReady(false);
    setCameraError("");

    async function restart() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setCameraReady(true);
        }
        const track = stream.getVideoTracks()[0] as TorchTrack;
        const caps  = track.getCapabilities?.() as Record<string, unknown> | undefined;
        setTorchSupported(!!caps?.["torch"]);
      } catch {
        setCameraError("Unable to restart camera.");
      }
    }
    restart();
  }

  // ── Close ─────────────────────────────────────────────────────────────────
  function handleClose() {
    if (torchOn) {
      const track = streamRef.current?.getVideoTracks()[0] as TorchTrack | undefined;
      track?.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
    }
    if (previewBlob) {
      URL.revokeObjectURL(previewBlob);
      setPreviewBlob(null);
    }
    setCapturedFile(null);
    onClose();
  }

  if (!isOpen) return null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-100 bg-black flex flex-col"
      style={{ touchAction: "none" }}
    >
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          paddingTop:    `calc(1rem + env(safe-area-inset-top, 0px))`,
          paddingBottom: "0.875rem",
          background:    "rgba(0,0,0,0.65)",
          backdropFilter: "blur(16px)",
        }}
      >
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center active:bg-white/30 transition-colors"
        >
          <X className="w-5 h-5 text-white" strokeWidth={2} />
        </button>

        <span className="text-white text-sm font-semibold font-headline tracking-wide">
          {previewBlob ? "Review Photo" : "Scan Receipt"}
        </span>

        {/* Flash — only visible in viewfinder mode */}
        {!previewBlob ? (
          <button
            onClick={toggleTorch}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
              torchOn
                ? "bg-amber-400 text-black shadow-[0_0_14px_rgba(251,191,36,0.7)]"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            {torchOn
              ? <Zap    className="w-5 h-5" strokeWidth={2} fill="currentColor" />
              : <ZapOff className="w-5 h-5" strokeWidth={2} />
            }
          </button>
        ) : (
          // Spacer so title stays centered
          <div className="w-10 h-10" />
        )}
      </div>

      {/* ── Notification Toast ───────────────────────────────────────── */}
      {notification && (
        <div
          className="absolute left-4 right-4 z-30 flex justify-center"
          style={{ top: `calc(4.5rem + env(safe-area-inset-top, 0px))` }}
        >
          <div className="bg-black/85 backdrop-blur-sm text-white text-xs px-5 py-3 rounded-2xl border border-white/10 max-w-xs text-center shadow-xl leading-relaxed">
            {notification}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* REVIEW SCREEN — shown after capture or file pick             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {previewBlob ? (
        <>
          {/* Preview */}
          <div className="flex-1 overflow-y-auto flex items-center justify-center bg-black px-4 py-6">
            <img
              src={previewBlob}
              alt="Captured receipt"
              className="max-w-full max-h-full rounded-2xl object-contain shadow-[0_8px_48px_rgba(0,0,0,0.6)]"
            />
          </div>

          {/* Confirm / Retake bar */}
          <div
            className="shrink-0 flex items-center justify-between px-6 gap-4"
            style={{
              paddingTop:    "1.25rem",
              paddingBottom: `calc(2rem + env(safe-area-inset-bottom, 0px))`,
              background:    "rgba(0,0,0,0.75)",
              backdropFilter: "blur(16px)",
            }}
          >
            <button
              onClick={handleRetake}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/20 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={2} />
              Retake
            </button>

            <p className="text-white/40 text-xs font-body text-center flex-1 leading-snug">
              Does the receipt look clear and readable?
            </p>

            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-[0_4px_16px_rgba(70,71,211,0.4)]"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Use Photo
            </button>
          </div>
        </>
      ) : (
        /* ══════════════════════════════════════════════════════════════ */
        /* VIEWFINDER                                                    */
        /* ══════════════════════════════════════════════════════════════ */
        <>
          {/* Viewfinder area */}
          <div className="flex-1 relative overflow-hidden bg-black">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-8 gap-6 text-center">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-white/40" strokeWidth={1.25} />
                </div>
                <div>
                  <p className="text-white font-semibold text-base font-headline mb-2">Camera Unavailable</p>
                  <p className="text-white/55 text-sm font-body leading-relaxed">{cameraError}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="px-8 py-3 rounded-xl bg-white/15 border border-white/20 text-white text-sm font-semibold hover:bg-white/25 transition-colors active:scale-95"
                >
                  Go Back
                </button>
              </div>
            ) : (
              <>
                {/* Live video */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Vignette */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.55) 100%)" }}
                />

                {/* Corner frame guides — no animated scan line */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="relative w-[78%]" style={{ aspectRatio: "3/2" }}>
                    <div className="absolute top-0 left-0  w-9 h-9 border-t-[3px] border-l-[3px] border-white/80 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-white/80 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0  w-9 h-9 border-b-[3px] border-l-[3px] border-white/80 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-white/80 rounded-br-xl" />
                  </div>
                </div>

                {/* Shutter flash overlay */}
                <div
                  className="absolute inset-0 bg-white pointer-events-none z-20 transition-opacity duration-300"
                  style={{ opacity: flashOverlay ? 0.88 : 0 }}
                />

                {/* Camera starting spinner */}
                {!cameraReady && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <p className="text-white/55 text-sm font-body">Starting camera…</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Bottom Bar (viewfinder mode) ──────────────────────── */}
          <div
            className="shrink-0 flex flex-col items-center gap-4 px-6"
            style={{
              paddingTop:    "1.25rem",
              paddingBottom: `calc(2rem + env(safe-area-inset-bottom, 0px))`,
              background:    "rgba(0,0,0,0.65)",
              backdropFilter: "blur(16px)",
            }}
          >
            <p className="text-white/40 text-xs font-body text-center leading-relaxed">
              Align the receipt within the frame
            </p>

            {/* Three-button row: file picker | shutter | flash */}
            <div className="flex items-center justify-between w-full max-w-xs">

              {/* Pick from gallery / files */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white hover:bg-white/25 active:scale-90 transition-all"
                aria-label="Attach file from device"
              >
                <FolderOpen className="w-6 h-6" strokeWidth={1.75} />
              </button>

              {/* Shutter */}
              <button
                onClick={handleCapture}
                disabled={!cameraReady || isCapturing}
                className={`flex items-center justify-center rounded-full border-4 transition-all ${
                  !cameraReady || isCapturing
                    ? "border-white/25 cursor-not-allowed"
                    : "border-white active:scale-90 hover:scale-105"
                }`}
                style={{ width: 76, height: 76 }}
                aria-label="Capture photo"
              >
                <div
                  className={`rounded-full transition-all duration-200 ${
                    isCapturing ? "w-9 h-9 bg-white/40" : "w-[54px] h-[54px] bg-white"
                  }`}
                />
              </button>

              {/* Flash toggle */}
              <button
                onClick={toggleTorch}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 ${
                  torchOn
                    ? "bg-amber-400 text-black shadow-[0_0_14px_rgba(251,191,36,0.7)]"
                    : "bg-white/15 border border-white/20 text-white hover:bg-white/25"
                }`}
                aria-label="Toggle flash"
              >
                {torchOn
                  ? <Zap    className="w-5 h-5" strokeWidth={2} fill="currentColor" />
                  : <ZapOff className="w-5 h-5" strokeWidth={2} />
                }
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFilePick}
      />

      {/* Hidden capture canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
