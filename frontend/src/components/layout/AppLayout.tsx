// frontend/src/components/layout/AppLayout.tsx
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { Badge, Button } from "../ui/primitives";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
    isActive
      ? "bg-indigo-600 text-white"
      : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-x-hidden">
      <header className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-lg font-bold tracking-tight text-white">
              TriageSync
            </span>
            {user && (
              <Badge
                label={user.role}
                tone={user.role === "ADMIN" ? "warn" : "info"}
              />
            )}
          </div>

          <nav aria-label="Primary navigation" className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <NavLink to="/tickets" className={navItemClass}>
              Tickets
            </NavLink>
            <NavLink to="/resources" className={navItemClass}>
              Resources
            </NavLink>
            <NavLink to="/bookings" className={navItemClass}>
              My Bookings
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navItemClass}>
                Admin
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden md:inline text-xs text-slate-400 truncate max-w-[180px]">
                {user.email}
              </span>
            )}
            <Button variant="secondary" type="button" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}