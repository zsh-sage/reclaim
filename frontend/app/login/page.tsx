"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Users, ShieldCheck, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SegmentedControl } from "glisse";
import LoadingOverlay from "@/components/LoadingOverlay";
import { btn, input as inputCls } from "@/components/ui/styles";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), { ssr: false });

const formSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address, e.g. name@company.com." }),
  password: z.string().min(1, { message: "Enter your password to continue." }),
});

// ─── Main Component ──────────────────────────────────────────────────────────

const DEMO_CREDENTIALS: Record<"hr" | "employee", { email: string; password: string }> = {
  hr: { email: "hr@example.com", password: "password" },
  employee: { email: "employee@example.com", password: "password" },
};

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePortal, setActivePortal] = useState<"employee" | "hr">("employee");
  const [restrictionToast, setRestrictionToast] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [demoBanner, setDemoBanner] = useState<"hr" | "employee" | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function handleDemoLogin(role: "hr" | "employee") {
    setError(null);
    setDemoBanner(role);
    setActivePortal(role);
    setIsValidating(true);
    const creds = DEMO_CREDENTIALS[role];
    form.setValue("email", creds.email);
    form.setValue("password", creds.password);
    try {
      await login(creds.email, creds.password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Demo sign-in failed. Try again.";
      setError(message);
      setDemoBanner(null);
    } finally {
      setIsValidating(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    setIsValidating(true);
    try {
      await login(values.email, values.password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed. Check your email and password, then try again.";
      setError(message);
    } finally {
      setIsValidating(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role");
    const demo = params.get("demo");

    const target = demo === "hr" || role === "hr" ? "hr" : demo === "employee" || role === "employee" ? "employee" : null;
    if (target) setActivePortal(target);

    if (demo === "hr" || demo === "employee") {
      const creds = DEMO_CREDENTIALS[demo];
      form.setValue("email", creds.email);
      form.setValue("password", creds.password);
      setDemoBanner(demo);
      setIsValidating(true);
      login(creds.email, creds.password).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Demo sign-in failed. Try again.";
        setError(message);
        setDemoBanner(null);
      }).finally(() => setIsValidating(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restrictionToast) return;
    const timer = window.setTimeout(() => setRestrictionToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [restrictionToast]);

  const handleForgotPassword = () => {
    setRestrictionToast("Password reset is restricted during the MVP stage.");
  };

  return (
    <>
      <LoadingOverlay show={isLoading} />
      <main className="flex min-h-dvh w-full bg-white">
        {/* ── Left: brand panel ───────────────────────────────── */}
        <section className="mesh-ink relative hidden w-[46%] flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14">
          <div aria-hidden="true" className="dot-grid-light absolute inset-0 [mask-image:radial-gradient(80%_60%_at_30%_0%,black,transparent)]" />
          <div aria-hidden="true" className="absolute -right-48 top-1/4 h-[640px] w-[640px] animate-drift-a rounded-full" style={{ background: "radial-gradient(closest-side, #105bff, transparent)", opacity: 0.35 }} />
          <div aria-hidden="true" className="absolute -bottom-56 -left-10 h-[600px] w-[600px] animate-drift-b rounded-full" style={{ background: "radial-gradient(closest-side, #9e00b4, transparent)", opacity: 0.35 }} />

          <Link href="/" className="relative z-10 flex w-fit items-center gap-2 rounded-full">
            <Image src="/images/logo.svg" alt="" width={28} height={28} className="h-7 w-7 brightness-0 invert" priority />
            <span className="font-headline text-[20px] font-semibold tracking-[-0.03em]" translate="no">
              Reclaim<span className="text-accent">.</span>
            </span>
          </Link>

          <div className="relative z-10 h-[340px] xl:h-[400px]">
            <HeroScene className="h-full w-full" />
          </div>

          <div className="relative z-10 max-w-md">
            <h1 className="font-headline text-[38px] font-semibold leading-[1.05] tracking-[-0.04em] xl:text-[46px]">
              Reasoned by AI. <span className="text-gradient-light">Paid via PayPal.</span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-white/65">
              An agent evaluates every claim against your policy. Valid submissions are approved and
              paid out through PayPal automatically; only violations and suspicious edits reach a human.
            </p>
          </div>
        </section>

        {/* ── Right: sign-in ──────────────────────────────────── */}
        <section className="flex min-h-dvh flex-1 flex-col items-center overflow-y-auto bg-marshmallow px-5 py-8 sm:px-8 lg:bg-white">
          <div className="flex w-full max-w-[420px] items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2 rounded-full">
              <Image src="/images/logo.svg" alt="" width={26} height={26} className="h-[26px] w-[26px]" priority />
              <span className="font-headline text-[19px] font-semibold tracking-[-0.03em] text-on-surface" translate="no">
                Reclaim<span className="text-accent">.</span>
              </span>
            </Link>
          </div>

          <div className="my-auto w-full max-w-[420px] py-10">
            <div className="rounded-[28px] bg-white p-6 shadow-ambient-lg sm:p-8 lg:p-0 lg:shadow-none">
              <h2 className="font-headline text-[30px] font-semibold tracking-[-0.035em] text-on-surface">
                Sign in to Reclaim
              </h2>
              <p className="mt-1.5 text-[15px] text-on-surface-variant">
                Choose your portal, or jump in with a demo account.
              </p>

              <div className="mt-7 flex justify-center sm:justify-start">
                <SegmentedControl
                  aria-label="Portal"
                  items={[
                    { value: "employee", label: "Employee" },
                    { value: "hr", label: "HR & Finance" },
                  ]}
                  value={activePortal}
                  onValueChange={(v) => setActivePortal(v as "employee" | "hr")}
                  style={{ ["--lg-tab-width" as string]: "132px", ["--lg-tab-height" as string]: "36px" }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDemoLogin("employee")}
                  disabled={isValidating}
                  className={`${btn.secondary} w-full px-3`}
                >
                  <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                  Employee Demo
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin("hr")}
                  disabled={isValidating}
                  className={`${btn.secondary} w-full px-3`}
                >
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                  HR Demo
                </button>
              </div>

              <div className="my-6 flex items-center gap-3 text-[12px] text-on-surface-variant" aria-hidden="true">
                <span className="h-px flex-1 bg-on-surface/10" />
                or with email
                <span className="h-px flex-1 bg-on-surface/10" />
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div aria-live="polite" className="space-y-2 empty:hidden">
                  {restrictionToast && (
                    <div role="status" className="rounded-xl bg-accent-container px-4 py-2.5 text-center text-[13px] font-medium text-on-accent-container">
                      {restrictionToast}
                    </div>
                  )}
                  {demoBanner && !error && (
                    <div role="status" className="flex items-center justify-center gap-2 rounded-xl bg-primary/[0.06] px-4 py-2.5 text-[13px] font-medium text-primary">
                      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" aria-hidden="true" />
                      Signing in as {demoBanner === "hr" ? "HR" : "Employee"} demo…
                    </div>
                  )}
                  {error && (
                    <div role="alert" className="rounded-xl bg-error-container px-4 py-2.5 text-center text-[13px] font-medium text-error">
                      {error}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface" htmlFor="email">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/70" aria-hidden="true" />
                    <input
                      className={`${inputCls} pl-10`}
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      spellCheck={false}
                      placeholder="name@company.com"
                      aria-invalid={!!form.formState.errors.email}
                      aria-describedby={form.formState.errors.email ? "email-error" : undefined}
                      {...form.register("email")}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p id="email-error" className="mt-1.5 text-[12px] text-error">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-[13px] font-medium text-on-surface" htmlFor="password">
                      Password
                    </label>
                    <button type="button" onClick={handleForgotPassword} className="rounded text-[13px] font-medium text-primary hover:text-primary-dim">
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/70" aria-hidden="true" />
                    <input
                      className={`${inputCls} pl-10 pr-11`}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      aria-invalid={!!form.formState.errors.password}
                      aria-describedby={form.formState.errors.password ? "password-error" : undefined}
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-on-surface/5 hover:text-on-surface"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p id="password-error" className="mt-1.5 text-[12px] text-error">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <button className={`${btn.dark} ${btn.lg} mt-2 w-full`} type="submit" disabled={isLoading || isValidating}>
                  {isLoading || isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Signing In…
                    </>
                  ) : (
                    <>
                      Sign In to {activePortal === "hr" ? "HR Portal" : "Employee Portal"}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="mt-8 text-center text-[12px] text-on-surface-variant">
              Role-based access · Every action is audit-logged
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
