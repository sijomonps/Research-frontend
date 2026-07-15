"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, X, Eye, ShieldAlert } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/Table";
import { facultyNav } from "@/data/roleNav";
import { apiGet, apiPatchJson, type ApiListResponse } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type PendingApprovalItem = {
  _id: string;
  category: string;
  scholar: {
    _id: string;
    name: string;
    email: string;
    department?: string;
  };
  document?: {
    url: string;
    originalName: string;
  };
  createdAt: string;
  [key: string]: any;
};

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

const categoryLabels: Record<string, string> = {
  qualification: "Qualification",
  publication: "Publication",
  conference: "Conference",
  patent: "Patent",
  workshop: "Workshop / FDP",
  membership: "Professional Membership",
  scholarship: "Scholarship / Fellowship",
};

export default function GuidePortfolioReviewsPage() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<PendingApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification modal / details state
  const [selectedItem, setSelectedItem] = useState<PendingApprovalItem | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionStatus, setActionStatus] = useState<"Approved" | "Rejected" | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadApprovals = async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      setError(null);
      // Fetches all pending portfolio items (except leaves, or including leaves but let's filter out leaves here since leaves have their own tab)
      const res = await apiGet<ApiListResponse<PendingApprovalItem>>(`/portfolio/approvals?guideId=${user._id}`);
      // Filter out leaves from this view (since leaves are handled in leave-reviews)
      setApprovals(res.items.filter((item) => item.category !== "leave"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pending reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [user?._id]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !actionStatus || !user?._id) return;

    try {
      setProcessing(true);
      const apiPathMap: Record<string, string> = {
        qualification: `/qualifications/${selectedItem._id}/status`,
        publication: `/publications/${selectedItem._id}/status`,
        conference: `/conferences/${selectedItem._id}/status`,
        patent: `/patents/${selectedItem._id}/status`,
        workshop: `/workshops/${selectedItem._id}/status`,
        membership: `/memberships/${selectedItem._id}/status`,
        scholarship: `/scholarships/${selectedItem._id}/status`,
      };

      await apiPatchJson(apiPathMap[selectedItem.category], {
        status: actionStatus,
        reviewerId: user._id,
        note: actionNote.trim(),
      });

      setSelectedItem(null);
      setActionNote("");
      setActionStatus(null);
      loadApprovals();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit verification action");
    } finally {
      setProcessing(false);
    }
  };

  const getDetailsSummary = (item: PendingApprovalItem) => {
    if (item.category === "qualification") {
      return `${item.degree} in ${item.subject} from ${item.institution} (${item.yearOfPassing})`;
    } else if (item.category === "publication") {
      return `"${item.title}" in ${item.journalName} (Published: ${formatDate(item.publishDate)})`;
    } else if (item.category === "conference") {
      return `Presented "${item.paperTitle || "N/A"}" at ${item.title} (${item.venue})`;
    } else if (item.category === "patent") {
      return `"${item.title}" (Status: ${item.patentStatus}, App Ref: ${item.applicationNumber})`;
    } else if (item.category === "workshop") {
      return `Role: ${item.role} - "${item.title}" at ${item.venue}`;
    } else if (item.category === "membership") {
      return `Member of ${item.professionalBody} (Reg No: ${item.membershipNumber})`;
    } else if (item.category === "scholarship") {
      return `${item.name} from ${item.sponsoringAgency} (₹${item.amountPerMonth}/mo)`;
    }
    return "Accomplishment Details";
  };

  const columns = [
    { key: "scholar", label: "Scholar Name" },
    { key: "category", label: "Category" },
    { key: "details", label: "Accomplishment details" },
    { key: "submitted", label: "Submitted On" },
    { key: "action", label: "Action", align: "right" as const },
  ];

  const rows = useMemo(() => {
    return approvals.map((item) => ({
      id: item._id,
      scholar: (
        <div>
          <p className="font-semibold text-slate-800">{item.scholar?.name}</p>
          <p className="text-[10px] text-slate-400">{item.scholar?.department}</p>
        </div>
      ),
      category: (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200">
          {categoryLabels[item.category] || item.category}
        </span>
      ),
      details: <span className="text-xs text-slate-600 block max-w-[300px] truncate" title={getDetailsSummary(item)}>{getDetailsSummary(item)}</span>,
      submitted: formatDate(item.createdAt),
      action: (
        <div className="flex justify-end gap-2">
          {item.document?.url ? (
            <a
              href={item.document.url}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full"
              title="View PDF proof"
            >
              <Eye className="h-4 w-4" />
            </a>
          ) : null}
          <button
            onClick={() => {
              setSelectedItem(item);
              setActionStatus("Approved");
            }}
            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-full"
            title="Approve item"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedItem(item);
              setActionStatus("Rejected");
            }}
            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-full"
            title="Reject/Request modifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ),
    }));
  }, [approvals]);

  return (
    <PageLayout
      title="Portfolio Reviews"
      userName={user?.name || "Faculty"}
      roleLabel="Faculty Member"
      navItems={facultyNav}
      activeItem="Portfolio Reviews"
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
            Portfolio Verification Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review accomplishments, certificates and approve for portfolios.</p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-slate-500">Loading verification list...</p>
        ) : (
          <DataTable columns={columns} rows={rows} />
        )}

        {/* Verification Action Modal */}
        {selectedItem && actionStatus ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl border border-[color:var(--border)] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <h3 className="font-display text-lg font-bold text-[color:var(--maroon-900)]">
                {actionStatus === "Approved" ? "Approve Accomplishment" : "Reject / Need Corrections"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                For Scholar: <span className="font-semibold text-slate-700">{selectedItem.scholar?.name}</span>
              </p>

              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold uppercase text-slate-400">Accomplishment details</p>
                <p className="mt-1 text-slate-800 font-medium">{getDetailsSummary(selectedItem)}</p>
              </div>

              <form onSubmit={handleActionSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="note">
                    Review notes / Remarks
                  </label>
                  <textarea
                    id="note"
                    placeholder={actionStatus === "Approved" ? "Optional verification remarks" : "Explain why it is rejected or what correction is needed"}
                    className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-sm text-slate-700 shadow-sm min-h-[80px]"
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    required={actionStatus === "Rejected"}
                  />
                </div>

                {selectedItem.document?.url ? (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>Attached Document:</span>
                    <a
                      href={selectedItem.document.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[color:var(--maroon-700)] font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      <Eye className="h-4.5 w-4.5" />
                      View Certificate
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <ShieldAlert className="h-4.5 w-4.5" />
                    No certificate attached by scholar.
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(null);
                      setActionStatus(null);
                    }}
                    className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className={`rounded-full px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 ${
                      actionStatus === "Approved"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    {processing ? "Processing..." : actionStatus === "Approved" ? "Verify & Approve" : "Reject"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
