import type { NavItem } from "@/components/Sidebar";
import {
  Building2,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  NotebookText,
  Settings,
  User,
  Users,
  Award,
  Calendar,
  Coins,
} from "lucide-react";

export const scholarNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/scholar" },
  { label: "My Submission", icon: FileText, href: "/scholar/submissions" },
  { label: "My Portfolio", icon: Award, href: "/scholar/portfolio" },
  { label: "Leave Applications", icon: Calendar, href: "/scholar/leaves" },
  { label: "Activity Report", icon: NotebookText, href: "/scholar/report" },
];

export const facultyNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/faculty" },
  { label: "Submissions", icon: FileText, href: "/faculty/submissions" },
  { label: "Incentives", icon: Coins, href: "/faculty/incentives" },
];

export const researchGuideNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/research-guide" },
  { label: "Scholars", icon: Users, href: "/research-guide/scholars" },
  { label: "Submissions", icon: FileText, href: "/research-guide/submissions" },
  { label: "Approvals", icon: ClipboardCheck, href: "/research-guide/approvals" },
  { label: "Portfolio Reviews", icon: Award, href: "/research-guide/portfolio-reviews" },
  { label: "Leave Reviews", icon: Calendar, href: "/research-guide/leave-reviews" },
  { label: "Reports", icon: NotebookText, href: "/research-guide/reports" },
  { label: "Incentives", icon: Coins, href: "/research-guide/incentives" },
  { label: "Profile", icon: User, href: "/research-guide/profile" },
];

export const adminNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Users", icon: Users, href: "/admin/users" },
  { label: "Research Centers", icon: Building2, href: "/admin/research-centers" },
  { label: "Submissions", icon: FileText, href: "/admin/submissions" },
  { label: "Scholar Portfolios", icon: Award, href: "/admin/portfolios" },
  { label: "Overall Leaves", icon: Calendar, href: "/admin/leaves" },
  { label: "Reports", icon: NotebookText, href: "/admin/reports" },
  { label: "Incentives", icon: Coins, href: "/admin/incentives" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

export const coordinatorNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/coordinator" },
  { label: "Submissions", icon: FileText, href: "/coordinator/submissions" },
  { label: "Approvals", icon: ClipboardCheck, href: "/coordinator/approvals" },
  { label: "Scholar Portfolios", icon: Award, href: "/coordinator/portfolios" },
  { label: "Research Center Leaves", icon: Calendar, href: "/coordinator/leaves" },
  { label: "Reports", icon: NotebookText, href: "/coordinator/reports" },
  { label: "Profile", icon: User, href: "/coordinator/profile" },
];

export const libraryNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/library" },
];
