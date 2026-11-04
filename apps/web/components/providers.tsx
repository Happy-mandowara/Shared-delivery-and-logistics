"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { UserRole } from "@nationx/shared";
import { useRouter } from "next/navigation";
import { CartProvider } from "./cart-context";

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; user?: any; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoading: true,
  isDemoMode: false,
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute cache
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false, // Prevent aggressive network refetches on focus
            retry: 1,
          },
        },
      })
  );

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.data?.user) {
        const u = res.data.user;
        setUser({
          ...u,
          full_name: u.name || u.full_name || u.email,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password = "Password123!") => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.success && res.data?.user) {
        const u = res.data.user;
        setUser({
          ...u,
          full_name: u.name || u.full_name || u.email,
        });
        queryClient.clear();
        setIsLoading(false);
        return { success: true, user: u };
      } else {
        setIsLoading(false);
        return { success: false, error: res.error?.message || "Invalid credentials" };
      }
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || "Login request failed" };
    }
  };

  const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true" || process.env.NODE_ENV !== "production";

  const logout = async () => {
    await api.logout();
    setUser(null);
    queryClient.clear();
    router.push("/login");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user,
          role: user?.role || null,
          isLoading,
          isDemoMode,
          login,
          logout,
          refreshUser,
        }}
      >
        <CartProvider>{children}</CartProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

