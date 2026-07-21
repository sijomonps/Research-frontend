"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiGet, apiPostJson } from "@/lib/api";
import { usePathname, useRouter } from "next/navigation";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  roles: string[];
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
  department?: string;
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

  // Listen for global auth errors triggered by any API call
  useEffect(() => {
    const handleAuthError = (event: Event) => {
      const customEvent = event as CustomEvent;
      const msg = customEvent.detail?.message || "Session expired";
      
      // We only care about actual authentication/authorization drops
      if (
        msg === "Authentication required" || 
        msg === "Invalid or expired token" ||
        msg === "User not found" ||
        msg.includes("401") ||
        msg.includes("404")
      ) {
        setUser(null);
        
        const isProtected = ["/admin", "/faculty", "/scholar", "/library"].some(
          (prefix) => pathname.startsWith(prefix)
        );
        if (isProtected) {
          router.push("/?error=" + encodeURIComponent("Your session has expired. Please log in again."));
        }
      }
    };

    window.addEventListener("auth-error", handleAuthError);
    return () => window.removeEventListener("auth-error", handleAuthError);
  }, [pathname, router]);

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        if (isMounted) setLoading(true);

        // Fetch current user from backend auth/me
        // The browser will automatically include the HttpOnly cookie if it exists.
        const res = await apiGet<{ item?: User; user?: User }>("/auth/me");
        if (!isMounted) return;

        const resolvedUser = res ? (res.item || res.user) : null;

        if (resolvedUser) {
          setUser(resolvedUser);
          syncUserToLocalStorage(resolvedUser);

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
          const isProtected = ["/admin", "/faculty", "/scholar", "/library"].some(
            (prefix) => pathname.startsWith(prefix)
          );
          if (isProtected) {
            router.push("/");
          }
        }
      } catch (error: any) {
        // Distinguish between authentic authentication failures (401/404 status) and other errors (network timeouts, 502, 503)
        const isAuthError = 
          error?.message === "Authentication required" || 
          error?.message === "Invalid or expired token" ||
          error?.message === "User not found" ||
          error?.message?.includes("status: 401") ||
          error?.message?.includes("status: 404") ||
          error?.message?.includes("401") ||
          error?.message?.includes("404");

        if (!isAuthError) {
          console.error("Auto-auth resolution failed due to network/server timeout:", error);
          // Keep user session intact; don't clear token or redirect to login.
          if (isMounted) setLoading(false);
          return;
        }

        if (isMounted) setUser(null);
        
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
  }, []);

  const login = (token: string, userData: User) => {
    if (typeof window !== "undefined" && token) {
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
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    try {
      await apiPostJson("/auth/logout", {});
    } catch (e) {
      console.error("Failed to clear server session:", e);
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
