import type { ReactNode } from "react";
import type { NavItem } from "./Sidebar";
import { Sidebar } from "./Sidebar";
import { ResponsiveShell } from "./ResponsiveShell";
import { useAuth } from "./AuthProvider";
import {
  LayoutDashboard,
  FileText,
  Coins,
  Users,
  NotebookText,
  FolderOpen,
} from "lucide-react";

type PageLayoutProps = {
  title: string;
  userName: string;
  roleLabel: string;
  navItems: NavItem[];
  activeItem: string;
  children: ReactNode;
};

export function PageLayout({
  title,
  userName,
  roleLabel,
  navItems,
  activeItem,
  children,
}: PageLayoutProps) {
  const { user } = useAuth();

  let resolvedNav = navItems;
  let resolvedRoleLabel = roleLabel;

  const currentRole = user?.role || user?.roles?.[0];
  const isFacultyUser = currentRole === "faculty";

  if (isFacultyUser && user) {
    const isGuide = user.permissions?.includes("research_guide");
    const isCoordinator = user.permissions?.includes("coordinator");

    // Dynamic Role Label based on permissions
    const labels = ["Faculty Member"];
    if (isGuide) labels.push("Research Guide");
    if (isCoordinator) labels.push("Coordinator");
    resolvedRoleLabel = labels.join(" / ");

    const dynamicNav: NavItem[] = [
      { label: "Dashboard", icon: LayoutDashboard, href: "/faculty" },
    ];

    if (isGuide) {
      dynamicNav.push({ label: "Scholars", icon: Users, href: "/faculty/scholars" });
    }

    dynamicNav.push({ label: "Submissions", icon: FileText, href: "/faculty/submissions" });

    if (isCoordinator) {
      dynamicNav.push({ label: "Center Documents", icon: FolderOpen, href: "/faculty/center-documents" });
    }

    dynamicNav.push({ label: "Reports", icon: NotebookText, href: "/faculty/reports" });
    dynamicNav.push({ label: "Incentives", icon: Coins, href: "/faculty/incentives" });

    resolvedNav = dynamicNav;
  }

  return (
    <ResponsiveShell
      title={title}
      userName={userName}
      roleLabel={resolvedRoleLabel}
      sidebar={<Sidebar navItems={resolvedNav} activeItem={activeItem} />}
    >
      {children}
    </ResponsiveShell>
  );
}
