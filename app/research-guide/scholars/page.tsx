"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/Table";
import { StatusBadge } from "@/components/StatusBadge";
import { researchGuideNav } from "@/data/roleNav";
import { apiGet, apiPatchJson, type ApiListResponse } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type Scholar = {
  _id: string;
  name?: string;
  email?: string;
  department?: string;
  status?: string;
  avatar?: string;
  preferences?: any;
  guide?: {
    _id: string;
    name?: string;
  };
};

const columns = [
  { key: "avatar", label: "Photo" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "department", label: "Research Center" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action", align: "right" as const },
];

export default function ResearchGuideScholarsPage() {
  const { user } = useAuth();
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingScholarId, setApprovingScholarId] = useState<string | null>(null);

  const loadScholars = async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await apiGet<ApiListResponse<Scholar>>("/users?role=scholar");
      
      // Filter scholars assigned under this particular guide
      const filtered = response.items.filter(
        (s) => s.guide?._id === user._id
      );
      setScholars(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scholars");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScholars();
  }, [user?._id]);

  const handleApproveScholar = async (scholar: Scholar) => {
    try {
      setApprovingScholarId(scholar._id);
      await apiPatchJson(`/users/${scholar._id}`, { status: "Active" });
      await loadScholars();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve scholar";
      alert(message);
    } finally {
      setApprovingScholarId(null);
    }
  };

  const rows = useMemo(
    () =>
      scholars.map((scholar) => {
        const avatarUrl = scholar.avatar || scholar.preferences?.scholar_avatar;
        return {
        id: scholar._id,
        avatar: (
          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={scholar.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-slate-400">{(scholar.name || "SC").substring(0, 2).toUpperCase()}</span>
            )}
          </div>
        ),
        name: scholar.name ?? "Unknown",
        email: scholar.email ?? "N/A",
        department: scholar.department ?? "N/A",
        status: <StatusBadge status={scholar.status ?? "Active"} />,
        action: (
          <div className="flex justify-end gap-2">
            {scholar.status === "PendingApproval" && (
              <button
                type="button"
                onClick={() => handleApproveScholar(scholar)}
                disabled={approvingScholarId === scholar._id}
                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {approvingScholarId === scholar._id ? "Approving..." : "Approve"}
              </button>
            )}
            <Link
              href={`/research-guide/scholars/details?id=${scholar._id}`}
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--maroon-700)]"
            >
              View
            </Link>
          </div>
        )
      };
    }),
    [scholars, approvingScholarId]
  );

  return (
    <PageLayout
      title="Scholars"
      userName={user?.name || "Research Guide"}
      roleLabel="Research Guide"
      navItems={researchGuideNav}
      activeItem="Scholars"
    >
      <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] pb-4">
          <div>
            <h2 className="font-display text-lg text-[color:var(--maroon-900)]">Scholars</h2>
            <p className="text-sm text-slate-500">Manage scholars under your supervision.</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Scholar
          </button>
        </div>
        <div className="mt-4">
          {loading ? <p className="text-sm text-slate-500">Loading scholars...</p> : null}
          {!loading && error ? <p className="text-sm text-red-600">Failed to load scholars: {error}</p> : null}
          {!loading && !error ? <DataTable columns={columns} rows={rows} /> : null}
        </div>
      </section>
    </PageLayout>
  );
}
