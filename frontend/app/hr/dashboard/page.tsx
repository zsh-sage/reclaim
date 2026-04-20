"use client";

import { useAuth } from "@/context/AuthContext";

export default function HRDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-6">
      <div className="glass-card rounded-[2rem] p-10 shadow-ambient-lg border border-white/40 max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <span className="material-symbols-outlined text-primary text-5xl">
            admin_panel_settings
          </span>
        </div>
        <h1 className="font-headline text-3xl font-bold text-primary mb-2">HR Dashboard</h1>
        <p className="text-on-surface-variant mb-8">Welcome back, {user?.name || "HR Admin"}!</p>
        
        <div className="bg-green-100 text-green-800 p-4 rounded-xl mb-8 font-medium border border-green-200">
          ✅ Successfully logged in as HR.
        </div>
        
        <button
          onClick={logout}
          className="w-full py-3 px-6 bg-surface-container-highest text-on-surface rounded-xl font-semibold hover:bg-surface-container-highest/80 transition-all shadow-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
