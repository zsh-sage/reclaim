"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
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
      setIsLoading(true);
      try {
        const result = await loginAction(email, password);

        if (result.error) {
          setIsLoading(false);
          throw new Error(result.error);
        }

        _sessionCache = { user: result.user, ts: Date.now() };
        setUser(result.user);
        setIsLoading(false);

        // Redirect based on role
        if (result.user?.role === "HR") {
          router.push("/hr/dashboard");
        } else {
          router.push("/employee/dashboard");
        }
      } catch (error) {
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
      {children}
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
