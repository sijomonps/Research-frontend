"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, Mail, Phone, MapPin, User, Info, FileText } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/Table";
import { StatusBadge } from "@/components/StatusBadge";
import { adminNav } from "@/data/roleNav";
import { useAuth } from "@/components/AuthProvider";
import {
  apiGet,
  apiPatchJson,
  type ApiItemResponse,
  type ApiListResponse,
} from "@/lib/api";

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
  status?: string;
  department?: string;
  researchCenter?: { _id: string; name: string } | string | null;
  guide?: { _id?: string; name?: string } | null;
};

type Submission = {
  _id: string;
  title: string;
  status: string;
  submittedAt?: string;
  scholar?: { _id?: string; name?: string } | null;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9B0302]/20 focus:border-[#9B0302] transition-all";

const facultyColumns = [
  { key: "name", label: "Faculty Member" },
  { key: "email", label: "Email" },
  { key: "department", label: "Department" },
];

const guideColumns = [
  { key: "name", label: "Research Guide" },
  { key: "email", label: "Email" },
  { key: "department", label: "Department" },
];

const scholarColumns = [
  { key: "name", label: "Scholar" },
  { key: "email", label: "Email" },
  { key: "guide", label: "Research Guide" },
  { key: "status", label: "Status" },
];

const submissionColumns = [
  { key: "title", label: "Title" },
  { key: "scholar", label: "Scholar" },
  { key: "submitted", label: "Submitted On" },
  { key: "status", label: "Status", align: "right" as const },
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

export default function AdminResearchCenterDetailsPage() {
  const { user: currentUser } = useAuth();
  const params = useParams();
  const centerId = useMemo(() => {
    const id = params?.id;
    return Array.isArray(id) ? id[0] : id;
  }, [params]);

  const [center, setCenter] = useState<ResearchCenter | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    coordinatorId: "",
    guideId: "",
    facultyId: "",
    scholarId: "",
    scholarGuideId: "",
  });

  const loadData = useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    setError(null);

    try {
      const [centerRes, usersRes, submissionsRes] = await Promise.all([
        apiGet<ApiItemResponse<ResearchCenter>>(`/research-centers/${centerId}`),
        apiGet<ApiListResponse<User>>("/users"),
        apiGet<ApiListResponse<Submission>>("/submissions"),
      ]);

      setCenter(centerRes.item);
      setAllUsers(usersRes.items);
      setSubmissions(submissionsRes.items);
      
      setFormState((prev) => ({
        ...prev,
        coordinatorId: centerRes.item.coordinator?._id ?? "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load research center details");
    } finally {
      setLoading(false);
    }
  }, [centerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter lists based on assigned researchCenter ID
  const faculty = useMemo(() => {
    return allUsers.filter((u) => {
      const rc = u.researchCenter;
      const userCenterId = (rc && typeof rc === "object") ? rc._id : rc;
      return userCenterId === centerId && u.role === "faculty";
    });
  }, [allUsers, centerId]);

  const guides = useMemo(() => {
    return allUsers.filter((u) => {
      const rc = u.researchCenter;
      const userCenterId = (rc && typeof rc === "object") ? rc._id : rc;
      return userCenterId === centerId &&
        (u.role === "research_guide" || u.roles?.includes("research_guide") || u.permissions?.includes("research_guide"));
    });
  }, [allUsers, centerId]);

  const scholars = useMemo(() => {
    return allUsers.filter((u) => {
      const rc = u.researchCenter;
      const userCenterId = (rc && typeof rc === "object") ? rc._id : rc;
      return userCenterId === centerId && u.role === "scholar";
    });
  }, [allUsers, centerId]);

  const filteredSubmissions = useMemo(() => {
    const userMap = new Map(allUsers.map((u) => [u._id, u]));
    return submissions.filter((sub) => {
      const scholarId = sub.scholar?._id || (sub.scholar as unknown as string);
      const scholarUser = userMap.get(scholarId);
      const rc = scholarUser?.researchCenter;
      const userCenterId = (rc && typeof rc === "object") ? rc._id : rc;
      return userCenterId === centerId;
    });
  }, [submissions, allUsers, centerId]);

  // Candidate dropdown lists for assigning
  const coordinators = useMemo(() => {
    return allUsers.filter((u) =>
      u.role === "faculty" ||
      u.role === "coordinator" ||
      u.roles?.includes("faculty") ||
      u.roles?.includes("coordinator") ||
      u.permissions?.includes("coordinator")
    );
  }, [allUsers]);

  const facultyCandidates = useMemo(() => {
    return allUsers.filter((u) => {
      const rc = u.researchCenter;
      const userCenterId = (rc && typeof rc === "object") ? rc._id : rc;
      return (u.role === "faculty" || u.roles?.includes("faculty")) && userCenterId !== centerId;
    });
  }, [allUsers, centerId]);

  const guideCandidates = useMemo(() => {
    return allUsers.filter((u) => {
      const rc = u.researchCenter;
      const userCenterId = (rc && typeof rc === "object") ? rc._id : rc;
      const isGuide = u.roles?.includes("research_guide") || u.permissions?.includes("research_guide") || u.role === "research_guide";
      return (u.role === "faculty" || u.roles?.includes("faculty")) && userCenterId === centerId && !isGuide;
    });
  }, [allUsers, centerId]);

  const scholarCandidates = useMemo(() => {
    return allUsers.filter((u) => {
      const rc = u.researchCenter;
      const userCenterId = (rc && typeof rc === "object") ? rc._id : rc;
      return (u.role === "scholar" || u.roles?.includes("scholar")) && userCenterId !== centerId;
    });
  }, [allUsers, centerId]);

  const handleCoordinatorAssign = async () => {
    if (!centerId) return;
    try {
      setSaving(true);
      setSaveMessage(null);
      await apiPatchJson(`/research-centers/${centerId}`, {
        coordinatorId: formState.coordinatorId || null,
      });
      await loadData();
      setSaveMessage("Coordinator assigned successfully.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to assign coordinator");
    } finally {
      setSaving(false);
    }
  };

  const handleFacultyAssign = async () => {
    if (!centerId || !center) return;
    if (!formState.facultyId) {
      setSaveMessage("Select a faculty member to assign.");
      return;
    }
    try {
      setSaving(true);
      setSaveMessage(null);
      await apiPatchJson(`/users/${formState.facultyId}`, {
        researchCenterId: centerId,
        department: center.department
      });
      await loadData();
      setSaveMessage("Faculty assigned to center successfully.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to assign faculty");
    } finally {
      setSaving(false);
    }
  };

  const handleGuideAssign = async () => {
    if (!centerId || !center) return;
    if (!formState.guideId) {
      setSaveMessage("Select a guide candidate to assign.");
      return;
    }

    const guide = allUsers.find((item) => item._id === formState.guideId);
    if (!guide) {
      setSaveMessage("Selected guide candidate not found.");
      return;
    }

    const currentRoles = guide.roles && guide.roles.length > 0 ? guide.roles : [guide.role || "faculty"];
    const nextRoles = Array.from(new Set([...currentRoles, "research_guide"]));

    try {
      setSaving(true);
      setSaveMessage(null);
      await apiPatchJson(`/users/${guide._id}`, {
        researchCenterId: centerId,
        roles: nextRoles,
      });
      await loadData();
      setSaveMessage("Research guide permissions assigned successfully.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to assign research guide");
    } finally {
      setSaving(false);
    }
  };

  const handleScholarAssign = async () => {
    if (!centerId || !center) return;
    if (!formState.scholarId || !formState.scholarGuideId) {
      setSaveMessage("Select both a scholar and a guide.");
      return;
    }

    try {
      setSaving(true);
      setSaveMessage(null);
      await apiPatchJson(`/users/${formState.scholarId}`, {
        guideId: formState.scholarGuideId,
      });
      await loadData();
      setSaveMessage("Scholar guide assignment completed successfully.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to assign scholar");
    } finally {
      setSaving(false);
    }
  };

  const facultyRows = useMemo(
    () =>
      faculty.map((f) => ({
        id: f._id,
        name: f.name,
        email: f.email,
        department: f.department || "N/A",
      })),
    [faculty]
  );

  const guideRows = useMemo(
    () =>
      guides.map((g) => ({
        id: g._id,
        name: g.name,
        email: g.email,
        department: g.department || "N/A",
      })),
    [guides]
  );

  const scholarRows = useMemo(
    () =>
      scholars.map((s) => ({
        id: s._id,
        name: s.name,
        email: s.email,
        guide: s.guide?.name ?? "Unassigned",
        status: <StatusBadge status={s.status ?? "Active"} />,
      })),
    [scholars]
  );

  const submissionRows = useMemo(
    () =>
      filteredSubmissions.map((submission) => {
        const scholarObj = allUsers.find(
          (u) => u._id === (submission.scholar?._id || (submission.scholar as unknown as string))
        );
        return {
          id: submission._id,
          title: submission.title,
          scholar: scholarObj?.name ?? "Unknown",
          submitted: formatDate(submission.submittedAt),
          status: <StatusBadge status={submission.status} />,
        };
      }),
    [filteredSubmissions, allUsers]
  );

  return (
    <PageLayout
      title="Research Center details"
      userName={currentUser?.name || "Admin"}
      roleLabel="Administrator"
      navItems={adminNav}
      activeItem="Research Centers"
    >
      <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)]">
        <Link
          href="/admin/research-centers"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--maroon-700)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Research Centers
        </Link>
        
        {loading ? (
          <p className="mt-4 text-sm text-slate-500 animate-pulse">Loading research center details...</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : center ? (
          <div className="mt-4 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--maroon-700)]">
                Research Center
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-[color:var(--maroon-900)]">
                {center.name} ({center.code})
              </h2>
              {center.description && (
                <p className="mt-2 text-sm text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-4 max-w-3xl">
                  {center.description}
                </p>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 p-4 space-y-3 shadow-sm bg-slate-50/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Details</h3>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="h-4 w-4 text-[color:var(--maroon-700)]" />
                  <span>Coordinator: <strong className="text-slate-800">{center.coordinator?.name || "Unassigned"}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="h-4 w-4 text-[color:var(--maroon-700)]" />
                  <span>Department: <strong className="text-slate-800">{center.department}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Info className="h-4 w-4 text-[color:var(--maroon-700)]" />
                  <span>Status: 
                    <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      center.status === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      {center.status}
                    </span>
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 p-4 space-y-3 shadow-sm bg-slate-50/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact & Office</h3>
                {center.officeLocation && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-[color:var(--maroon-700)]" />
                    <span>Location: <strong className="text-slate-800">{center.officeLocation}</strong></span>
                  </div>
                )}
                {center.contactEmail && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-[color:var(--maroon-700)]" />
                    <span>Email: <a href={`mailto:${center.contactEmail}`} className="text-[color:var(--maroon-700)] hover:underline font-semibold">{center.contactEmail}</a></span>
                  </div>
                )}
                {center.contactPhone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-[color:var(--maroon-700)]" />
                    <span>Phone: <strong className="text-slate-800">{center.contactPhone}</strong></span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assign / Update Coordinator
                </p>
                <div className="mt-3 grid gap-3 grid-cols-[2fr_1fr]">
                  <select
                    className={inputClass}
                    value={formState.coordinatorId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        coordinatorId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select Coordinator</option>
                    {coordinators.map((coordinator) => (
                      <option key={coordinator._id} value={coordinator._id}>
                        {coordinator.name} ({coordinator.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleCoordinatorAssign}
                    disabled={saving}
                    className="rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[color:var(--maroon-950)] transition-colors disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Assign"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assign Faculty Member to Centre
                </p>
                <div className="mt-3 grid gap-3 grid-cols-[2fr_1fr]">
                  <select
                    className={inputClass}
                    value={formState.facultyId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        facultyId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select Faculty</option>
                    {facultyCandidates.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name} ({f.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleFacultyAssign}
                    disabled={saving}
                    className="rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[color:var(--maroon-950)] transition-colors disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Assign"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assign Research Guide Role
                </p>
                <div className="mt-3 grid gap-3 grid-cols-[2fr_1fr]">
                  <select
                    className={inputClass}
                    value={formState.guideId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        guideId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select Faculty inside Centre</option>
                    {guideCandidates.map((guide) => (
                      <option key={guide._id} value={guide._id}>
                        {guide.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleGuideAssign}
                    disabled={saving}
                    className="rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[color:var(--maroon-950)] transition-colors disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Assign"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assign Scholar to Guide
                </p>
                <div className="mt-3 grid gap-3 grid-cols-[2fr_2fr_1fr]">
                  <select
                    className={inputClass}
                    value={formState.scholarId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        scholarId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select Scholar</option>
                    {scholarCandidates.map((scholar) => (
                      <option key={scholar._id} value={scholar._id}>
                        {scholar.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className={inputClass}
                    value={formState.scholarGuideId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        scholarGuideId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select Guide</option>
                    {guides.map((guide) => (
                      <option key={guide._id} value={guide._id}>
                        {guide.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleScholarAssign}
                    disabled={saving}
                    className="rounded-full bg-[color:var(--maroon-800)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[color:var(--maroon-950)] transition-colors disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Assign"}
                  </button>
                </div>
              </div>
            </div>

            {saveMessage && (
              <p className="text-xs font-medium text-[color:var(--maroon-850)]">{saveMessage}</p>
            )}
          </div>
        ) : null}
      </section>

      {center && (
        <>
          <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)] mt-6">
            <h3 className="font-display text-lg font-bold text-[color:var(--maroon-900)]">
              Assigned Faculty ({faculty.length})
            </h3>
            <div className="mt-4">
              <DataTable columns={facultyColumns} rows={facultyRows} />
            </div>
          </section>

          <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)] mt-6">
            <h3 className="font-display text-lg font-bold text-[color:var(--maroon-900)]">
              Research Guides ({guides.length})
            </h3>
            <div className="mt-4">
              <DataTable columns={guideColumns} rows={guideRows} />
            </div>
          </section>

          <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)] mt-6">
            <h3 className="font-display text-lg font-bold text-[color:var(--maroon-900)]">
              Scholars ({scholars.length})
            </h3>
            <div className="mt-4">
              <DataTable columns={scholarColumns} rows={scholarRows} />
            </div>
          </section>

          <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)] mt-6">
            <h3 className="font-display text-lg font-bold text-[color:var(--maroon-900)]">
              Submissions ({filteredSubmissions.length})
            </h3>
            <div className="mt-4">
              <DataTable columns={submissionColumns} rows={submissionRows} />
            </div>
          </section>
        </>
      )}
    </PageLayout>
  );
}
