"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Gem,
  Target,
  CalendarDays,
  Briefcase,
  ListChecks,
  HeartPulse,
  Upload,
  Banknote,
  Landmark,
  Waves,
  Scale,
  TrendingUp,
  Receipt,
  type LucideIcon,
} from "lucide-react";

// Monochrome stroke icons replace the emoji set — they inherit currentColor,
// so active items pick up the cyan accent instead of fixed emoji colors.
const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; exact: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/financial", label: "Financial", icon: Wallet, exact: false },
  { href: "/perks", label: "Perks & Points", icon: Gem, exact: false },
  { href: "/goals", label: "Goals + Vision", icon: Target, exact: false },
  { href: "/planner", label: "Planner", icon: CalendarDays, exact: false },
  { href: "/job-search", label: "Job Search", icon: Briefcase, exact: false },
  { href: "/tasks", label: "Tasks", icon: ListChecks, exact: false },
  { href: "/health", label: "Health", icon: HeartPulse, exact: false },
  { href: "/import", label: "Import", icon: Upload, exact: false },
];

const SIMULATOR_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/finance/paycheck", label: "Paycheck", icon: Banknote },
  { href: "/finance/heloc", label: "HELOC", icon: Landmark },
  { href: "/finance/cashflow", label: "Cash Flow", icon: Waves },
  { href: "/finance/scenarios", label: "Scenarios", icon: Scale },
  { href: "/finance/investments", label: "Investments", icon: TrendingUp },
  { href: "/finance/tax", label: "Tax Center", icon: Receipt },
];

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 h-full overflow-y-auto"
        style={{
          width: 240,
          background: "var(--bg-elevated)",
          borderRight: "1px solid rgba(0,212,255,0.1)",
        }}
      >
        {/* Logo / wordmark */}
        <div
          className="flex items-center gap-2 px-6 py-6"
          style={{ borderBottom: "1px solid rgba(0,212,255,0.1)" }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg,#00d4ff,#1e90ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#050505",
              flexShrink: 0,
            }}
          >
            M
          </div>
          <span
            className="gradient-text font-semibold tracking-wide text-sm"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            micci-os
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-3 py-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                style={{
                  color: active ? "var(--accent-cyan)" : "var(--text-secondary)",
                  background: active ? "rgba(0,212,255,0.08)" : "transparent",
                  boxShadow: active ? "inset 2px 0 0 var(--accent-cyan)" : "none",
                  textDecoration: "none",
                }}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.75} style={{ flexShrink: 0 }} />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}

          {/* Finance Simulators sub-section */}
          <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(0,212,255,0.08)" }}>
            <div
              className="px-3 py-1 text-[10px] uppercase tracking-widest font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              Simulators
            </div>
            {SIMULATOR_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150"
                  style={{
                    color: active ? "var(--accent-cyan)" : "var(--text-muted)",
                    background: active ? "rgba(0,212,255,0.08)" : "transparent",
                    boxShadow: active ? "inset 2px 0 0 var(--accent-cyan)" : "none",
                    textDecoration: "none",
                  }}
                >
                  <Icon size={14} strokeWidth={active ? 2.2 : 1.75} style={{ flexShrink: 0 }} />
                  <span className="font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div
          className="mt-auto px-6 py-4 text-xs"
          style={{
            color: "var(--text-muted)",
            borderTop: "1px solid rgba(0,212,255,0.08)",
            fontFamily: "var(--font-geist-mono)",
          }}
        >
          v0.2.0
        </div>
      </aside>

      {/* ── Mobile bottom tab bar (top 5 sections) ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around z-50"
        style={{
          background: "var(--bg-elevated)",
          borderTop: "1px solid rgba(0,212,255,0.15)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          height: 64,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {NAV_ITEMS.slice(0, 5).map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-3 py-2 text-xs transition-all duration-150"
              style={{
                color: active ? "var(--accent-cyan)" : "var(--text-muted)",
                textDecoration: "none",
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.75} />
              <span className="font-medium">{label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
