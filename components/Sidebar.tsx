import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BookOpen, LogOut } from "lucide-react";

type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
};

type SidebarProps = {
  navItems: NavItem[];
  activeItem: string;
};

export function Sidebar({ navItems, activeItem }: SidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col gap-6 overflow-y-auto bg-gradient-to-b from-[color:var(--maroon-900)] to-[color:var(--maroon-700)] px-4 py-6 text-white sm:px-5 lg:h-screen lg:w-64">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
          <BookOpen className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">
            Research System
          </p>
          <p className="font-display text-lg font-semibold">Dashboard</p>
        </div>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.label === activeItem;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-white text-[color:var(--maroon-900)] shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs text-white/80">
          Minimal academic workspace for research workflows and approvals.
        </div>
        <Link
          href="/"
          className="flex w-full items-center justify-start gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/20"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Link>
      </div>
    </aside>
  );
}

export type { NavItem };
