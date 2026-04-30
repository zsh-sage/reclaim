"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import Image from "next/image";

const formSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

// ─── Loading Overlay Component ───────────────────────────────────────────────

function LoadingOverlay({ show }: { show: boolean }) {
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
        Every receipt reviewed. Every decision yours.
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePortal, setActivePortal] = useState<"employee" | "hr">("employee");
  const [restrictionToast, setRestrictionToast] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    setIsValidating(true);
    try {
      await login(values.email, values.password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed. Please check your credentials.";
      setError(message);
    } finally {
      setIsValidating(false);
    }
  }

  useEffect(() => {
    if (!restrictionToast) return;
    const timer = window.setTimeout(() => setRestrictionToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [restrictionToast]);

  const handleForgotPassword = () => {
    setRestrictionToast("Feature Restricted during MVP Stages");
  };

  return (
    <>
      <LoadingOverlay show={isLoading} />
      <main className="flex w-full min-h-dvh h-dvh overflow-hidden">
        {/* Left Side: Split Gradient Anchor */}
        <div className="hidden lg:flex w-1/2 split-gradient relative overflow-hidden items-center justify-center p-12 xl:p-16">
          {/* Decorative Elements */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(147,150,255,0.15),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(158,0,180,0.12),transparent_60%)] opacity-40 mix-blend-overlay"
          ></div>
          <div className="relative z-10 text-on-primary max-w-xl">
            <span className="inline-flex items-center rounded-full border border-white/35 bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] shadow-sm backdrop-blur-sm">
              Every receipt reviewed. Every decision yours.
            </span>
            <div className="flex items-center gap-4 mb-4">
              <Image src="/images/logo.svg" alt="Reclaim Logo" width={64} height={64} className="w-16 h-16 object-contain brightness-0 invert" priority />
              <h1 className="font-headline text-5xl xl:text-6xl font-extrabold tracking-tight leading-tight">
                Reclaim.
              </h1>
            </div>
            <p className="text-base xl:text-lg opacity-90 font-light leading-relaxed max-w-lg text-justify">
              An AI expense platform that pairs OCR with an intelligent agent that thinks, evaluates, and proposes decisions for every claim. By enabling HR to operate through &quot;efficiency by exception,&quot; the agent auto-clears valid submissions and isolates only policy violations or suspicious edits for final human review, instantly turning scattered receipts into audit-ready data.
            </p>
          </div>
          {/* Floating accent blobs */}
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-tertiary rounded-full blur-[120px] opacity-40"></div>
          <div className="absolute top-1/4 -right-24 w-72 h-72 bg-primary rounded-full blur-[100px] opacity-30"></div>
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_96%,rgba(255,255,255,0.09)_96%),linear-gradient(90deg,transparent_96%,rgba(255,255,255,0.09)_96%)] bg-[size:26px_26px] opacity-10"></div>
        </div>

        {/* Right Side: Interaction Canvas */}
        <div className="w-full lg:w-1/2 h-full flex flex-col items-center px-5 py-6 sm:px-8 sm:py-10 lg:px-14 lg:py-10 bg-surface overflow-y-auto">
          <div className="w-full max-w-md my-auto py-8">
            {/* Brand Header (Mobile Only) */}
            <div className="lg:hidden mb-6 flex flex-col items-center justify-center gap-3 text-center">
              <div className="flex items-center gap-2.5">
                <Image src="/images/logo.svg" alt="Reclaim Logo" width={32} height={32} className="w-8 h-8 object-contain" />
                <h2 className="font-headline text-2xl font-black tracking-tighter text-primary">
                  Reclaim
                </h2>
              </div>
              <span className="inline-flex items-center rounded-full border border-white/35 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                Every receipt reviewed. Every decision yours.
              </span>
            </div>

            <div className="glass-card rounded-[1.75rem] p-6 sm:p-8 shadow-ambient-lg border border-white/40">
              <div className="min-h-10 mb-1" aria-live="polite">
                {restrictionToast && (
                  <div role="status" className="rounded-xl border border-tertiary/20 bg-surface-container-lowest/95 px-4 py-2.5 text-center text-xs font-semibold text-tertiary shadow-sm">
                    {restrictionToast}
                  </div>
                )}
              </div>

              <div className="mb-7 text-center">
                <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface mb-3">
                  Welcome to Reclaim
                </h2>
                <p className="text-on-surface-variant text-sm">
                  Sign in to continue your session
                </p>
              </div>

              <div className="flex p-1 bg-surface-container-high rounded-full mb-8 relative overflow-hidden">
                <div className={`absolute inset-1 w-[calc(50%-8px)] bg-surface-container-lowest rounded-full shadow-sm transition-all duration-250 ease-out ${activePortal === "hr" ? "translate-x-[calc(100%+8px)]" : "translate-x-0"}`} />
                <button type="button" onClick={() => setActivePortal("employee")} className={`flex-1 py-2.5 text-sm rounded-full relative z-10 transition-colors duration-300 font-medium ${activePortal === "employee" ? "font-semibold text-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
                  Employee Portal
                </button>
                <button type="button" onClick={() => setActivePortal("hr")} className={`flex-1 py-2.5 text-sm rounded-full relative z-10 transition-colors duration-300 font-medium ${activePortal === "hr" ? "font-semibold text-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
                  HR Dashboard
                </button>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {error && <div className="bg-error-container text-error p-3 rounded-lg text-sm text-center">{error}</div>}

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant" htmlFor="email">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors w-5 h-5" />
                    <input className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest/60 backdrop-blur-md border border-outline/20 rounded-xl text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm" id="email" placeholder="name@company.com" type="email" {...form.register("email")} />
                    {form.formState.errors.email && <p className="text-error text-xs mt-1">{form.formState.errors.email.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant" htmlFor="password">Password</label>
                    <button type="button" onClick={handleForgotPassword} className="text-xs font-semibold text-primary hover:text-primary-dim hover:underline decoration-primary/30 underline-offset-4 transition-all">Forgot Password?</button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors w-5 h-5" />
                    <input className="w-full pl-12 pr-12 py-3.5 bg-surface-container-lowest/60 backdrop-blur-md border border-outline/20 rounded-xl text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm" id="password" placeholder="••••••••" type={showPassword ? "text" : "password"} {...form.register("password")} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    {form.formState.errors.password && <p className="text-error text-xs mt-1">{form.formState.errors.password.message}</p>}
                  </div>
                </div>

                <button className="w-full mt-8 py-4 px-6 bg-gradient-to-r from-primary to-primary-dim text-white rounded-xl font-headline font-semibold text-lg hover:shadow-[0_0_20px_rgba(147,150,255,0.4)] active:scale-[0.98] transition-all duration-250 flex justify-center items-center gap-2 cursor-pointer" type="submit" disabled={isLoading || isValidating}>
                  {isLoading || isValidating ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <>Sign In <ArrowRight className="text-xl w-5 h-5" /></>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
    </main>
    </>
  );
}
