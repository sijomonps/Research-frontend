import type { ReactNode } from "react";
import type { NavItem } from "./Sidebar";
import { Sidebar } from "./Sidebar";
import { ResponsiveShell } from "./ResponsiveShell";

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
  return (
    <ResponsiveShell
      title={title}
      userName={userName}
      roleLabel={roleLabel}
      sidebar={<Sidebar navItems={navItems} activeItem={activeItem} />}
    >
      {children}
    </ResponsiveShell>
  );
}
