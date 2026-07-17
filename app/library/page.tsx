"use client";

import React, { useState, useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { libraryNav } from "@/data/roleNav";
import { useAuth } from "@/components/AuthProvider";
import {
  getIncentives,
  updateIncentiveStatus,
  IncentiveApplication,
  IncentiveStatus,
} from "@/lib/mockIncentives";
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Check,
  X,
  ExternalLink,
  Info,
  Image as ImageIcon,
} from "lucide-react";
import { DashboardCards } from "@/components/DashboardCards";

export default function LibraryDashboard() {
  const { user } = useAuth();
  const [incentives, setIncentives] = useState<IncentiveApplication[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<"Pending" | "Verified" | "Rejected">("Pending");
  const [selectedApp, setSelectedApp] = useState<IncentiveApplication | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const fetchIncentives = async () => {
    try {
      const data = await getIncentives();
      setIncentives(data);
    } catch (err) {
      console.error("Failed to fetch incentives:", err);
    }
  };

  useEffect(() => {
    fetchIncentives();
  }, []);

  const handleAction = async (id: string, action: "Verify" | "Reject") => {
    try {
      const status: IncentiveStatus = action === "Verify" ? "Pending Admin" : "Rejected";
      await updateIncentiveStatus(id, status);
      await fetchIncentives();
      if (selectedApp && selectedApp.id === id) {
        setSelectedApp(null);
      }
    } catch (err) {
      console.error("Failed to update incentive status:", err);
      alert("Failed to update status.");
    }
  };

  // Metrics
  const pendingCount = incentives.filter((i) => i.status === "Pending Library").length;
  const verifiedCount = incentives.filter(
    (i) => i.status !== "Pending Library" && i.status !== "Rejected"
  ).length;
  const rejectedCount = incentives.filter((i) => i.status === "Rejected").length;

  const stats = [
    { label: "Pending Library Review", value: `${pendingCount}`, icon: Clock },
    { label: "Verified & Sent to Admin", value: `${verifiedCount}`, icon: CheckCircle2 },
    { label: "Rejected Applications", value: `${rejectedCount}`, icon: XCircle },
  ];

  // List filter
  const filteredList = incentives.filter((i) => {
    if (selectedFilter === "Pending") return i.status === "Pending Library";
    if (selectedFilter === "Verified") return i.status !== "Pending Library" && i.status !== "Rejected";
    return i.status === "Rejected";
  });

  return (
    <>
    <PageLayout
      title="Library Verification Portal"
      userName={user?.name || "Librarian"}
      roleLabel="Librarian"
      navItems={libraryNav}
      activeItem="Dashboard"
    >
      <div className="space-y-6">
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#9B0302] to-[#c1121f] p-6 text-white shadow-md">
          <h1 className="font-display text-2xl font-bold">Incentives Verification</h1>
          <p className="text-sm text-white/80 mt-1 max-w-2xl">
            As a librarian, your primary duty is to receive, review, and verify faculty incentive requests for publications, patents, and other research credentials. Verified submissions are routed directly to the Administrator office.
          </p>
        </div>

        {/* Stats Grid */}
        <DashboardCards items={stats} />

        {/* Main List Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Header & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 mb-6 gap-3">
            <h2 className="font-display text-lg font-bold text-slate-800">
              Incentive Applications
            </h2>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(["Pending", "Verified", "Rejected"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedFilter === filter
                      ? "bg-white text-[#9B0302] shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {filter === "Pending" ? "Pending Library" : filter}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Application ID</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Faculty Member</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Category</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Requested Amt</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Details</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-24">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50 transition duration-150">
                    <td className="p-4 text-sm font-semibold text-slate-700">{inc.id}</td>
                    <td className="p-4 text-sm text-slate-800">
                      <span className="font-bold">{inc.facultyName}</span>
                      <br />
                      <span className="text-xs text-slate-400 font-normal">{inc.facultyEmail}</span>
                    </td>
                    <td className="p-4 text-sm">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          inc.category === "Publication"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            : inc.category === "Patent"
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}
                      >
                        {inc.category}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-800">
                      ₹{inc.amountRequested.toLocaleString()}
                    </td>
                    <td className="p-4 text-sm text-slate-500 max-w-xs">
                      <div className="truncate">
                        {inc.category === "Publication" && inc.publicationTitle}
                        {inc.category === "Patent" && inc.patentTitle}
                        {inc.category === "Registration Fee" && inc.eventName}
                      </div>
                      {inc.proofImage && (
                        <button
                          onClick={() => setProofPreview(inc.proofImage || null)}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#9B0302] hover:underline"
                        >
                          <ImageIcon className="w-3 h-3" />
                          View Proof
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inc.status === "Pending Library"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : inc.status === "Rejected"
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}
                      >
                        {inc.status === "Pending Library"
                          ? "Pending"
                          : inc.status === "Pending Admin"
                          ? "Sent to Admin"
                          : inc.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedApp(inc)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition inline-flex items-center justify-center"
                        title="View Full Details"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      {inc.status === "Pending Library" && (
                        <>
                          <button
                            onClick={() => handleAction(inc.id, "Verify")}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition inline-flex items-center justify-center border border-emerald-100"
                            title="Verify and Send to Admin"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(inc.id, "Reject")}
                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition inline-flex items-center justify-center border border-red-100"
                            title="Reject Submission"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400 text-xs">
                      No applications found matching the selected status.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-[#9B0302] uppercase tracking-widest bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                  {selectedApp.category} Verification
                </span>
                <h3 className="font-display text-base font-bold text-slate-800 mt-1">
                  Application Details: {selectedApp.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs text-slate-700">
              {/* Applicant block */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Faculty Member</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedApp.facultyName}</p>
                <p className="text-slate-500 mt-0.5">{selectedApp.facultyEmail}</p>
              </div>

              {/* Dynamic Details based on Category */}
              {selectedApp.category === "Publication" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Publication Title</label>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedApp.publicationTitle}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Journal Name</label>
                      <p className="font-semibold text-slate-800 mt-0.5">{selectedApp.journalName}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Publication Status</label>
                      <p className="font-semibold text-slate-800 mt-0.5">{selectedApp.pubStatus}</p>
                    </div>
                  </div>
                  {selectedApp.doiLink && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">DOI Reference URL</label>
                      <a
                        href={selectedApp.doiLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#9B0302] hover:underline font-semibold flex items-center gap-1 mt-0.5"
                      >
                        <span>{selectedApp.doiLink}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {selectedApp.category === "Patent" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Patent Title</label>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedApp.patentTitle}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Patent Number</label>
                      <p className="font-semibold text-slate-800 mt-0.5">{selectedApp.patentNumber || "Pending Filing"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Patent Status</label>
                      <p className="font-semibold text-slate-800 mt-0.5">{selectedApp.patentStatus}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedApp.category === "Registration Fee" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Event Name</label>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedApp.eventName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Event Type</label>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedApp.eventType}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Requested Incentive</label>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">₹{selectedApp.amountRequested.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Verification Status</label>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedApp.status === "Pending Library" ? "Pending Verification" : selectedApp.status === "Pending Admin" ? "Sent to Admin" : selectedApp.status}
                  </p>
                </div>
              </div>

              {/* Proof Document */}
              {selectedApp.proofImage && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Supporting Proof Document</p>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img
                      src={selectedApp.proofImage}
                      alt="Incentive proof"
                      className="w-full max-h-56 object-contain"
                    />
                  </div>
                  <button
                    onClick={() => setProofPreview(selectedApp.proofImage || null)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#9B0302] hover:underline"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    View Full Size
                  </button>
                </div>
              )}
            </div>

            {selectedApp.status === "Pending Library" && (
              <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  onClick={() => handleAction(selectedApp.id, "Reject")}
                  className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-600 transition"
                >
                  Reject Application
                </button>
                <button
                  onClick={() => handleAction(selectedApp.id, "Verify")}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition shadow-sm"
                >
                  Verify & Send to Admin
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>

      {/* Full-size Proof Preview */}
      {proofPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="relative bg-white rounded-2xl max-w-2xl w-full p-4 shadow-2xl">
            <button
              onClick={() => setProofPreview(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">Proof Document</p>
            <div className="flex justify-center items-center">
              <img
                src={proofPreview}
                alt="Proof full view"
                className="max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
