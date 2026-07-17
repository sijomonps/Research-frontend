"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiGet, apiPostJson } from "@/lib/api";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  roles: string[];
  department?: string;
  researchCenter?: any;
  guide?: any;
  status?: string;
  requirePasswordChange?: boolean;
  designation?: string;
  uniqueId?: string;
  avatar?: string;
  academicYear?: string;
  preferences?: any;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const syncUserToLocalStorage = (resolvedUser: User) => {
    if (typeof window === "undefined") return;

    const role = resolvedUser.role || resolvedUser.roles?.[0] || "scholar";
    const userIdKey = resolvedUser._id;

    if (userIdKey && resolvedUser.preferences) {
      // Restore preferences
      Object.entries(resolvedUser.preferences).forEach(([key, val]) => {
        let finalKey = key;
        if (key.startsWith(`${role}_`)) {
          const suffix = key.slice(role.length + 1);
          if (!suffix.startsWith(`${userIdKey}_`)) {
            finalKey = `${role}_${userIdKey}_${suffix}`;
          }
        }
        localStorage.setItem(finalKey, typeof val === "string" ? val : JSON.stringify(val));
      });
    } else if (resolvedUser.preferences) {
      // Fallback
      Object.entries(resolvedUser.preferences).forEach(([key, val]) => {
        localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val));
      });
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        if (isMounted) setLoading(true);

        // Pre-check: If no token exists in cookies or localStorage, user is definitely not logged in.
        // We can skip the API call entirely to prevent unnecessary 401 console logs and network traffic.
        let token = typeof window !== "undefined" ? Cookies.get("token") : undefined;
        if (!token && typeof window !== "undefined") {
          token = localStorage.getItem("token") || undefined;
        }

        if (!token) {
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          const isProtected = ["/admin", "/faculty", "/scholar", "/library"].some(
            (prefix) => pathname.startsWith(prefix)
          );
          if (isProtected) {
            router.push("/");
          }
          return;
        }
        
        // Fetch current user from backend auth/me
        const res = await apiGet<{ item?: User; user?: User }>("/auth/me");
        if (!isMounted) return;

        const resolvedUser = res ? (res.item || res.user) : null;

        if (resolvedUser) {
          setUser(resolvedUser);
          syncUserToLocalStorage(resolvedUser);

          // Restore cookies/localStorage bidirectionally if one is missing
          if (typeof window !== "undefined") {
            const cookieToken = Cookies.get("token");
            const localToken = localStorage.getItem("token");
            if (cookieToken && !localToken) {
              localStorage.setItem("token", cookieToken);
            } else if (localToken && !cookieToken) {
              Cookies.set("token", localToken, { expires: 1, secure: true, sameSite: "lax" });
            }
          }

          // Force redirect if password change is required
          if (resolvedUser.requirePasswordChange) {
            const role = resolvedUser.role || resolvedUser.roles?.[0];
            let changePasswordPath = "/";
            if (role === "admin") changePasswordPath = "/admin/settings";
            else if (role === "faculty") changePasswordPath = "/faculty/profile/change-password";
            else if (role === "scholar") changePasswordPath = "/scholar/profile/change-password";
            else if (role === "library") changePasswordPath = "/library/profile/change-password";

            if (pathname !== changePasswordPath) {
              router.push(changePasswordPath);
            }
            return;
          }

          // If the user is on the login page and has a valid token, redirect to their home dashboard
          if (pathname === "/") {
            const role = resolvedUser.role || resolvedUser.roles?.[0];
            if (role === "admin") router.push("/admin");
            else if (role === "faculty") router.push("/faculty");
            else if (role === "scholar") router.push("/scholar");
            else if (role === "library") router.push("/library");
          }
        } else {
          setUser(null);
          Cookies.remove("token");
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
          }
          const isProtected = ["/admin", "/faculty", "/scholar", "/library"].some(
            (prefix) => pathname.startsWith(prefix)
          );
          if (isProtected) {
            router.push("/");
          }
        }
      } catch (error: any) {
        // Distinguish between authentic authentication failures (401 status) and other errors (network timeouts, 502, 503)
        const isAuthError = 
          error?.message === "Authentication required" || 
          error?.message === "Invalid or expired token" ||
          error?.message?.includes("status: 401") ||
          error?.message?.includes("401");

        if (!isAuthError) {
          console.error("Auto-auth resolution failed due to network/server timeout:", error);
          // Keep user session intact; don't clear token or redirect to login.
          if (isMounted) setLoading(false);
          return;
        }

        // Suppress expected guest/expired 401 errors from creating scary red console error logs
        if (error?.message !== "Authentication required" && error?.message !== "Invalid or expired token") {
          console.error("Auto-auth resolution failed (auth error):", error);
        }

        if (isMounted) setUser(null);
        Cookies.remove("token");
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        
          const isProtected = ["/admin", "/faculty", "/scholar", "/library"].some(
          (prefix) => pathname.startsWith(prefix)
        );
        if (isProtected) {
          router.push("/");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  const login = (token: string, userData: User) => {
    Cookies.set("token", token, { expires: 1, secure: true, sameSite: "lax" });
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }
    setUser(userData);
    syncUserToLocalStorage(userData);

    if (userData.requirePasswordChange) {
      const role = userData.role || userData.roles?.[0];
      let changePasswordPath = "/";
      if (role === "admin") changePasswordPath = "/admin/settings";
            else if (role === "faculty") changePasswordPath = "/faculty/profile/change-password";
      else if (role === "scholar") changePasswordPath = "/scholar/profile/change-password";
      else if (role === "library") changePasswordPath = "/library/profile/change-password";

      router.push(changePasswordPath);
      return;
    }

    const role = userData.role || userData.roles?.[0];
    if (role === "admin") router.push("/admin");
    else if (role === "faculty") router.push("/faculty");
    else if (role === "scholar") router.push("/scholar");
    else if (role === "library") router.push("/library");
  };

  const logout = async () => {
    try {
      await apiPostJson("/auth/logout", {});
    } catch (e) {
      console.error("Failed to clear server session:", e);
    }
    Cookies.remove("token");
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    setUser(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
