"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, X, CheckCircle, XCircle } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/Table";
import { StatusBadge } from "@/components/StatusBadge";
import { facultyNav } from "@/data/roleNav";
import { apiGet, apiDelete, apiPostJson, apiPatchJson, type ApiListResponse } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type Scholar = {
  _id: string;
  name?: string;
  email?: string;
  department?: string;
  status?: string;
  guide?: { _id?: string; name?: string } | null;
};

const activeColumns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "department", label: "Research Center" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action", align: "right" as const },
];

const pendingColumns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "department", label: "Research Center" },
  { key: "action", label: "Action", align: "right" as const },
];

export default function FacultyScholarsPage() {
  const { user } = useAuth();
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newScholar, setNewScholar] = useState({ name: "", email: "", department: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [scholarsRes, deptsRes] = await Promise.all([
          apiGet<ApiListResponse<Scholar>>("/users?role=scholar"),
          apiGet<ApiListResponse<any>>("/departments"),
        ]);
        if (!isMounted) return;
        setScholars(scholarsRes.items);
        setDepartments(deptsRes.items);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load scholars");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  // Pending requests: scholars with no guide or guide matching this user,
  // and status PendingApproval
  const pendingScholars = useMemo(() =>
    scholars.filter(
      (s) =>
        s.status === "PendingApproval" &&
        (
          !s.guide ||
          s.guide?._id === user?._id ||
          (s.guide as any) === user?._id
        )
    ),
    [scholars, user]
  );

  // Active scholars whose guide is this user
  const myScholars = useMemo(() =>
    scholars.filter(
      (s) =>
        s.status !== "PendingApproval" &&
        (
          s.guide?._id === user?._id ||
          (s.guide as any) === user?._id
        )
    ),
    [scholars, user]
  );

  const handleApprove = async (scholar: Scholar) => {
    setProcessingId(scholar._id);
    try {
      await apiPatchJson(`/users/${scholar._id}`, { status: "Active" });
      setScholars((prev) =>
        prev.map((s) => s._id === scholar._id ? { ...s, status: "Active" } : s)
      );
    } catch (err) {
      alert("Failed to approve scholar.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (scholar: Scholar) => {
    if (!window.confirm(`Reject sign-up request from ${scholar.name}?`)) return;
    setProcessingId(scholar._id);
    try {
      await apiDelete(`/users/${scholar._id}`);
      setScholars((prev) => prev.filter((s) => s._id !== scholar._id));
    } catch (err) {
      alert("Failed to reject scholar request.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadReport = async (scholar: Scholar) => {
    try {
      const submissionRes = await apiGet<ApiListResponse<any>>(`/submissions?scholarId=${scholar._id}`);
      const submissions = submissionRes.items || [];
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Scholar Report\n";
      csvContent += `Name,${scholar.name || "Unknown"}\n`;
      csvContent += `Email,${scholar.email || "N/A"}\n`;
      csvContent += `Research Center,${scholar.department || "N/A"}\n`;
      csvContent += `Status,${scholar.status || "Active"}\n\n`;
      csvContent += "Submissions List\n";
      csvContent += "SI No.,Title,Status,Submitted At\n";
      submissions.forEach((sub: any, index: number) => {
        const title = (sub.title || "").replace(/"/g, '""');
        const status = sub.status || "Pending";
        const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : "N/A";
        csvContent += `${index + 1},"${title}",${status},${dateStr}\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${(scholar.name || "scholar").toLowerCase().replace(/\s+/g, "_")}_report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to download scholar report.");
    }
  };

  const handleDeleteScholar = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this scholar?")) return;
    try {
      await apiDelete(`/users/${id}`);
      setScholars((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      alert("Failed to delete scholar.");
    }
  };

  const handleAddScholar = async () => {
    if (!newScholar.name.trim() || !newScholar.email.trim() || !newScholar.department) {
      alert("Please fill in all fields.");
      return;
    }
    if (!user?._id) return;
    try {
      setSaving(true);
      const res = await apiPostJson<{ item: Scholar }>("/users", {
        name: newScholar.name.trim(),
        email: newScholar.email.trim(),
        role: "scholar",
        roles: ["scholar"],
        department: newScholar.department,
        guideId: user._id,
        status: "Active",
      });
      setScholars((prev) => [...prev, res.item]);
      setShowAddModal(false);
      setNewScholar({ name: "", email: "", department: "" });
    } catch (err: any) {
      alert(err?.message || "Failed to add scholar.");
    } finally {
      setSaving(false);
    }
  };

  const pendingRows = useMemo(() =>
    pendingScholars.map((scholar) => ({
      id: scholar._id,
      name: scholar.name ?? "Unknown",
      email: scholar.email ?? "N/A",
      department: scholar.department ?? "N/A",
      action: (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleApprove(scholar)}
            disabled={processingId === scholar._id}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            onClick={() => handleReject(scholar)}
            disabled={processingId === scholar._id}
            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      ),
    })),
    [pendingScholars, processingId]
  );

  const activeRows = useMemo(() =>
    myScholars.map((scholar) => ({
      id: scholar._id,
      name: scholar.name ?? "Unknown",
      email: scholar.email ?? "N/A",
      department: scholar.department ?? "N/A",
      status: <StatusBadge status={scholar.status ?? "Active"} />,
      action: (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/faculty/scholars/details?id=${scholar._id}`}
            className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--maroon-700)] hover:bg-slate-50 transition"
          >
            View
          </Link>
          <button
            onClick={() => handleDownloadReport(scholar)}
            className="rounded-full border border-transparent bg-[color:var(--maroon-800)] px-3 py-1 text-xs font-semibold text-white hover:bg-[color:var(--maroon-900)] transition shadow-sm"
          >
            Report
          </button>
          <button
            onClick={() => handleDeleteScholar(scholar._id)}
            className="rounded-full border border-transparent bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 transition shadow-sm"
          >
            Delete
          </button>
        </div>
      ),
    })),
    [myScholars]
  );

  return (
    <PageLayout
      title="Scholars"
      userName={user?.name || "Faculty"}
      roleLabel="Faculty Member"
      navItems={facultyNav}
      activeItem="Scholars"
    >
      {/* Pending Sign-up Requests */}
      {pendingScholars.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between border-b border-amber-200 pb-4 mb-4">
            <div>
              <h2 className="font-display text-lg text-amber-900">
                Pending Sign-up Requests
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold w-5 h-5">
                  {pendingScholars.length}
                </span>
              </h2>
              <p className="text-sm text-amber-700">
                Scholars who requested access under your supervision.
              </p>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-amber-700">Loading...</p>
          ) : (
            <DataTable columns={pendingColumns} rows={pendingRows} />
          )}
        </section>
      )}

      {/* My Scholars */}
      <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] pb-4">
          <div>
            <h2 className="font-display text-lg text-[color:var(--maroon-900)]">My Scholars</h2>
            <p className="text-sm text-slate-500">Scholars under your supervision.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[color:var(--maroon-900)] transition"
          >
            <Plus className="h-4 w-4" />
            Add Scholar
          </button>
        </div>
        <div className="mt-4">
          {loading ? <p className="text-sm text-slate-500">Loading scholars...</p> : null}
          {!loading && error ? <p className="text-sm text-red-600">Failed to load scholars: {error}</p> : null}
          {!loading && !error ? <DataTable columns={activeColumns} rows={activeRows} /> : null}
        </div>
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[color:var(--border)]">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-3">
              <h3 className="font-display text-base font-bold text-[#9B0302]">Add Scholar</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Name</label>
                <input
                  type="text"
                  placeholder="Scholar name"
                  value={newScholar.name}
                  onChange={(e) => setNewScholar(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Email</label>
                <input
                  type="email"
                  placeholder="Scholar email"
                  value={newScholar.email}
                  onChange={(e) => setNewScholar(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Research Center</label>
                <select
                  value={newScholar.department}
                  onChange={(e) => setNewScholar(prev => ({ ...prev, department: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                >
                  <option value="" disabled>Select Research Center</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--border)] pt-4">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-full border border-[color:var(--border)] bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition">
                Cancel
              </button>
              <button type="button" onClick={handleAddScholar} disabled={saving} className="px-5 py-2 rounded-full bg-[#9B0302] hover:bg-[#800201] text-xs font-semibold text-white transition disabled:opacity-50">
                {saving ? "Adding..." : "Add Scholar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
