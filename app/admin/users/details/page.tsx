"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { adminNav } from "@/data/roleNav";
import { apiGet, apiPatchJson, type ApiItemResponse, type ApiListResponse } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type User = {
  _id: string;
  name: string;
  email: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  department?: string;
  status?: string;
  phone?: string;
  researchCenter?: { _id?: string; name?: string; code?: string } | string | null;
  guide?: { name?: string; email?: string } | null;
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  coordinator: "Research Center Coordinator",
  faculty: "Faculty",
  scholar: "Scholar",
  research_guide: "Research Guide",
};

function AdminUserDetailsContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("id") ?? "";
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setError("Missing user id.");
      setLoading(false);
      return;
    }
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiGet<ApiItemResponse<User>>(`/users/${userId}`);
        if (!isMounted) return;
        setUser(response.item);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load user");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const [researchCenters, setResearchCenters] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    apiGet<ApiListResponse<any>>("/research-centers")
      .then((res) => {
        if (isMounted) setResearchCenters(res.items || []);
      })
      .catch(console.error);
    return () => {
      isMounted = false;
    };
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    department: "",
    researchCenterId: "",
    phone: "",
    status: "Active",
    password: "",
    permissions: [] as string[],
  });

  useEffect(() => {
    if (user) {
      const derivedPerms = user.permissions || [];
      setEditForm({
        name: user.name || "",
        email: user.email || "",
        department: user.department || "",
        researchCenterId: (user.researchCenter && typeof user.researchCenter === "object" ? (user.researchCenter as any)._id : user.researchCenter) || "",
        phone: user.phone || "",
        status: user.status || "Active",
        password: "",
        permissions: derivedPerms,
      });
    }
  }, [user, isEditing]);

  const isFacultyType = user?.role === "faculty";

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload: any = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        status: editForm.status,
      };

      if (isFacultyType) {
        payload.researchCenterId = editForm.researchCenterId || null;
        const matched = researchCenters.find((c) => c._id === editForm.researchCenterId);
        if (matched) {
          payload.department = matched.department || matched.name;
        } else {
          payload.department = "";
        }
        payload.permissions = editForm.permissions;
      } else {
        payload.department = editForm.department;
      }

      if (editForm.password) {
        payload.password = editForm.password;
      }
      const response = await apiPatchJson<ApiItemResponse<User>>(`/users/${userId}`, payload);
      setUser(response.item);
      setIsEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const roles = (user?.roles ?? (user?.role ? [user.role] : []))
    .map((role) => roleLabels[role] ?? role)
    .join(", ");

  return (
    <PageLayout
      title="User Details"
      userName={user?.name || "Admin"}
      roleLabel="Administrator"
      navItems={adminNav}
      activeItem="Users"
    >
      <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)]">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--maroon-700)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>

        <div className="mt-4">
          {loading ? <p className="text-sm text-slate-500">Loading user...</p> : null}
          {!loading && !userId ? <p className="text-sm text-slate-500">Missing user id.</p> : null}
          {!loading && error ? <p className="text-sm text-red-600">Failed to load: {error}</p> : null}
          {!loading && !error && user ? (
            <div className="space-y-5">
              {isEditing ? (
                <div className="grid gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 text-sm text-slate-700 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</label>
                    <input className="mt-1 w-full rounded-xl border border-[color:var(--border)] px-3 py-2" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                    <input className="mt-1 w-full rounded-xl border border-[color:var(--border)] px-3 py-2" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                  {isFacultyType ? (
                    <>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Research Center</label>
                        <select
                          className="mt-1 w-full rounded-xl border border-[color:var(--border)] px-3 py-2 bg-white"
                          value={editForm.researchCenterId}
                          onChange={(e) => setEditForm({ ...editForm, researchCenterId: e.target.value })}
                        >
                          <option value="">Select Research Center</option>
                          {researchCenters.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Faculty Permissions (Optional)</label>
                        <div className="mt-2 flex flex-wrap gap-4 rounded-xl border border-[color:var(--border)] bg-white p-3 text-xs text-slate-600 shadow-sm">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.permissions.includes("research_guide")}
                              onChange={(e) => {
                                const nextPerms = e.target.checked
                                  ? Array.from(new Set([...editForm.permissions, "research_guide"]))
                                  : editForm.permissions.filter((p) => p !== "research_guide");
                                setEditForm({ ...editForm, permissions: nextPerms });
                              }}
                            />
                            <span>Research Guide</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.permissions.includes("coordinator")}
                              onChange={(e) => {
                                const nextPerms = e.target.checked
                                  ? Array.from(new Set([...editForm.permissions, "coordinator"]))
                                  : editForm.permissions.filter((p) => p !== "coordinator");
                                setEditForm({ ...editForm, permissions: nextPerms });
                              }}
                            />
                            <span>Research Center Coordinator</span>
                          </label>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department/Department Name</label>
                      <input
                        className="mt-1 w-full rounded-xl border border-[color:var(--border)] px-3 py-2"
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</label>
                    <input className="mt-1 w-full rounded-xl border border-[color:var(--border)] px-3 py-2" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                    <select className="mt-1 w-full rounded-xl border border-[color:var(--border)] px-3 py-2" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="PendingApproval">Pending Approval</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">New Password (leave blank to keep current)</label>
                    <input type="password" placeholder="••••••••" className="mt-1 w-full rounded-xl border border-[color:var(--border)] px-3 py-2" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                  </div>
                  <div className="col-span-1 flex items-end gap-2 md:col-span-2">
                    <button onClick={handleSave} disabled={saving} className="rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button onClick={() => setIsEditing(false)} className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs font-semibold text-slate-600">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="font-display text-xl text-[color:var(--maroon-900)]">{user.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                    </div>
                    <button onClick={() => setIsEditing(true)} className="rounded-full border border-[color:var(--border)] px-4 py-1.5 text-xs font-semibold text-[color:var(--maroon-700)] hover:bg-slate-50">
                      Edit Details
                    </button>
                  </div>
                  <div className="grid gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 text-sm text-slate-700 md:grid-cols-2">
                    <p>
                      <span className="font-semibold">Roles:</span> {roles || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold">Department:</span> {user.department || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold">Phone:</span> {user.phone || "N/A"}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-semibold">Status:</span>
                      <StatusBadge status={user.status ?? "Active"} />
                    </p>
                    <p>
                      <span className="font-semibold">Research Center:</span>{" "}
                      {(user.researchCenter && typeof user.researchCenter === "object" ? user.researchCenter.name : user.researchCenter) || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold">Guide:</span> {user.guide?.name ?? "N/A"}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </PageLayout>
  );
}

export default function AdminUserDetailsPage() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading...</p>}>
      <AdminUserDetailsContent />
    </Suspense>
  );
}
