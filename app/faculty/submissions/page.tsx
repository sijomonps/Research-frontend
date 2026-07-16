"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/Table";
import { StatusBadge } from "@/components/StatusBadge";
import { facultyNav } from "@/data/roleNav";
import { apiGet, apiPostForm, type ApiListResponse } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type Submission = {
  _id: string;
  title: string;
  department: string;
  submittedAt?: string;
  status: string;
  scholar?: { name?: string };
};

const columns = [
  { key: "title", label: "Title" },
  { key: "scholar", label: "Scholar" },
  { key: "department", label: "Research Center" },
  { key: "submitted", label: "Submitted On" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action", align: "right" as const },
];

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function FacultySubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [scholars, setScholars] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState({
    title: "",
    scholarId: "",
    department: "",
    abstract: "",
    file: null as File | null,
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [submissionsRes, scholarsRes, deptsRes] = await Promise.all([
          apiGet<ApiListResponse<Submission>>("/submissions"),
          apiGet<ApiListResponse<any>>("/users?role=scholar"),
          apiGet<ApiListResponse<any>>("/departments"),
        ]);
        if (!isMounted) return;
        setSubmissions(submissionsRes.items);
        setScholars(scholarsRes.items);
        setDepartments(deptsRes.items);
        if (scholarsRes.items.length > 0) {
          setFormState(prev => ({ ...prev, scholarId: scholarsRes.items[0]._id }));
        }
        if (deptsRes.items.length > 0) {
          setFormState(prev => ({ ...prev, department: deptsRes.items[0].name }));
        }
      } catch (err) {
        if (!isMounted) return;
        const message =
          err instanceof Error ? err.message : "Failed to load submissions";
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddSubmission = async () => {
    if (!formState.title.trim() || !formState.scholarId || !formState.department || !formState.abstract.trim()) {
      alert("Please fill in all fields.");
      return;
    }
    try {
      setSaving(true);
      const payload = new FormData();
      payload.append("title", formState.title.trim());
      payload.append("abstract", formState.abstract.trim());
      payload.append("department", formState.department);
      payload.append("scholarId", formState.scholarId);
      if (formState.file) {
        payload.append("file", formState.file);
      }
      const newSub = await apiPostForm<any>("/submissions", payload);
      setSubmissions((prev) => [newSub, ...prev]);
      setShowAddModal(false);
      setFormState({
        title: "",
        scholarId: scholars[0]?._id ?? "",
        department: departments[0]?.name ?? "",
        abstract: "",
        file: null,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to add submission.");
    } finally {
      setSaving(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    if (statusFilter === "All") return submissions;
    return submissions.filter(
      (s) => s.status?.toLowerCase() === statusFilter.toLowerCase()
    );
  }, [submissions, statusFilter]);

  const rows = useMemo(
    () =>
      filteredSubmissions.map((submission) => ({
        id: submission._id,
        title: submission.title,
        scholar: submission.scholar?.name ?? "Unknown",
        department: submission.department,
        submitted: formatDate(submission.submittedAt),
        status: <StatusBadge status={submission.status} />,
        action: (
          <Link
            href={`/faculty/submissions/details/${submission._id}`}
            className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--maroon-700)] hover:bg-slate-50 transition-colors"
          >
            View
          </Link>
        ),
      })),
    [filteredSubmissions]
  );

  return (
    <PageLayout
      title="Submissions"
      userName={user?.name || "Faculty"}
      roleLabel="Faculty Member"
      navItems={facultyNav}
      activeItem="Submissions"
    >
      <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] pb-4">
          <div>
            <h2 className="font-display text-lg text-[color:var(--maroon-900)]">
              Submissions
            </h2>
            <p className="text-sm text-slate-500">
              Review and manage scholar submissions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#9B0302]/20 focus:border-[#9B0302]"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[color:var(--maroon-900)] transition"
            >
              <Plus className="h-4 w-4" />
              Add Submission
            </button>
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading submissions...</p>
          ) : error ? (
            <p className="text-sm text-red-600">
              Failed to load submissions: {error}
            </p>
          ) : (
            <DataTable columns={columns} rows={rows} />
          )}
        </div>
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-[color:var(--border)]">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-3">
              <h3 className="font-display text-base font-bold text-[#9B0302]">
                Add Submission
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Title</label>
                <input
                  type="text"
                  placeholder="Enter research title"
                  value={formState.title}
                  onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Scholar</label>
                  <select
                    value={formState.scholarId}
                    onChange={(e) => setFormState(prev => ({ ...prev, scholarId: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                  >
                    {scholars.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Research Center</label>
                  <select
                    value={formState.department}
                    onChange={(e) => setFormState(prev => ({ ...prev, department: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                  >
                    {departments.map((d) => (
                      <option key={d._id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">File Upload (PDF)</label>
                <input
                  type="file"
                  onChange={(e) => setFormState(prev => ({ ...prev, file: e.target.files?.[0] ?? null }))}
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Abstract</label>
                <textarea
                  placeholder="Enter abstract"
                  value={formState.abstract}
                  onChange={(e) => setFormState(prev => ({ ...prev, abstract: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#9B0302] min-h-[100px] resize-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--border)] pt-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-full border border-[color:var(--border)] bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSubmission}
                disabled={saving}
                className="px-5 py-2 rounded-full bg-[#9B0302] hover:bg-[#800201] text-xs font-semibold text-white transition disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add Submission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
