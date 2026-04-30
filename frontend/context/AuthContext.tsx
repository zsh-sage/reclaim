"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  login as loginAction,
  logout as logoutAction,
  getCurrentUser,
} from "@/lib/actions/auth";
import type { User } from "@/lib/api/types";

// Module-level cache — survives remounts within the same page lifecycle
let _sessionCache: { user: User | null; ts: number } | null = null;
const SESSION_TTL_MS = 30_000;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  // Reset isLoading whenever the route actually changes.
  // This is the reliable signal that router.push() has completed —
  // HRRoleGuard / EmployeeRoleGuard can then render their children.
  useEffect(() => {
    setIsLoading(false);
  }, [pathname]);

  // 1. Verify session on app start — skip if a fresh cache entry exists
  useEffect(() => {
    async function verifySession() {
      const now = Date.now();
      if (_sessionCache && now - _sessionCache.ts < SESSION_TTL_MS) {
        setUser(_sessionCache.user);
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await getCurrentUser();
        _sessionCache = { user: currentUser, ts: Date.now() };
        setUser(currentUser);
      } catch (error) {
        console.error("Session verification failed:", error);
        _sessionCache = null;
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    verifySession();
  }, []);

  // 2. Login — calls server action which sets HttpOnly cookie
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await loginAction(email, password);

        if (result.error) {
          throw new Error(result.error);
        }

        // Trigger the loading overlay AFTER successful credential check
        setIsLoading(true);
        _sessionCache = { user: result.user, ts: Date.now() };
        setUser(result.user);

        // Brief delay to show the loading experience, then redirect.
        // NOTE: setIsLoading(false) is intentionally NOT called here.
        // router.push() is non-blocking — it returns before the page actually
        // changes. Calling setIsLoading(false) after it would drop the overlay
        // while the user is still on the login page.
        // The login component will simply unmount when navigation completes.
        await new Promise(resolve => setTimeout(resolve, 1800));

        if (result.user?.role === "HR") {
          router.push("/hr/dashboard");
        } else {
          router.push("/employee/dashboard");
        }
      } catch (error) {
        // Only reset loading on failure so the form becomes interactive again
        setIsLoading(false);
        throw error;
      }
    },
    [router]
  );

  // 3. Logout — calls server action which deletes HttpOnly cookie
  const logout = useCallback(async () => {
    await logoutAction();
    _sessionCache = null;
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen bg-surface">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
