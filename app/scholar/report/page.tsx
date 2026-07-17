"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, FileText, Printer, CheckCircle, Clock, XCircle, ChevronRight, Download } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { scholarNav } from "@/data/roleNav";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type TimeFrame = "1month" | "3months" | "6months" | "1year" | "all" | "custom";

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function ScholarReportPage() {
  const { user } = useAuth();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("6months");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate Report function
  const handleGenerate = async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      setError(null);

      // Determine date range
      let start = new Date();
      let end = new Date();

      if (timeFrame === "1month") {
        start.setMonth(end.getMonth() - 1);
      } else if (timeFrame === "3months") {
        start.setMonth(end.getMonth() - 3);
      } else if (timeFrame === "6months") {
        start.setMonth(end.getMonth() - 6);
      } else if (timeFrame === "1year") {
        start.setFullYear(end.getFullYear() - 1);
      } else if (timeFrame === "all") {
        start = new Date(2000, 0, 1);
      } else if (timeFrame === "custom") {
        if (!startDate || !endDate) {
          setError("Please select both start and end dates for custom range.");
          setLoading(false);
          return;
        }
        start = new Date(startDate);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }

      // Fetch all scholar-related metrics & accomplishments in parallel
      const [subs, lvs, quals, pubs, confs, pats, wrks, mems, schs] = await Promise.all([
        apiGet<any>(`/submissions?scholarId=${user._id}`),
        apiGet<any>(`/leaves?scholarId=${user._id}`),
        apiGet<any>(`/qualifications?scholarId=${user._id}`),
        apiGet<any>(`/publications?scholarId=${user._id}`),
        apiGet<any>(`/conferences?scholarId=${user._id}`),
        apiGet<any>(`/patents?scholarId=${user._id}`),
        apiGet<any>(`/workshops?scholarId=${user._id}`),
        apiGet<any>(`/memberships?scholarId=${user._id}`),
        apiGet<any>(`/scholarships?scholarId=${user._id}`),
      ]);

      // Filter function by date candidates
      const filterItems = (list: any[] = [], dateFields: string[]) => {
        return list.filter((item) => {
          let itemDate: Date | null = null;
          for (const field of dateFields) {
            if (item[field]) {
              const d = new Date(item[field]);
              if (!isNaN(d.getTime())) {
                itemDate = d;
                break;
              }
            }
          }
          if (!itemDate && item.createdAt) {
            const d = new Date(item.createdAt);
            if (!isNaN(d.getTime())) itemDate = d;
          }
          if (!itemDate) return true; // Include items without clear date fields
          return itemDate >= start && itemDate <= end;
        });
      };

      // Apply filtering to all fetched arrays
      const filteredSubs = filterItems(subs.items || [], ["submittedAt"]);
      const filteredLvs = filterItems(lvs.items || [], ["startDate", "endDate"]);
      const filteredQuals = filterItems(quals.items || [], ["createdAt"]);
      const filteredPubs = filterItems(pubs.items || [], ["publishDate", "createdAt"]);
      const filteredConfs = filterItems(confs.items || [], ["startDate", "createdAt"]);
      const filteredPats = filterItems(pats.items || [], ["filingDate", "createdAt"]);
      const filteredWrks = filterItems(wrks.items || [], ["createdAt"]);
      const filteredMems = filterItems(mems.items || [], ["createdAt"]);
      const filteredSchs = filterItems(schs.items || [], ["createdAt"]);

      // Get Custom registry tabs data from localStorage
      const customDataFiltered: any[] = [];
      try {
        const userIdKey = user._id;
        const savedTabsList = localStorage.getItem(`scholar_${userIdKey}_custom_tabs_list`);
        const savedTabsData = localStorage.getItem(`scholar_${userIdKey}_custom_tabs_data`);
        if (savedTabsList && savedTabsData) {
          const list = JSON.parse(savedTabsList);
          const data = JSON.parse(savedTabsData);
          list.forEach((tab: any) => {
            const rows = data[tab.id] || [];
            if (rows.length > 0) {
              // Custom tabs may not have date fields. We list all rows but note they are active configurations.
              customDataFiltered.push({
                label: tab.label,
                columns: tab.columns,
                rows: rows
              });
            }
          });
        }
      } catch (e) {
        console.error("Failed to read custom tabs:", e);
      }

      setReportData({
        range: { start, end },
        dateGenerated: new Date().toLocaleDateString("en-GB"),
        reportId: `REP-${Math.floor(100000 + Math.random() * 900000)}`,
        submissions: filteredSubs,
        leaves: filteredLvs,
        qualifications: filteredQuals,
        publications: filteredPubs,
        conferences: filteredConfs,
        patents: filteredPats,
        workshops: filteredWrks,
        memberships: filteredMems,
        scholarships: filteredSchs,
        customTabs: customDataFiltered,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate activity report");
    } finally {
      setLoading(false);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  return (
    <PageLayout
      title="Activity Report"
      userName={user?.name || "Scholar User"}
      roleLabel="Scholar"
      navItems={scholarNav}
      activeItem="Activity Report"
    >
      {/* Hide print trigger elements when window printing is active */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          aside, nav, header, button, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-area {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* Navigation & Title */}
        <div className="no-print flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/scholar"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--maroon-700)] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="font-display text-2xl font-bold text-[color:var(--maroon-900)] mt-2">
              Academic Activity Report
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Generate, preview, and print/download a comprehensive report of all your uploads, leaves, and achievements.
            </p>
          </div>
        </div>

        {/* Configurations Card */}
        <div className="no-print rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-display text-sm font-bold text-slate-800 uppercase tracking-wider">
            Report Configurations
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-3 items-end">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1">
                Time Frame
              </label>
              <select
                className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#9B0302]"
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
              >
                <option value="1month">Last 1 Month</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last 1 Year</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {timeFrame === "custom" && (
              <>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-1">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full rounded-full bg-[color:var(--maroon-800)] hover:bg-[color:var(--maroon-900)] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all duration-200"
              >
                {loading ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
        </div>

        {/* Report Preview Panel */}
        {reportData ? (
          <div className="space-y-4">
            <div className="no-print flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Report Generated Successfully</span>
              <button
                onClick={triggerPrint}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </button>
            </div>

            {/* Printable Report Canvas */}
            <div className="print-area rounded-3xl border border-[color:var(--border)] bg-white p-8 md:p-12 shadow-md space-y-8 max-w-4xl mx-auto">
              
              {/* Institution Header */}
              <div className="border-b-2 border-double border-slate-300 pb-6 flex justify-between items-start">
                <div>
                  <h1 className="font-display text-2xl font-extrabold text-[#9B0302] tracking-tight">
                    MarianResearch Portal
                  </h1>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                    Saint Joseph's Academic Registry & Analytics
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p><strong>Date Generated:</strong> {reportData?.dateGenerated}</p>
                  <p><strong>Report ID:</strong> {reportData?.reportId}</p>
                </div>
              </div>

              {/* Scholar Information Card */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider mb-2 text-sm border-b border-slate-200 pb-1">
                    Scholar Details
                  </h3>
                  <p className="py-1"><strong>Full Name:</strong> {user?.name}</p>
                  <p className="py-1"><strong>Unique ID:</strong> {user?.uniqueId || (user?._id ? "MCKA-SCH-" + user._id.slice(-4).toUpperCase() : "")}</p>
                  <p className="py-1"><strong>Registered Email:</strong> {user?.email}</p>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider mb-2 text-sm border-b border-slate-200 pb-1">
                    Academic Scope
                  </h3>
                  <p className="py-1"><strong>Research Center / Department:</strong> {user?.department || "MCA"}</p>
                  <p className="py-1"><strong>Research Guide:</strong> {user?.guide?.name || "Not Assigned"}</p>
                  <p className="py-1"><strong>Report Period:</strong> {formatDate(reportData.range.start.toISOString())} to {formatDate(reportData.range.end.toISOString())}</p>
                </div>
              </div>

              {/* 1. Academic Submissions */}
              <div>
                <h3 className="font-display text-base font-bold text-[#9B0302] border-b border-slate-200 pb-2 mb-4">
                  1. Academic Submissions & Research Papers
                </h3>
                {reportData.submissions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No submissions made during this period.</p>
                ) : (
                  <div className="space-y-4">
                    {reportData.submissions.map((sub: any, idx: number) => (
                      <div key={sub._id} className="border border-slate-100 rounded-xl p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-bold text-slate-800">{idx + 1}. {sub.title}</h4>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${
                            sub.status === "Approved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                        <p className="text-slate-600"><strong>Abstract:</strong> {sub.abstract}</p>
                        <div className="text-[10px] text-slate-400 flex justify-between">
                          <span><strong>Submitted On:</strong> {formatDate(sub.submittedAt)}</span>
                          {sub.file?.originalName && <span><strong>File Attached:</strong> {sub.file.originalName}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Leave Applications */}
              <div>
                <h3 className="font-display text-base font-bold text-[#9B0302] border-b border-slate-200 pb-2 mb-4">
                  2. Leave Logs & Duty Records
                </h3>
                {reportData.leaves.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No leave requests logged during this period.</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                          <th className="p-2.5">Leave Type</th>
                          <th className="p-2.5">Start Date</th>
                          <th className="p-2.5">End Date</th>
                          <th className="p-2.5 text-center">Days</th>
                          <th className="p-2.5">Reason</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.leaves.map((leave: any) => (
                          <tr key={leave._id}>
                            <td className="p-2.5 font-semibold text-slate-700">{leave.leaveType}</td>
                            <td className="p-2.5">{formatDate(leave.startDate)}</td>
                            <td className="p-2.5">{formatDate(leave.endDate)}</td>
                            <td className="p-2.5 text-center">{leave.totalDays}</td>
                            <td className="p-2.5 text-slate-500 max-w-[200px] truncate" title={leave.reason}>{leave.reason}</td>
                            <td className="p-2.5 font-semibold">{leave.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 3. Accomplishments */}
              <div>
                <h3 className="font-display text-base font-bold text-[#9B0302] border-b border-slate-200 pb-2 mb-4">
                  3. Predefined Academic Accomplishments
                </h3>
                
                {/* Qualifications */}
                {reportData.qualifications.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-700 text-xs mb-2 uppercase tracking-wider">Academic Qualifications</h4>
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-2.5">Degree / Qualification</th>
                            <th className="p-2.5">Institution</th>
                            <th className="p-2.5">Year of Passing</th>
                            <th className="p-2.5">Verification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportData.qualifications.map((q: any) => (
                            <tr key={q._id}>
                              <td className="p-2.5 font-bold text-slate-700">{q.qualification || q.degree}</td>
                              <td className="p-2.5">{q.institution}</td>
                              <td className="p-2.5">{q.yearOfPassing || q.year_of_passing}</td>
                              <td className="p-2.5 font-semibold text-emerald-600">{q.verificationStatus || "Approved"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Publications */}
                {reportData.publications.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-700 text-xs mb-2 uppercase tracking-wider">Publications & Research Papers</h4>
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-2.5">Paper Title</th>
                            <th className="p-2.5">Journal / Book</th>
                            <th className="p-2.5">Publish Date</th>
                            <th className="p-2.5">Indexing</th>
                            <th className="p-2.5">Verification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportData.publications.map((p: any) => (
                            <tr key={p._id}>
                              <td className="p-2.5 font-bold text-slate-700">{p.paperTitle || p.paper_title}</td>
                              <td className="p-2.5">{p.journalBookName || p.journal_book_name}</td>
                              <td className="p-2.5">{p.publishDate}</td>
                              <td className="p-2.5 text-slate-500">{p.indexing}</td>
                              <td className="p-2.5 font-semibold text-emerald-600">{p.verificationStatus || "Approved"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Patents */}
                {reportData.patents.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-700 text-xs mb-2 uppercase tracking-wider">Patents Filed & Granted</h4>
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-2.5">Patent Title</th>
                            <th className="p-2.5">Application No.</th>
                            <th className="p-2.5">Filing Date</th>
                            <th className="p-2.5">Inventors</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportData.patents.map((pat: any) => (
                            <tr key={pat._id}>
                              <td className="p-2.5 font-bold text-slate-700">{pat.patentTitle || pat.patent_title}</td>
                              <td className="p-2.5">{pat.applicationNo || pat.application_no_}</td>
                              <td className="p-2.5">{pat.filingDate}</td>
                              <td className="p-2.5 text-slate-500">{pat.inventors}</td>
                              <td className="p-2.5 font-semibold text-emerald-600">{pat.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Conferences */}
                {reportData.conferences.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-700 text-xs mb-2 uppercase tracking-wider">Conference Presentations & Papers</h4>
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-2.5">Conference Title</th>
                            <th className="p-2.5">Host Organization</th>
                            <th className="p-2.5">Start Date</th>
                            <th className="p-2.5">Verification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportData.conferences.map((c: any) => (
                            <tr key={c._id}>
                              <td className="p-2.5 font-bold text-slate-700">{c.conferenceName || c.title}</td>
                              <td className="p-2.5">{c.hostInstitution || c.organizedBy}</td>
                              <td className="p-2.5">{formatDate(c.startDate)}</td>
                              <td className="p-2.5 font-semibold text-emerald-600">{c.verificationStatus || "Approved"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Workshops */}
                {reportData.workshops.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-700 text-xs mb-2 uppercase tracking-wider">Workshops, FDPs & Training Attended</h4>
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-2.5">Programme Title</th>
                            <th className="p-2.5">Organized By</th>
                            <th className="p-2.5">Venue / Platform</th>
                            <th className="p-2.5">Verification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportData.workshops.map((w: any) => (
                            <tr key={w._id}>
                              <td className="p-2.5 font-bold text-slate-700">{w.programmeName || w.title}</td>
                              <td className="p-2.5">{w.organizedBy}</td>
                              <td className="p-2.5 text-slate-500">{w.venuePlatform || w.venue_platform}</td>
                              <td className="p-2.5 font-semibold text-emerald-600">{w.verificationStatus || "Approved"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Memberships */}
                {reportData.memberships.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-700 text-xs mb-2 uppercase tracking-wider">Professional Body Memberships</h4>
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-2.5">Professional Body</th>
                            <th className="p-2.5">Membership Number</th>
                            <th className="p-2.5">Membership Type</th>
                            <th className="p-2.5">Validity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportData.memberships.map((m: any) => (
                            <tr key={m._id}>
                              <td className="p-2.5 font-bold text-slate-700">{m.professionalBody}</td>
                              <td className="p-2.5">{m.membershipNumber}</td>
                              <td className="p-2.5">{m.membershipType}</td>
                              <td className="p-2.5 text-slate-500">{m.validity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Scholarships */}
                {reportData.scholarships.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-700 text-xs mb-2 uppercase tracking-wider">Scholarships & Fellowships</h4>
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-2.5">Scholarship Name</th>
                            <th className="p-2.5">Awarding Agency</th>
                            <th className="p-2.5">Amount / Stipend</th>
                            <th className="p-2.5">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportData.scholarships.map((s: any) => (
                            <tr key={s._id}>
                              <td className="p-2.5 font-bold text-slate-700">{s.name}</td>
                              <td className="p-2.5">{s.awardingAgency || s.agency}</td>
                              <td className="p-2.5 font-semibold text-slate-700">{s.amount}</td>
                              <td className="p-2.5 text-slate-500">{s.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* All stats empty fallback */}
                {reportData.qualifications.length === 0 &&
                  reportData.publications.length === 0 &&
                  reportData.patents.length === 0 &&
                  reportData.conferences.length === 0 &&
                  reportData.workshops.length === 0 &&
                  reportData.memberships.length === 0 &&
                  reportData.scholarships.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No accomplishment logs registered during this timeframe.</p>
                  )}
              </div>

              {/* 4. Custom Registry Profile Tabs */}
              {reportData.customTabs.length > 0 && (
                <div>
                  <h3 className="font-display text-base font-bold text-[#9B0302] border-b border-slate-200 pb-2 mb-4">
                    4. Registry Profile Custom Extensions
                  </h3>
                  
                  {reportData.customTabs.map((tab: any, idx: number) => (
                    <div key={idx} className="mb-6 last:mb-0">
                      <h4 className="font-semibold text-slate-700 text-xs mb-2 uppercase tracking-wider">{tab.label}</h4>
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              {tab.columns.map((col: string, cIdx: number) => (
                                <th key={cIdx} className="p-2.5 font-bold text-slate-600 uppercase tracking-wider">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tab.rows.map((row: any, rIdx: number) => (
                              <tr key={rIdx}>
                                {tab.columns.map((col: string, cIdx: number) => {
                                  if (col === "Sl.No.") {
                                    return <td key={cIdx} className="p-2.5 text-slate-700 font-semibold">{rIdx + 1}</td>;
                                  }
                                  const key = col.toLowerCase().replace(/\//g, "_").replace(/\s+/g, "_");
                                  const val = row[key] || row[col] || row[col.toLowerCase()] || "";
                                  return <td key={cIdx} className="p-2.5 text-slate-700">{val}</td>;
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Report Verification & Signatures */}
              <div className="pt-12 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-500">
                <div className="space-y-4">
                  <p>I hereby certify that the above list of academic submissions, leave details, accomplishments, and professional records represent true and accurate activities performed by me during the specified timeframe.</p>
                  <div className="pt-8">
                    <div className="border-b border-slate-300 w-48 mb-1"></div>
                    <p><strong>Scholar Signature & Date</strong></p>
                  </div>
                </div>
                <div className="space-y-4 flex flex-col justify-between items-end">
                  <p className="text-right">This report has been compiled and is subject to verification by the registered Research Guide and Coordinator of the Department.</p>
                  <div className="pt-8 text-left w-48">
                    <div className="border-b border-slate-300 w-48 mb-1"></div>
                    <p><strong>Verified by Research Guide</strong></p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="no-print border border-dashed border-[color:var(--border)] rounded-2xl bg-white p-12 text-center text-slate-400">
            <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold">No Report Generated Yet</p>
            <p className="text-xs mt-1">Select a time frame above and click "Generate Report" to build your activity statement.</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
