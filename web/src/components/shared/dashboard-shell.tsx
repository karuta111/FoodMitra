'use client';

import { type ReactNode } from 'react';
import { Bell, LogOut, Menu, X, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface DashboardShellProps {
  title: string;
  navItems: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  children: ReactNode;
  headerColor?: string;
  roleLabel: string;
  /** When set, overrides the active nav item's label as the top bar page title. */
  pageTitleOverride?: string;
}

export function DashboardShell({
  title,
  navItems,
  activeId,
  onSelect,
  children,
  headerColor,
  roleLabel,
  pageTitleOverride,
}: DashboardShellProps) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (user?.fullName || user?.email || 'U').slice(0, 2).toUpperCase();

  // Top bar shows the active section's label as the page title (overridable for sub-views like Menu management)
  const activeItem = navItems.find((item) => item.id === activeId);
  const pageTitle = pageTitleOverride || activeItem?.label || title;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ───────────────────────── Sidebar ───────────────────────── */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Branding (aligned with top bar height) */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-200 shrink-0">
          <div className="bg-orange-500 w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-bold text-slate-800 text-base truncate">{title}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{roleLabel}</span>
          </div>
          {/* Close button on mobile */}
          <button
            className="lg:hidden ml-auto p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  setMobileOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-orange-50 text-orange-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium',
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-orange-600' : 'text-slate-400')} />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-orange-500 text-white hover:bg-orange-500">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ───────────────────── Right column: top bar + main ───────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 shrink-0">
          <div className="h-full flex items-center justify-between px-4 lg:px-6 gap-3">
            {/* Left: hamburger + page title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex flex-col leading-tight min-w-0">
                <h1 className="text-lg font-semibold text-slate-800 truncate">{pageTitle}</h1>
                <span className="text-xs text-slate-500 truncate">
                  Signed in as {title} {roleLabel}
                </span>
              </div>
            </div>

            {/* Right: bell + user pill + logout */}
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-9 w-9 p-0">
                <Bell className="w-4 h-4" />
              </Button>

              {/* User profile pill */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-full pl-1 pr-3 py-1 border border-slate-200">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-orange-500 text-white text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-xs font-semibold text-slate-800">{user?.fullName || 'User'}</span>
                  <span className="text-[10px] text-slate-500">{roleLabel}</span>
                </div>
              </div>

              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-red-600 hover:bg-slate-100 h-9 w-9 p-0" onClick={logout} aria-label="Logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold text-slate-800 ">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, accent = 'orange' }: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: 'orange' | 'green' | 'blue' | 'red' | 'slate';
}) {
  const accentMap: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-sky-50 text-sky-600',
    red: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-semibold text-slate-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', accentMap[accent])}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <span className="text-2xl">📭</span>
      </div>
      <h3 className="text-sm font-medium text-slate-700">{title}</h3>
      {message && <p className="text-xs text-slate-500 mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
