"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/Table";
import { StatusBadge } from "@/components/StatusBadge";
import { scholarNav } from "@/data/roleNav";
import { apiDelete, apiGet, type ApiListResponse } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type Submission = {
  _id: string;
  title: string;
  department: string;
  submittedAt?: string;
  status: string;
};

const columns = [
  { key: "title", label: "Title" },
  { key: "department", label: "Department" },
  { key: "submitted", label: "Date Submitted" },
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

export default function ScholarSubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Delete this submission? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      setError(null);
      await apiDelete(`/submissions/${id}`);
      setSubmissions((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete submission";
      setError(message);
    }
  };

  useEffect(() => {
    if (!user?._id) return;
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiGet<ApiListResponse<Submission>>(
          `/submissions?scholarId=${user._id}`
        );
        if (!isMounted) return;
        setSubmissions(response.items);
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
  }, [user?._id]);

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
        title: (
          <Link
            href={`/scholar/submissions/details/${submission._id}`}
            className="font-semibold text-[color:var(--maroon-900)]"
          >
            {submission.title}
          </Link>
        ),
        department: submission.department,
        submitted: formatDate(submission.submittedAt),
        status: <StatusBadge status={submission.status} />,
        action: (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/scholar/submissions/edit/${submission._id}`}
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--maroon-700)]"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(submission._id)}
              className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600"
            >
              Delete
            </button>
          </div>
        ),
      })),
    [filteredSubmissions]
  );

  return (
    <PageLayout
      title="My Submission"
      userName={user?.name || "Scholar"}
      roleLabel="Scholar"
      navItems={scholarNav}
      activeItem="My Submission"
    >
      <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] pb-4">
          <div>
            <h2 className="font-display text-lg text-[color:var(--maroon-900)]">
              My Submission
            </h2>
            <p className="text-sm text-slate-500">
              Track the status of your submitted research papers.
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
            <Link
              href="/scholar/submissions/new"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[color:var(--maroon-900)] transition"
            >
              <Plus className="h-4 w-4" />
              New Submission
            </Link>
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
    </PageLayout>
  );
}
