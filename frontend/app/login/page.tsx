"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, Eye, EyeOff, ArrowRight, PersonStanding, UserCog } from "lucide-react"; // Using lucide-react for icons

const formSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    try {
      await login(values.email, values.password);
      // Redirection handled by AuthContext
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    }
  }

  const handleDemoLogin = async (email: string, role: "HR" | "Employee") => {
    setError(null);
    try {
      // For demo purposes, we'll use a generic password. In a real app,
      // you might have specific demo accounts or a different flow.
      await login(email, "password"); // Assuming a default password for demo
    } catch (err: any) {
      setError(err.message || `Demo login for ${role} failed.`);
    }
  };

  return (
    <main className="flex-grow flex w-full min-h-screen">
      {/* Left Side: Split Gradient Anchor */}
      <div className="hidden lg:flex w-1/2 split-gradient relative overflow-hidden items-center justify-center p-12">
        {/* Decorative Elements */}
        <div
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-overlay"
          data-alt="Abstract fluid geometry with soft light interacting with translucent materials, creating a sense of deep, corporate technology structure."
        ></div>
        <div className="relative z-10 text-on-primary max-w-xl">
          <div className="mb-8">
            <span className="material-symbols-outlined text-6xl">blur_on</span>
          </div>
          <h1 className="font-headline text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            The Kinetic Workspace.
          </h1>
          <p className="text-lg opacity-90 font-light leading-relaxed">
            Access your intuitive digital environment. Designed for clarity,
            precision, and a seamless operational flow.
          </p>
        </div>
        {/* Floating accent blobs to break rigid template feel */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-tertiary rounded-full blur-[120px] opacity-40"></div>
        <div className="absolute top-1/4 -right-24 w-72 h-72 bg-primary rounded-full blur-[100px] opacity-30"></div>
      </div>
      {/* Right Side: Interaction Canvas */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-surface">
        <div className="w-full max-w-md">
          {/* Brand Header (Mobile Only) */}
          <div className="lg:hidden mb-12 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl">
              blur_on
            </span>
            <h2 className="font-headline text-2xl font-black tracking-tighter text-primary">
              Reclaim
            </h2>
          </div>
          {/* Main Glassmorphic Card */}
          <div className="glass-card rounded-[2rem] p-8 sm:p-10 shadow-ambient-lg border border-white/40">
            {/* Header */}
            <div className="mb-10 text-center">
              <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface mb-3">
                Welcome to Reclaim
              </h2>
              <p className="text-on-surface-variant text-sm">
                Sign in to continue your session
              </p>
            </div>
            {/* Portal Toggle */}
            <div className="flex p-1 bg-surface-container-high rounded-full mb-8 relative">
              <button className="flex-1 py-2.5 text-sm font-semibold rounded-full bg-surface-container-lowest text-primary shadow-sm transition-all relative z-10">
                Employee Portal
              </button>
              <button className="flex-1 py-2.5 text-sm font-medium rounded-full text-on-surface-variant hover:text-on-surface transition-all relative z-10">
                HR Dashboard
              </button>
            </div>
            {/* Form Area */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Error Display */}
              {error && (
                <div className="bg-error-container text-error p-3 rounded-lg text-sm text-center">
                  {error}
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-2">
                <label
                  className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                  htmlFor="email"
                >
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors w-5 h-5" />
                  <input
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest/60 backdrop-blur-md border border-outline/20 rounded-xl text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                    id="email"
                    placeholder="name@company.com"
                    type="email"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-error text-xs mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>
              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <a
                    className="text-xs font-semibold text-primary hover:text-primary-dim hover:underline decoration-primary/30 underline-offset-4 transition-all"
                    href="#"
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors w-5 h-5" />
                  <input
                    className="w-full pl-12 pr-12 py-3.5 bg-surface-container-lowest/60 backdrop-blur-md border border-outline/20 rounded-xl text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                    id="password"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                  {form.formState.errors.password && (
                    <p className="text-error text-xs mt-1">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </div>
              {/* Submit Button */}
              <button
                className="w-full mt-8 py-4 px-6 bg-gradient-to-r from-primary to-primary-dim text-white rounded-xl font-headline font-semibold text-lg hover:shadow-[0_0_20px_rgba(147,150,255,0.4)] active:scale-[0.98] transition-all duration-200 flex justify-center items-center gap-2"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="text-xl w-5 h-5" />
                  </>
                )}
              </button>
            </form>
            <div className="mt-10 pt-6 border-t border-outline/10 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60 mb-4">
                Quick Demo Accounts
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  className="group flex items-center gap-2 px-4 py-2 bg-surface-container-lowest/40 backdrop-blur-sm border border-outline/10 rounded-full text-xs font-semibold text-on-surface-variant hover:text-primary hover:border-primary/30 hover:bg-white transition-all shadow-sm active:scale-95"
                  type="button"
                  onClick={() => handleDemoLogin("employee@example.com", "Employee")}
                >
                  <PersonStanding className="w-4 h-4" />
                  Employee Demo
                </button>
                <button
                  className="group flex items-center gap-2 px-4 py-2 bg-surface-container-lowest/40 backdrop-blur-sm border border-outline/10 rounded-full text-xs font-semibold text-on-surface-variant hover:text-tertiary hover:border-tertiary/30 hover:bg-white transition-all shadow-sm active:scale-95"
                  type="button"
                  onClick={() => handleDemoLogin("hr@example.com", "HR")}
                >
                  <UserCog className="w-4 h-4" />
                  Admin Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
