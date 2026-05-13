import { Menu, User } from "lucide-react";

type TopbarProps = {
  title: string;
  userName: string;
  roleLabel: string;
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
};

export function Topbar({
  title,
  userName,
  roleLabel,
  onMenuClick,
  isMenuOpen = false,
}: TopbarProps) {
  const showMenuButton = typeof onMenuClick === "function";

  return (
    <header className="border-b border-[color:var(--border)] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(91,11,22,0.05)] sm:px-6 sm:py-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {showMenuButton ? (
            <button
              type="button"
              aria-label="Toggle navigation"
              aria-controls="primary-sidebar"
              aria-expanded={isMenuOpen}
              onClick={onMenuClick}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-[color:var(--maroon-800)] shadow-sm transition hover:bg-[color:var(--muted)] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          ) : null}
          <h1 className="font-display text-xl text-[color:var(--maroon-900)] sm:text-2xl">
            {title}
          </h1>
        </div>
        <div className="flex w-full items-center gap-3 rounded-full border border-[color:var(--border)] bg-white px-3 py-2 shadow-sm sm:w-auto sm:px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--muted)] text-[color:var(--maroon-800)] sm:h-9 sm:w-9">
            <User className="h-4 w-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-slate-800">
              {userName}
            </p>
            <p className="truncate text-xs text-slate-500">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
