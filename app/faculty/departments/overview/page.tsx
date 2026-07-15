"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { facultyNav } from "@/data/roleNav";
import { useAuth } from "@/components/AuthProvider";

export default function CoordinatorOverviewPage() {
  const { user } = useAuth();
  return (
    <PageLayout
      title="MCA Research Center Overview"
      userName={user?.name || "Faculty"}
      roleLabel="Faculty Member"
      navItems={facultyNav}
      activeItem="Research Centers"
    >
      <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-[0_14px_28px_rgba(91,11,22,0.08)]">
        <Link
          href="/faculty/departments"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--maroon-700)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Research Centers
        </Link>
        <div className="mt-6 rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--muted)] p-6 text-sm text-slate-500">
          Research Center analytics are not available yet.
        </div>
      </section>
    </PageLayout>
  );
}
