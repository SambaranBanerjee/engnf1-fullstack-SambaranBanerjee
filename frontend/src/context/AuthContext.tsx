import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest, configureApiClient } from "../services/api";
import type { LoginResponse, RegisterResponse, User } from "../types/auth";
import { AuthContext, type AuthContextValue } from "./auth.context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    configureApiClient({
      getToken: () => token,
      onUnauthorized: clearSession,
    });
  }, [token, clearSession]);

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      const data = await apiRequest<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<User> => {
      const data = await apiRequest<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: { name, email, password },
      });
      return data.user;
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === "ADMIN",
      login,
      register,
      logout,
    }),
    [user, token, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}