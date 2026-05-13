"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Topbar } from "./Topbar";

type ResponsiveShellProps = {
  title: string;
  userName: string;
  roleLabel: string;
  sidebar: ReactNode;
  children: ReactNode;
};

export function ResponsiveShell({
  title,
  userName,
  roleLabel,
  sidebar,
  children,
}: ResponsiveShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((open) => !open);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[color:var(--paper)]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {isSidebarOpen ? (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={handleCloseSidebar}
          />
        ) : null}
        <div
          id="primary-sidebar"
          className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:w-64 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebar}
        </div>
        <div className="flex flex-1 flex-col">
          <Topbar
            title={title}
            userName={userName}
            roleLabel={roleLabel}
            onMenuClick={handleToggleSidebar}
            isMenuOpen={isSidebarOpen}
          />
          <main className="flex-1 px-4 pb-10 pt-5 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
