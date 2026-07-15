"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, User, Eye, Sparkles } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/Table";
import { facultyNav } from "@/data/roleNav";
import { apiGet, type ApiListResponse } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type Scholar = {
  _id: string;
  name: string;
  email: string;
  department: string;
  guide?: {
    name: string;
    email: string;
  };
  phone?: string;
  status: string;
};

type PortfolioStats = {
  qualifications: { total: number; Approved: number };
  publications: { total: number; Approved: number };
  conferences: { total: number; Approved: number };
  patents: { total: number; Approved: number };
  workshops: { total: number; Approved: number };
  memberships: { total: number; Approved: number };
  scholarships: { total: number; Approved: number };
};

export default function CoordinatorScholarPortfoliosPage() {
  const { user } = useAuth();
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile details modal
  const [selectedScholar, setSelectedScholar] = useState<Scholar | null>(null);
  const [scholarStats, setScholarStats] = useState<PortfolioStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadScholars = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      // Fetch scholars in coordinator's department
      const path = user.role === "admin" ? "/users?role=scholar" : `/users?role=scholar&department=${user.department || ""}`;
      const res = await apiGet<ApiListResponse<Scholar>>(path);
      setScholars(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scholars");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScholars();
  }, [user]);

  const viewScholarPortfolio = async (scholar: Scholar) => {
    setSelectedScholar(scholar);
    try {
      setStatsLoading(true);
      const res = await apiGet<{ summary: PortfolioStats }>(`/portfolio/summary?scholarId=${scholar._id}`);
      setScholarStats(res.summary);
    } catch (err) {
      alert("Failed to load portfolio statistics for scholar");
    } finally {
      setStatsLoading(false);
    }
  };

  const columns = [
    { key: "name", label: "Scholar Name" },
    { key: "email", label: "Email ID" },
    { key: "guide", label: "Research Guide" },
    { key: "phone", label: "Phone Number" },
    { key: "action", label: "Action", align: "right" as const },
  ];

  const rows = useMemo(() => {
    return scholars.map((scholar) => ({
      id: scholar._id,
      name: (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-slate-50 border border-slate-200">
            <User className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{scholar.name}</p>
            <p className="text-[10px] text-slate-400">{scholar.department}</p>
          </div>
        </div>
      ),
      email: scholar.email,
      guide: scholar.guide?.name ?? "Not Assigned",
      phone: scholar.phone ?? "N/A",
      action: (
        <div className="flex justify-end">
          <button
            onClick={() => viewScholarPortfolio(scholar)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--maroon-700)] hover:bg-[color:var(--maroon-50)] transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View Portfolio
          </button>
        </div>
      ),
    }));
  }, [scholars]);

  return (
    <PageLayout
      title="Scholar Portfolios"
      userName={user?.name || "Faculty"}
      roleLabel="Faculty Member"
      navItems={facultyNav}
      activeItem="Scholar Portfolios"
    >
      <div className="space-y-6">
        <div>
          <Link
            href="/faculty"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--maroon-700)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="font-display text-2xl font-bold text-[color:var(--maroon-900)] mt-2">
            Scholar Portfolios Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.role === "admin"
              ? "View and inspect research portfolios for all scholars in the institution."
              : `View and inspect research portfolios for scholars in the ${user?.department || "MCA"} Research Center.`}
          </p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-slate-500">Loading scholars directory...</p>
        ) : (
          <DataTable columns={columns} rows={rows} />
        )}

        {/* Scholar Portfolio Stats Modal */}
        {selectedScholar ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-3xl border border-[color:var(--border)] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display text-lg font-bold text-[color:var(--maroon-900)]">
                    {selectedScholar.name} - Research Portfolio
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Research Center: {selectedScholar.department} | Guide: {selectedScholar.guide?.name || "Unassigned"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedScholar(null);
                    setScholarStats(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {statsLoading ? (
                <p className="text-sm text-slate-500 mt-6">Loading portfolio analytics...</p>
              ) : scholarStats ? (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {[
                      { label: "Publications", value: scholarStats.publications.Approved, total: scholarStats.publications.total, color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
                      { label: "Patents", value: scholarStats.patents.Approved, total: scholarStats.patents.total, color: "border-purple-200 bg-purple-50 text-purple-700" },
                      { label: "Conferences", value: scholarStats.conferences.Approved, total: scholarStats.conferences.total, color: "border-amber-200 bg-amber-50 text-amber-700" },
                      { label: "Qualifications", value: scholarStats.qualifications.Approved, total: scholarStats.qualifications.total, color: "border-blue-200 bg-blue-50 text-blue-700" },
                      { label: "Workshops/FDPs", value: scholarStats.workshops.Approved, total: scholarStats.workshops.total, color: "border-rose-200 bg-rose-50 text-rose-700" },
                      { label: "Memberships", value: scholarStats.memberships.Approved, total: scholarStats.memberships.total, color: "border-indigo-200 bg-indigo-50 text-indigo-700" },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                        <p className="text-xs font-semibold text-slate-500 uppercase">{stat.label}</p>
                        <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">/{stat.total} verified</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-[color:var(--maroon-900)] flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-[color:var(--maroon-700)]" />
                      Academic progress summary
                    </h4>
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Total Achievements Filed:</span>
                        <span className="font-semibold text-slate-800">
                          {scholarStats.publications.total +
                            scholarStats.patents.total +
                            scholarStats.conferences.total +
                            scholarStats.qualifications.total +
                            scholarStats.workshops.total +
                            scholarStats.memberships.total +
                            scholarStats.scholarships.total}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Approved Publications & Patents:</span>
                        <span className="font-semibold text-emerald-600">
                          {scholarStats.publications.Approved + scholarStats.patents.Approved}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-3 mt-6 border-t border-[color:var(--border)] pt-4">
                <button
                  onClick={() => {
                    setSelectedScholar(null);
                    setScholarStats(null);
                  }}
                  className="rounded-full bg-[color:var(--maroon-800)] px-6 py-2 text-xs font-semibold text-white hover:bg-[color:var(--maroon-900)]"
                >
                  Close Portfolio
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}

// Inline Close helper icon
function X(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
