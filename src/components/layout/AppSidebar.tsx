"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  HandHeart,
  LayoutDashboard,
  MapPinned,
  Shield,
  Ticket,
  Truck,
  UserPlus,
  UserRound,
  UserRoundPlus,
  Warehouse,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getUserLabel } from "@/lib/firebase/auth";
import {
  findRegistrationForUser,
  useRegistrationState,
} from "@/hooks/useRegistrationState";

const STORAGE_KEY = "reliefnet-nav-collapsed";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/reliefDemandManagement",
    label: "Relief demand management",
    icon: ClipboardList,
  },
  {
    href: "/relief-coordination",
    label: "Relief coordination",
    icon: Building2,
  },
  {
    href: "/ticket-queue",
    label: "Relief demand & ticket queue",
    icon: Ticket,
  },
  {
    href: "/ngo-portal",
    label: "NGO pledge portal",
    icon: HandHeart,
  },
  {
    href: "/volunteer-registration",
    label: "Volunteer registration",
    icon: UserPlus,
  },
  {
    href: "/registration-queue",
    label: "Registration queue",
    icon: UserRoundPlus,
  },
  {
    href: "/emergency-assets",
    label: "Emergency assets",
    icon: MapPinned,
  },
  {
    href: "/warehouses",
    label: "Warehouses",
    icon: Warehouse,
  },
  {
    href: "/emergency-directory",
    label: "Emergency directory",
    icon: Shield,
  },
  {
    href: "/logistics",
    label: "Transport dispatch",
    icon: Truck,
  },
  {
    href: "/profile",
    label: "User profile",
    icon: UserRound,
  },
  {
    href: "/admin/seed",
    label: "Seed data console",
    icon: Database,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { hydrated, volunteers, ngos, citizenGroups } = useRegistrationState();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  const hasRegistration = Boolean(
    user &&
      hydrated &&
      findRegistrationForUser(
        volunteers,
        ngos,
        {
          uid: user.uid,
          email: user.email,
          phone: user.phoneNumber,
        },
        citizenGroups,
      ),
  );

  const items = navItems.map((item) =>
    item.href === "/volunteer-registration"
      ? {
          ...item,
          label: hasRegistration ? "My registration" : "Volunteer registration",
        }
      : item,
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
    setReady(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={`sticky top-0 z-40 flex h-screen shrink-0 flex-col border-r border-[var(--line)] bg-[rgba(255,255,255,0.88)] shadow-[var(--shadow)] backdrop-blur-md transition-[width] duration-300 ease-out ${
        collapsed ? "w-[76px]" : "w-[280px]"
      } ${ready ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className={`flex items-center gap-3 border-b border-[var(--line)] px-3 py-4 ${
          collapsed ? "justify-center" : "justify-between px-4"
        }`}
      >
        {!collapsed ? (
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight text-[var(--ink)]">
              ReliefNet
            </p>
            <p className="truncate text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              Operations
            </p>
          </div>
        ) : (
          <span className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--accent)]">
            R
          </span>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-white/70 text-[var(--ink)] transition hover:bg-white"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label="Main">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--ink)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={`border-t border-[var(--line)] p-3 ${collapsed ? "px-2" : ""}`}>
        {!collapsed ? (
          <div className="mb-3 rounded-xl bg-[var(--accent-soft)] px-3 py-2">
            <p className="truncate text-sm font-medium text-[var(--accent-strong)]">
              {getUserLabel(user)}
            </p>
            <p className="truncate text-xs text-[var(--ink-muted)]">Signed in</p>
          </div>
        ) : null}
        <LogoutButton compact={collapsed} className="w-full px-2 py-2.5" />
      </div>
    </aside>
  );
}
