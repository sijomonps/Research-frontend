"use client";

import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { libraryNav } from "@/data/roleNav";
import { useAuth } from "@/components/AuthProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPostJson } from "@/lib/api";

const inputClass =
  "mt-2 w-full rounded-xl border border-[color:var(--border)] bg-white px-3 pr-10 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--maroon-600)]";

export default function LibraryChangePasswordPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await apiPostJson<{ token: string; user: any }>("/auth/change-password", {
        oldPassword,
        newPassword,
      });
      if (res && res.token && res.user) {
        login(res.token, res.user);
      }
      setSuccess("Password updated successfully! Redirecting...");
      setTimeout(() => router.push("/library"), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="Change Password"
      userName={user?.name || "Librarian"}
      roleLabel="Librarian"
      navItems={libraryNav}
      activeItem="Dashboard"
    >
      <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)] max-w-lg">
        <button
          type="button"
          onClick={() => router.push("/library")}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--maroon-700)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <h2 className="mt-4 font-display text-lg text-[color:var(--maroon-900)]">
          Change Password
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {user?.requirePasswordChange
            ? "You must set a new password before accessing the portal."
            : "Choose a strong password for your librarian account."}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-600">
            {success}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="mt-6 space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="lib-currentPassword">
              Current password
            </label>
            <div className="relative">
              <input
                id="lib-currentPassword"
                type={showOldPassword ? "text" : "password"}
                required
                className={inputClass}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="lib-newPassword">
              New password
            </label>
            <div className="relative">
              <input
                id="lib-newPassword"
                type={showNewPassword ? "text" : "password"}
                required
                minLength={6}
                className={inputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="lib-confirmPassword">
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="lib-confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[color:var(--maroon-800)] px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[color:var(--maroon-900)] transition disabled:opacity-75"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>
    </PageLayout>
  );
}
