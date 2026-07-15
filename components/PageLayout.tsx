import type { ReactNode } from "react";
import type { NavItem } from "./Sidebar";
import { Sidebar } from "./Sidebar";
import { ResponsiveShell } from "./ResponsiveShell";
import { useAuth } from "./AuthProvider";
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  Coins,
  Users,
  Award,
  Calendar,
  NotebookText,
  User as UserIcon,
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
  const isFacultyUser = currentRole === "faculty" || currentRole === "research_guide" || currentRole === "coordinator";

  if (isFacultyUser && user) {
    const isGuide = user.roles?.includes("research_guide") || user.permissions?.includes("research_guide");
    const isCoordinator = user.roles?.includes("coordinator") || user.permissions?.includes("coordinator");

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
    dynamicNav.push({ label: "Approvals", icon: ClipboardCheck, href: "/faculty/approvals" });

    if (isGuide) {
      dynamicNav.push({ label: "Portfolio Reviews", icon: Award, href: "/faculty/portfolio-reviews" });
      dynamicNav.push({ label: "Leave Reviews", icon: Calendar, href: "/faculty/leave-reviews" });
    }

    if (isCoordinator) {
      dynamicNav.push({ label: "Scholar Portfolios", icon: Award, href: "/faculty/portfolios" });
      dynamicNav.push({ label: "Research Center Leaves", icon: Calendar, href: "/faculty/leaves" });
    }

    dynamicNav.push({ label: "Reports", icon: NotebookText, href: "/faculty/reports" });
    dynamicNav.push({ label: "Incentives", icon: Coins, href: "/faculty/incentives" });
    dynamicNav.push({ label: "Profile", icon: UserIcon, href: "/faculty/profile" });

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
