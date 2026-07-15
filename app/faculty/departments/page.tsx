"use client";

import { useEffect, useState } from "react";
import { Building2, Mail, Phone, MapPin, User, Info, FileText } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { facultyNav } from "@/data/roleNav";
import { apiGet, type ApiItemResponse, type ApiListResponse } from "@/lib/api";
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

export default function FacultyResearchCenterPage() {
  const { user } = useAuth();
  const [center, setCenter] = useState<ResearchCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCenter = async () => {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);

        // Fetch all centers
        const centersRes = await apiGet<ApiListResponse<ResearchCenter>>("/research-centers");
        if (!isMounted) return;

        // Try to find by ID first, then fallback by matching department name
        const userCenterId = user.researchCenter?._id || user.researchCenter;
        let matched = centersRes.items.find((c) => c._id === userCenterId);
        
        if (!matched && user.department) {
          matched = centersRes.items.find(
            (c) => c.name.toLowerCase() === user.department?.toLowerCase() ||
                   c.department.toLowerCase() === user.department?.toLowerCase()
          );
        }

        if (matched) {
          setCenter(matched);
        } else {
          setError("No Research Center assigned or found for your department.");
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load Research Center information");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCenter();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <PageLayout
      title="My Research Center"
      userName={user?.name || "Faculty"}
      roleLabel="Faculty Member"
      navItems={facultyNav}
      activeItem="Research Centers"
    >
      <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)]">
        <div className="border-b border-[color:var(--border)] pb-4">
          <h2 className="font-display text-lg text-[color:var(--maroon-900)] flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[color:var(--maroon-700)]" />
            Research Center Information
          </h2>
          <p className="text-sm text-slate-500">
            View details about your officially assigned institutional research unit.
          </p>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500 animate-pulse">Loading Research Center details...</p>
        ) : error ? (
          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-6 text-center text-sm text-slate-500">
            <Info className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            {error}
          </div>
        ) : center ? (
          <div className="mt-6 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--maroon-700)]">
                Centre Name
              </p>
              <h1 className="mt-2 font-display text-2xl font-bold text-[color:var(--maroon-900)]">
                {center.name} ({center.code})
              </h1>
              {center.description && (
                <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-2xl bg-slate-50 border border-slate-100 rounded-xl p-4">
                  {center.description}
                </p>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Administration</h3>
                
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-[color:var(--maroon-700)]" />
                  <div>
                    <span className="text-slate-500">Coordinator: </span>
                    <span className="font-semibold text-slate-700">{center.coordinator?.name || "Unassigned"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <FileText className="h-4 w-4 text-[color:var(--maroon-700)]" />
                  <div>
                    <span className="text-slate-500">Department: </span>
                    <span className="font-semibold text-slate-700">{center.department}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Info className="h-4 w-4 text-[color:var(--maroon-700)]" />
                  <div>
                    <span className="text-slate-500">Status: </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      center.status === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      {center.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contact & Location</h3>

                {center.officeLocation && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-[color:var(--maroon-700)]" />
                    <div>
                      <span className="text-slate-500">Office Location: </span>
                      <span className="font-semibold text-slate-700">{center.officeLocation}</span>
                    </div>
                  </div>
                )}

                {center.contactEmail && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-[color:var(--maroon-700)]" />
                    <div>
                      <span className="text-slate-500">Email: </span>
                      <a href={`mailto:${center.contactEmail}`} className="font-semibold text-[color:var(--maroon-700)] hover:underline">
                        {center.contactEmail}
                      </a>
                    </div>
                  </div>
                )}

                {center.contactPhone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-[color:var(--maroon-700)]" />
                    <div>
                      <span className="text-slate-500">Phone: </span>
                      <a href={`tel:${center.contactPhone}`} className="font-semibold text-slate-700 hover:underline">
                        {center.contactPhone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </PageLayout>
  );
}
