"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  HandHeart,
  LayoutDashboard,
  MapPinned,
  Radio,
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
import { getOperationalMode } from "@/lib/features/operationalMode";
import {
  findRegistrationForUser,
  useRegistrationState,
} from "@/hooks/useRegistrationState";

const STORAGE_KEY = "reliefnet-nav-collapsed";
const MOBILE_MQ = "(max-width: 1023px)";

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
    href: "/activity",
    label: "Live activity",
    icon: Radio,
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
    label: "Pledge help portal",
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
    href: "/transport",
    label: "Transport & fleet",
    icon: Truck,
  },
  {
    href: "/profile",
    label: "User profile",
    icon: UserRound,
  },
  // Seed console is kept at /admin/seed but hidden from nav for all users.
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { hydrated, volunteers, ngos, citizenGroups } = useRegistrationState();
  const operationalMode = getOperationalMode();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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

  const items = navItems
    .filter(
      (item) =>
        item.href !== "/registration-queue" || operationalMode === "ADMIN_SOURCED",
    )
    .map((item) =>
      item.href === "/volunteer-registration"
        ? {
            ...item,
            label: hasRegistration
              ? "My registration"
              : "Volunteer registration",
          }
        : item,
    );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const syncViewport = () => setIsMobile(mq.matches);
    syncViewport();
    mq.addEventListener("change", syncViewport);

    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
      setReady(true);
    }, 0);

    return () => {
      mq.removeEventListener("change", syncViewport);
      window.clearTimeout(timer);
    };
  }, []);

  function toggleCollapsed() {
    if (isMobile) return;
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  // Mobile always stays contracted (icon rail); desktop respects user preference.
  const effectivelyCollapsed = isMobile || collapsed;

  return (
    <aside
      className={`sticky top-0 z-40 flex h-dvh shrink-0 flex-col border-r border-[var(--line)] bg-[rgba(255,255,255,0.88)] shadow-[var(--shadow)] backdrop-blur-md transition-[width] duration-300 ease-out ${
        effectivelyCollapsed ? "w-[64px] sm:w-[76px]" : "w-[280px]"
      } ${ready ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className={`flex items-center gap-3 border-b border-[var(--line)] px-2 py-3 sm:px-3 sm:py-4 ${
          effectivelyCollapsed ? "justify-center" : "justify-between px-4"
        }`}
      >
        {!effectivelyCollapsed ? (
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-fraunces)] text-xl tracking-tight text-[var(--ink)] lg:text-2xl">
              ReliefNet
            </p>
            <p className="truncate text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)] sm:text-xs">
              Operations
            </p>
          </div>
        ) : (
          <span className="font-[family-name:var(--font-fraunces)] text-lg text-[var(--accent)] sm:text-xl">
            R
          </span>
        )}

        {!isMobile ? (
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
        ) : null}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-1.5 py-3 sm:space-y-1 sm:px-2 sm:py-4" aria-label="Main">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={effectivelyCollapsed ? item.label : undefined}
              className={`group flex items-center gap-3 rounded-xl px-2 py-2 text-xs font-medium transition sm:px-3 sm:py-2.5 sm:text-sm ${
                effectivelyCollapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--ink)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
              {!effectivelyCollapsed ? (
                <span className="truncate">{item.label}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div
        className={`border-t border-[var(--line)] p-2 sm:p-3 ${
          effectivelyCollapsed ? "px-1.5 sm:px-2" : ""
        }`}
      >
        {user ? (
          <>
            {!effectivelyCollapsed ? (
              <div className="mb-3 rounded-xl bg-[var(--accent-soft)] px-3 py-2">
                <p className="truncate text-sm font-medium text-[var(--accent-strong)]">
                  {getUserLabel(user)}
                </p>
                <p className="truncate text-xs text-[var(--ink-muted)]">Signed in</p>
              </div>
            ) : null}
            <LogoutButton compact={effectivelyCollapsed} className="w-full px-2 py-2.5" />
          </>
        ) : (
          <Link
            href={`/login?returnTo=${encodeURIComponent(pathname || "/transport")}`}
            title={effectivelyCollapsed ? "Sign in" : undefined}
            className={`inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-3 py-2.5 text-xs font-semibold text-white sm:text-sm ${
              effectivelyCollapsed ? "px-2" : ""
            }`}
          >
            {effectivelyCollapsed ? "In" : "Sign in"}
          </Link>
        )}
      </div>
    </aside>
  );
}
