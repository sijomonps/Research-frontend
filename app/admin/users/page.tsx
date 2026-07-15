"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/Table";
import { StatusBadge } from "@/components/StatusBadge";
import { adminNav } from "@/data/roleNav";
import { apiDelete, apiGet, apiPostJson, apiPatchJson, type ApiListResponse } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  roles?: string[];
  department?: string;
  status?: string;
  avatar?: string;
  preferences?: any;
  researchCenter?: { _id?: string; name?: string; code?: string } | null;
  guide?: { _id?: string; name?: string; email?: string } | null;
};

type ResearchCenter = {
  _id: string;
  name: string;
  code?: string;
  department?: string;
};

type Guide = {
  _id: string;
  name: string;
  email?: string;
  researchCenter?: { _id?: string; name?: string; code?: string } | null;
  department?: string;
};

type Department = {
  _id: string;
  name: string;
};

const columns = [
  { key: "avatar", label: "Photo" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "roles", label: "Roles" },
  { key: "researchCenter", label: "Research Center" },
  { key: "guide", label: "Guide" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action", align: "right" as const },
];

const roleLabels: Record<string, string> = {
  admin: "Admin",
  coordinator: "Research Center Coordinator",
  faculty: "Faculty",
  scholar: "Scholar",
  research_guide: "Research Guide",
};

const roleOptions = [
  "admin",
  "coordinator",
  "faculty",
  "research_guide",
  "scholar",
];

const inputClass =
  "mt-2 w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-xs text-slate-700 shadow-sm";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [researchCenters, setResearchCenters] = useState<ResearchCenter[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    role: "scholar",
    permissions: [] as string[],
    researchCenterId: "",
    guideId: "",
  });

  const loadUsers = useCallback(async () => {
    const response = await apiGet<ApiListResponse<User>>("/users");
    setUsers(response.items);
  }, []);

  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);

  const handleApproveUser = async (user: User) => {
    try {
      setApprovingUserId(user._id);
      await apiPatchJson(`/users/${user._id}`, { status: "Active" });
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve user";
      alert(message);
    } finally {
      setApprovingUserId(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [usersRes, centersRes, guidesRes, departmentsRes] = await Promise.all([
          apiGet<ApiListResponse<User>>("/users"),
          apiGet<ApiListResponse<ResearchCenter>>("/research-centers"),
          apiGet<ApiListResponse<Guide>>("/users?role=research_guide"),
          apiGet<ApiListResponse<Department>>("/departments"),
        ]);
        if (!isMounted) return;
        setUsers(usersRes.items);
        setResearchCenters(centersRes.items);
        setGuides(guidesRes.items);
        setDepartments(departmentsRes.items);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : "Failed to load users";
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [loadUsers]);

  const handleFormChange = (
    field: keyof typeof formState,
    value: any
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handlePermissionToggle = (permission: string, checked: boolean) => {
    setFormState((prev) => {
      const nextPerms = checked
        ? Array.from(new Set([...prev.permissions, permission]))
        : prev.permissions.filter((item) => item !== permission);
      return {
        ...prev,
        permissions: nextPerms,
      };
    });
  };

  const requiresResearchCenter = formState.role === "faculty";
  const requiresGuide = formState.role === "scholar";

  const handleCreateUser = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);

      const mainRole = formState.role;

      if (requiresResearchCenter && !formState.researchCenterId) {
        setSaveError("Research center is required for Faculty.");
        setSaving(false);
        return;
      }

      if (requiresGuide && !formState.guideId) {
        setSaveError("Research guide is required for Scholars.");
        setSaving(false);
        return;
      }

      let finalCenterId = formState.researchCenterId;
      let finalDept = "";

      if (mainRole === "scholar") {
        const selectedGuide = guides.find((g) => g._id === formState.guideId);
        if (selectedGuide) {
          finalCenterId = selectedGuide.researchCenter?._id || (selectedGuide.researchCenter as any) || "";
          finalDept = selectedGuide.researchCenter?.name || selectedGuide.department || "";
        }
      } else if (mainRole === "faculty") {
        const selectedCenter = researchCenters.find((c) => c._id === formState.researchCenterId);
        if (selectedCenter) {
          finalDept = selectedCenter.department || "";
        }
      }

      const payload = {
        name: formState.name.trim(),
        email: formState.email.trim(),
        role: mainRole,
        roles: [mainRole],
        permissions: mainRole === "faculty" ? formState.permissions : [],
        department: finalDept || undefined,
        researchCenterId: finalCenterId || undefined,
        guideId: requiresGuide ? formState.guideId : undefined,
      };

      await apiPostJson("/users", payload);
      setSaveSuccess("User created successfully.");
      setFormState({
        name: "",
        email: "",
        role: "scholar",
        permissions: [],
        researchCenterId: "",
        guideId: "",
      });
      await loadUsers();
      
      const guidesRes = await apiGet<ApiListResponse<Guide>>(
        "/users?role=research_guide"
      );
      setGuides(guidesRes.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create user";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = useCallback(async (user: User) => {
    const confirmed = window.confirm(`Delete user "${user.name}"?`);
    if (!confirmed) return;

    try {
      setDeletingUserId(user._id);
      setError(null);
      await apiDelete<{ message: string }>(`/users/${user._id}`);
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      setError(message);
    } finally {
      setDeletingUserId(null);
    }
  }, [loadUsers]);

  const rows = useMemo(
    () =>
      users.map((user) => {
        const avatarUrl = user.avatar || user.preferences?.scholar_avatar || user.preferences?.faculty_avatar || user.preferences?.research_guide_avatar || user.preferences?.coordinator_avatar;
        return {
        id: user._id,
        avatar: (
          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-slate-400">{user.name.substring(0, 2).toUpperCase()}</span>
            )}
          </div>
        ),
        name: user.name,
        email: user.email,
        roles: (user.roles ?? (user.role ? [user.role] : []))
          .map((role) => roleLabels[role] ?? role)
          .join(", ") || "N/A",
        researchCenter: user.researchCenter?.name ?? "N/A",
        guide: user.guide?.name ?? "N/A",
        department: user.department || "N/A",
        status: <StatusBadge status={user.status ?? "Active"} />,
        action: (
          <div className="flex justify-end gap-2">
            {user.status === "PendingApproval" && user.role !== "scholar" && (
              <button
                type="button"
                onClick={() => handleApproveUser(user)}
                disabled={approvingUserId === user._id}
                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {approvingUserId === user._id ? "Approving..." : "Approve"}
              </button>
            )}
            <Link
              href={`/admin/users/details?id=${user._id}`}
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--maroon-700)]"
            >
              View
            </Link>
            <button
              type="button"
              onClick={() => handleDeleteUser(user)}
              disabled={deletingUserId === user._id}
              className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 disabled:opacity-60"
            >
              {deletingUserId === user._id ? "Deleting..." : "Delete"}
            </button>
          </div>
        )
      };
    }),
    [deletingUserId, approvingUserId, handleDeleteUser, users]
  );

  return (
    <PageLayout
      title="Users"
      userName={user?.name || "Admin"}
      roleLabel="Administrator"
      navItems={adminNav}
      activeItem="Users"
    >
      <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] pb-4">
          <div>
            <h2 className="font-display text-lg text-[color:var(--maroon-900)]">
              Users
            </h2>
            <p className="text-sm text-slate-500">
              Manage scholars, faculty, coordinators, and admin accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Close" : "Add User"}
          </button>
        </div>
        {showForm ? (
          <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Create user
            </p>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="user-name">
                  Name
                </label>
                <input
                  id="user-name"
                  className={inputClass}
                  value={formState.name}
                  onChange={(event) => handleFormChange("name", event.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="user-email">
                  Email
                </label>
                <input
                  id="user-email"
                  className={inputClass}
                  value={formState.email}
                  onChange={(event) => handleFormChange("email", event.target.value)}
                  placeholder="name@university.edu"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="user-role">
                  Primary Role
                </label>
                <select
                  id="user-role"
                  className={inputClass}
                  value={formState.role}
                  onChange={(event) => handleFormChange("role", event.target.value)}
                >
                  <option value="scholar">Scholar</option>
                  <option value="faculty">Faculty Member</option>
                  <option value="admin">Administrator</option>
                  <option value="library">Librarian</option>
                </select>
              </div>

              {formState.role === "faculty" && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Faculty Permissions (Optional)
                  </label>
                  <div className="mt-2 flex flex-wrap gap-4 rounded-xl border border-[color:var(--border)] bg-white p-3 text-xs text-slate-600 shadow-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formState.permissions.includes("research_guide")}
                        onChange={(event) => handlePermissionToggle("research_guide", event.target.checked)}
                      />
                      <span>Research Guide</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formState.permissions.includes("coordinator")}
                        onChange={(event) => handlePermissionToggle("coordinator", event.target.checked)}
                      />
                      <span>Research Center Coordinator</span>
                    </label>
                  </div>
                </div>
              )}

              {requiresResearchCenter ? (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="user-research-center">
                    Research Center
                  </label>
                  <select
                    id="user-research-center"
                    className={inputClass}
                    value={formState.researchCenterId}
                    onChange={(event) => handleFormChange("researchCenterId", event.target.value)}
                  >
                    <option value="">Select Research Center</option>
                    {researchCenters.map((center) => (
                      <option key={center._id} value={center._id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {requiresGuide ? (
                <>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="user-guide">
                      Research Guide
                    </label>
                    <select
                      id="user-guide"
                      className={inputClass}
                      value={formState.guideId}
                      onChange={(event) => handleFormChange("guideId", event.target.value)}
                    >
                      <option value="">Select Research Guide</option>
                      {guides.map((guide) => (
                        <option key={guide._id} value={guide._id}>
                          {guide.name} ({guide.department || "No Department"})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Research Center (Auto-Assigned)
                    </label>
                    <div className="mt-2 rounded-xl border border-[color:var(--border)] bg-slate-100 px-3 py-2 text-xs text-slate-500 shadow-sm">
                      {(() => {
                        const selectedGuideObj = guides.find((g) => g._id === formState.guideId);
                        return selectedGuideObj?.researchCenter?.name || "Auto-assigned from Guide";
                      })()}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCreateUser}
                disabled={saving}
                className="rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
              >
                {saving ? "Saving..." : "Create user"}
              </button>
              {saveError ? (
                <span className="text-xs text-red-600">{saveError}</span>
              ) : null}
              {saveSuccess ? (
                <span className="text-xs text-emerald-600">{saveSuccess}</span>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading users...</p>
          ) : error ? (
            <p className="text-sm text-red-600">Failed to load users: {error}</p>
          ) : (
            <DataTable columns={columns} rows={rows} />
          )}
        </div>
      </section>
    </PageLayout>
  );
}
