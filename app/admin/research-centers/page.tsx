"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Edit2, Trash2, X, Power } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/Table";
import { adminNav } from "@/data/roleNav";
import { apiDelete, apiGet, apiPostJson, apiPatchJson, type ApiListResponse } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type ResearchCenter = {
  _id: string;
  name: string;
  code: string;
  department: string;
  description?: string;
  officeLocation?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: string;
  coordinator?: { _id?: string; name?: string; email?: string } | null;
};

type User = {
  _id: string;
  name: string;
  email: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  department?: string;
  researchCenter?: { _id: string; name: string } | string | null;
};

type DepartmentOption = {
  _id: string;
  name: string;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9B0302]/20 focus:border-[#9B0302] transition-all";

export default function AdminResearchCentersPage() {
  const { user } = useAuth();
  const [centers, setCenters] = useState<ResearchCenter[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCenter, setEditingCenter] = useState<ResearchCenter | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    name: "",
    code: "",
    department: "",
    description: "",
    officeLocation: "",
    contactEmail: "",
    contactPhone: "",
    coordinatorId: "",
    status: "Active",
  });

  const [editFormState, setEditFormState] = useState({
    name: "",
    code: "",
    department: "",
    description: "",
    officeLocation: "",
    contactEmail: "",
    contactPhone: "",
    coordinatorId: "",
    status: "Active",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [centersRes, usersRes, deptsRes] = await Promise.all([
        apiGet<ApiListResponse<ResearchCenter>>("/research-centers"),
        apiGet<ApiListResponse<User>>("/users"),
        apiGet<ApiListResponse<DepartmentOption>>("/departments"),
      ]);

      setCenters(centersRes.items);
      setAllUsers(usersRes.items);
      setDepartments(deptsRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const coordinators = useMemo(() => {
    return allUsers.filter((u) =>
      u.role === "faculty" ||
      u.role === "coordinator" ||
      u.roles?.includes("faculty") ||
      u.roles?.includes("coordinator") ||
      u.permissions?.includes("coordinator")
    );
  }, [allUsers]);

  const handleFormChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditFormChange = (field: keyof typeof editFormState, value: string) => {
    setEditFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);

      if (!formState.name.trim() || !formState.code.trim() || !formState.department) {
        setSaveError("Name, Code and Department are required.");
        setSaving(false);
        return;
      }

      await apiPostJson("/research-centers", {
        name: formState.name.trim(),
        code: formState.code.trim().toUpperCase(),
        department: formState.department,
        description: formState.description.trim() || undefined,
        officeLocation: formState.officeLocation.trim() || undefined,
        contactEmail: formState.contactEmail.trim() || undefined,
        contactPhone: formState.contactPhone.trim() || undefined,
        coordinatorId: formState.coordinatorId || undefined,
        status: formState.status,
      });

      setSaveSuccess("Research Center created successfully.");
      setFormState({
        name: "",
        code: "",
        department: "",
        description: "",
        officeLocation: "",
        contactEmail: "",
        contactPhone: "",
        coordinatorId: "",
        status: "Active",
      });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to create research center");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (center: ResearchCenter) => {
    setEditingCenter(center);
    setEditFormState({
      name: center.name,
      code: center.code,
      department: center.department,
      description: center.description || "",
      officeLocation: center.officeLocation || "",
      contactEmail: center.contactEmail || "",
      contactPhone: center.contactPhone || "",
      coordinatorId: center.coordinator?._id || "",
      status: center.status || "Active",
    });
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleUpdate = async () => {
    if (!editingCenter) return;
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);

      if (!editFormState.name.trim() || !editFormState.code.trim() || !editFormState.department) {
        setSaveError("Name, Code and Department are required.");
        setSaving(false);
        return;
      }

      await apiPatchJson(`/research-centers/${editingCenter._id}`, {
        name: editFormState.name.trim(),
        code: editFormState.code.trim().toUpperCase(),
        department: editFormState.department,
        description: editFormState.description.trim() || undefined,
        officeLocation: editFormState.officeLocation.trim() || undefined,
        contactEmail: editFormState.contactEmail.trim() || undefined,
        contactPhone: editFormState.contactPhone.trim() || undefined,
        coordinatorId: editFormState.coordinatorId || undefined,
        status: editFormState.status,
      });

      setSaveSuccess("Research Center updated successfully.");
      setEditingCenter(null);
      await loadData();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update research center");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (center: ResearchCenter) => {
    try {
      const nextStatus = center.status === "Active" ? "Inactive" : "Active";
      await apiPatchJson(`/research-centers/${center._id}/status`, { status: nextStatus });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const handleDelete = async (center: ResearchCenter, facultyCount: number, scholarCount: number) => {
    if (facultyCount > 0 || scholarCount > 0) {
      alert("Cannot delete research center while faculty or scholars are assigned to it.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete research center "${center.name}"?`)) {
      return;
    }
    try {
      setLoading(true);
      await apiDelete(`/research-centers/${center._id}`);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: "name", label: "Centre Name" },
    { key: "department", label: "Department" },
    { key: "facultyCount", label: "Faculty Count" },
    { key: "guideCount", label: "Guide Count" },
    { key: "scholarCount", label: "Scholar Count" },
    { key: "status", label: "Status" },
    { key: "action", label: "Actions", align: "right" as const },
  ];

  const rows = useMemo(() => {
    return centers.map((center) => {
      const centerFaculty = allUsers.filter(
        (u) => {
          const rc = u.researchCenter;
          const userCenterId = (rc && typeof rc === "object") ? rc._id : rc;
          return userCenterId === center._id && u.role === "faculty";
        }
      );
      const centerGuides = allUsers.filter(
        (u) => {
          const rc = u.researchCenter;
          const userCenterId = (rc && typeof rc === "object") ? rc._id : rc;
          return userCenterId === center._id &&
            (u.role === "research_guide" || u.roles?.includes("research_guide") || u.permissions?.includes("research_guide"));
        }
      );
      const centerScholars = allUsers.filter(
        (u) => {
          const rc = u.researchCenter;
          const userCenterId = (rc && typeof rc === "object") ? rc._id : rc;
          return userCenterId === center._id && u.role === "scholar";
        }
      );

      return {
        id: center._id,
        name: center.name,
        department: center.department,
        facultyCount: centerFaculty.length,
        guideCount: centerGuides.length,
        scholarCount: centerScholars.length,
        status: (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            center.status === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {center.status}
          </span>
        ),
        action: (
          <div className="flex justify-end gap-2">
            <Link
              href={`/admin/research-centers/${center._id}`}
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--maroon-700)] hover:bg-slate-50 transition-colors"
            >
              Manage
            </Link>
            <button
              onClick={() => toggleStatus(center)}
              className={`rounded-full border p-1.5 text-xs font-semibold transition-colors ${
                center.status === "Active"
                  ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                  : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              }`}
              title={center.status === "Active" ? "Deactivate" : "Activate"}
            >
              <Power className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => startEdit(center)}
              className="rounded-full border border-slate-200 p-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              title="Edit"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleDelete(center, centerFaculty.length, centerScholars.length)}
              className="rounded-full border border-red-200 p-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      };
    });
  }, [centers, allUsers]);

  return (
    <PageLayout
      title="Research Centers"
      userName={user?.name || "Admin"}
      roleLabel="Administrator"
      navItems={adminNav}
      activeItem="Research Centers"
    >
      <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] pb-4">
          <div>
            <h2 className="font-display text-lg text-[color:var(--maroon-900)]">
              Research Centers
            </h2>
            <p className="text-sm text-slate-500">
              Create, edit, activate/deactivate, and oversee institution-wide research units.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setFormState({
                name: "",
                code: "",
                department: "",
                description: "",
                officeLocation: "",
                contactEmail: "",
                contactPhone: "",
                coordinatorId: "",
                status: "Active",
              });
              setEditingCenter(null);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[color:var(--maroon-950)] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Research Center
          </button>
        </div>

        {/* Create Modal / Form Overlay */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display text-base font-bold text-[color:var(--maroon-900)]">
                  Add Research Center
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="create-name">
                    Research Center Name
                  </label>
                  <input
                    id="create-name"
                    className={inputClass}
                    value={formState.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    placeholder="e.g. MCA Research Center"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="create-code">
                      Center Code
                    </label>
                    <input
                      id="create-code"
                      className={inputClass}
                      value={formState.code}
                      onChange={(e) => handleFormChange("code", e.target.value)}
                      placeholder="e.g. MCA"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="create-dept">
                      Department
                    </label>
                    <select
                      id="create-dept"
                      className={inputClass}
                      value={formState.department}
                      onChange={(e) => handleFormChange("department", e.target.value)}
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="create-description">
                    Description
                  </label>
                  <textarea
                    id="create-description"
                    className={`${inputClass} h-20 resize-none`}
                    value={formState.description}
                    onChange={(e) => handleFormChange("description", e.target.value)}
                    placeholder="Center purpose, focus area, etc."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="create-office">
                    Office Location
                  </label>
                  <input
                    id="create-office"
                    className={inputClass}
                    value={formState.officeLocation}
                    onChange={(e) => handleFormChange("officeLocation", e.target.value)}
                    placeholder="e.g. Room 403, Block B"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="create-email">
                      Contact Email
                    </label>
                    <input
                      id="create-email"
                      type="email"
                      className={inputClass}
                      value={formState.contactEmail}
                      onChange={(e) => handleFormChange("contactEmail", e.target.value)}
                      placeholder="e.g. mca@univ.edu"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="create-phone">
                      Contact Phone
                    </label>
                    <input
                      id="create-phone"
                      className={inputClass}
                      value={formState.contactPhone}
                      onChange={(e) => handleFormChange("contactPhone", e.target.value)}
                      placeholder="e.g. +91 9988776655"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="create-coordinator">
                      Coordinator
                    </label>
                    <select
                      id="create-coordinator"
                      className={inputClass}
                      value={formState.coordinatorId}
                      onChange={(e) => handleFormChange("coordinatorId", e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {coordinators.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="create-status">
                      Status
                    </label>
                    <select
                      id="create-status"
                      className={inputClass}
                      value={formState.status}
                      onChange={(e) => handleFormChange("status", e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60 hover:bg-[color:var(--maroon-950)] transition-colors"
                >
                  {saving ? "Creating..." : "Create Research Center"}
                </button>
              </div>
              {saveError && <p className="mt-2 text-xs text-red-600 text-right">{saveError}</p>}
              {saveSuccess && <p className="mt-2 text-xs text-emerald-600 text-right">{saveSuccess}</p>}
            </div>
          </div>
        )}

        {/* Edit Modal / Form Overlay */}
        {editingCenter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display text-base font-bold text-[color:var(--maroon-900)]">
                  Edit Research Center
                </h3>
                <button
                  onClick={() => setEditingCenter(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="edit-name">
                    Research Center Name
                  </label>
                  <input
                    id="edit-name"
                    className={inputClass}
                    value={editFormState.name}
                    onChange={(e) => handleEditFormChange("name", e.target.value)}
                    placeholder="Research Center Name"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="edit-code">
                      Center Code
                    </label>
                    <input
                      id="edit-code"
                      className={inputClass}
                      value={editFormState.code}
                      onChange={(e) => handleEditFormChange("code", e.target.value)}
                      placeholder="Center Code"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="edit-dept">
                      Department
                    </label>
                    <select
                      id="edit-dept"
                      className={inputClass}
                      value={editFormState.department}
                      onChange={(e) => handleEditFormChange("department", e.target.value)}
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="edit-description">
                    Description
                  </label>
                  <textarea
                    id="edit-description"
                    className={`${inputClass} h-20 resize-none`}
                    value={editFormState.description}
                    onChange={(e) => handleEditFormChange("description", e.target.value)}
                    placeholder="Center description"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="edit-office">
                    Office Location
                  </label>
                  <input
                    id="edit-office"
                    className={inputClass}
                    value={editFormState.officeLocation}
                    onChange={(e) => handleEditFormChange("officeLocation", e.target.value)}
                    placeholder="Office Location"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="edit-email">
                      Contact Email
                    </label>
                    <input
                      id="edit-email"
                      type="email"
                      className={inputClass}
                      value={editFormState.contactEmail}
                      onChange={(e) => handleEditFormChange("contactEmail", e.target.value)}
                      placeholder="Contact Email"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="edit-phone">
                      Contact Phone
                    </label>
                    <input
                      id="edit-phone"
                      className={inputClass}
                      value={editFormState.contactPhone}
                      onChange={(e) => handleEditFormChange("contactPhone", e.target.value)}
                      placeholder="Contact Phone"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="edit-coordinator">
                      Coordinator
                    </label>
                    <select
                      id="edit-coordinator"
                      className={inputClass}
                      value={editFormState.coordinatorId}
                      onChange={(e) => handleEditFormChange("coordinatorId", e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {coordinators.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="edit-status">
                      Status
                    </label>
                    <select
                      id="edit-status"
                      className={inputClass}
                      value={editFormState.status}
                      onChange={(e) => handleEditFormChange("status", e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingCenter(null)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={saving}
                  className="rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60 hover:bg-[color:var(--maroon-950)] transition-colors"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
              {saveError && <p className="mt-2 text-xs text-red-600 text-right">{saveError}</p>}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-xs text-slate-500">
            <Search className="h-4 w-4" />
            <span>Search research centers...</span>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500 animate-pulse">Loading research centers...</p>
          ) : error ? (
            <p className="text-sm text-red-600">
              Failed to load research centers: {error}
            </p>
          ) : (
            <DataTable columns={columns} rows={rows} />
          )}
        </div>
      </section>
    </PageLayout>
  );
}
