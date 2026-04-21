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
import api from "@/lib/api";

interface User {
  id: number;
  email: string;
  name: string;
  role: "HR" | "Employee";
  department?: string;
  privilege_level?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // 1. Function to verify the token and load user data
  const verifyToken = useCallback(async (tokenToVerify: string) => {
    try {
      // Set the header for this specific request
      const response = await api.get("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${tokenToVerify}` },
      });
      
      setUser(response.data);
      setToken(tokenToVerify);
      
      // Also set the global header for future requests
      api.defaults.headers.common["Authorization"] = `Bearer ${tokenToVerify}`;
    } catch (error) {
      console.error("Token verification failed:", error);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Load token on app start
  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) {
      verifyToken(storedToken);
    } else {
      console.log("No token");
      setIsLoading(false);
    }
  }, [verifyToken]);

  // 3. Login Function
  const login = async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const form_data = new URLSearchParams();
        form_data.append("username", email);
        form_data.append("password", password);

        const response = await api.post("/api/v1/auth/login", form_data, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const { access_token } = response.data;
        
        // 1. Save token to storage immediately
        localStorage.setItem("access_token", access_token);
        document.cookie = `access_token=${access_token}; path=/; max-age=86400; SameSite=Lax`; 
        setToken(access_token);
        
        // We NO LONGER need to manually set api.defaults.headers
        // because your api.ts interceptor will automatically catch 
        // the token from localStorage for the next request!

        // 2. Fetch user profile (interceptor attaches token automatically)
        const userResponse = await api.get("/api/v1/auth/me");
        const userData = userResponse.data;

        // 3. Update state
        setUser(userData);

        console.log("logged in");

        // 4. Redirect
        if (userData.role === "HR") {
          console.log("redirecting ...");
          router.push("/hr/dashboard");
        } else {
          router.push("/employee/submit");
        }
      } catch (error: any) {
        console.error("Login failed:", error.response?.data || error.message);
        setIsLoading(false); 
        throw error;
      }
    };

  const logout = useCallback(() => {
    console.warn("🚨 LOGOUT FUNCTION WAS TRIGGERED! 🚨");
    console.trace(); // This will print exactly who called this function
    localStorage.removeItem("access_token");
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
    router.push("/login");
  }, [router]);

  // 4. Axios Interceptor: Catch 401 errors globally
  // If the token expires while using the app, this will log the user out
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.log("unauthorized");
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  console.log("checking fine");
  return context;
};
