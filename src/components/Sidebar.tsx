"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  Calculator,
  Newspaper,
  LayoutGrid,
  X,
  type LucideIcon,
} from "lucide-react";

// Monochrome stroke icons replace the emoji set — they inherit currentColor,
// so active items pick up the cyan accent instead of fixed emoji colors.
const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; exact: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/briefs", label: "Briefs", icon: Newspaper, exact: false },
  { href: "/financial", label: "Financial", icon: Wallet, exact: false },
  { href: "/perks", label: "Perks & Points", icon: Gem, exact: false },
  { href: "/goals", label: "Goals + Vision", icon: Target, exact: false },
  { href: "/planner", label: "Planner", icon: CalendarDays, exact: false },
  { href: "/pipeline", label: "Job Search", icon: Briefcase, exact: false },
  { href: "/tasks", label: "Actions", icon: ListChecks, exact: false },
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
  { href: "/finance/calculators", label: "Calculators", icon: Calculator },
];

// Phone tab bar: the four most-used sections; everything else (Import,
// Planner, simulators, …) lives in the "More" sheet. Previously the bar
// showed NAV_ITEMS.slice(0, 5), leaving half the app unreachable on mobile.
const MOBILE_TABS = ["/dashboard", "/financial", "/health", "/tasks"];

export default function Sidebar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  // Close the sheet whenever navigation happens
  useEffect(() => { setMoreOpen(false); }, [pathname]);

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
          background: "rgba(7, 11, 26, 0.45)",
          borderRight: "1px solid var(--glass-line)",
          backdropFilter: "blur(var(--glass-blur)) saturate(160%)",
          WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(160%)",
        }}
      >
        {/* Logo / wordmark */}
        <div
          className="flex items-center gap-2 px-6 py-6"
          style={{ borderBottom: "1px solid var(--glass-line)" }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--accent-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--accent-ink)",
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
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  background: active ? "var(--glass-bg-strong)" : "transparent",
                  boxShadow: active ? "inset 0 0 0 1px var(--glass-line), inset 0 1px 0 var(--glass-highlight)" : "none",
                  textDecoration: "none",
                }}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.75} style={{ flexShrink: 0, color: active ? "var(--accent-cyan)" : undefined }} />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}

          {/* Finance Simulators sub-section */}
          <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--glass-line)" }}>
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
                    color: active ? "var(--text-primary)" : "var(--text-muted)",
                    background: active ? "var(--glass-bg-strong)" : "transparent",
                    boxShadow: active ? "inset 0 0 0 1px var(--glass-line)" : "none",
                    textDecoration: "none",
                  }}
                >
                  <Icon size={14} strokeWidth={active ? 2.2 : 1.75} style={{ flexShrink: 0, color: active ? "var(--accent-cyan)" : undefined }} />
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
            borderTop: "1px solid var(--glass-line)",
            fontFamily: "var(--font-geist-mono)",
          }}
        >
          v0.2.0
        </div>
      </aside>

      {/* ── Mobile "More" sheet ── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="All sections">
          <button aria-label="Close menu" onClick={() => setMoreOpen(false)}
            className="absolute inset-0 w-full h-full" style={{ background: "rgba(3,6,16,0.55)", border: "none" }} />
          <div className="absolute left-0 right-0 bottom-0 rounded-t-3xl px-4 pt-3"
            style={{
              background: "rgba(13, 19, 48, 0.86)",
              borderTop: "1px solid var(--glass-line)",
              backdropFilter: "blur(var(--glass-blur)) saturate(160%)",
              WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(160%)",
              paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
              maxHeight: "80vh", overflowY: "auto",
            }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>All sections</span>
              <button onClick={() => setMoreOpen(false)} aria-label="Close"
                className="p-2 rounded-full" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-line)", color: "var(--text-secondary)" }}>
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
                const active = isActive(href, exact);
                return (
                  <Link key={href} href={href}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-1 text-center"
                    style={{
                      background: active ? "rgba(var(--accent-rgb), 0.14)" : "var(--glass-bg)",
                      border: "1px solid var(--glass-line)",
                      color: active ? "var(--accent-cyan)" : "var(--text-secondary)",
                      textDecoration: "none",
                    }}>
                    <Icon size={20} strokeWidth={1.9} />
                    <span className="text-[11.5px] font-medium leading-tight">{label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider mt-4 mb-2" style={{ color: "var(--text-muted)" }}>Simulators</div>
            <div className="grid grid-cols-3 gap-2">
              {SIMULATOR_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(href, false);
                return (
                  <Link key={href} href={href}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-1 text-center"
                    style={{
                      background: active ? "rgba(var(--accent-rgb), 0.14)" : "var(--glass-bg)",
                      border: "1px solid var(--glass-line)",
                      color: active ? "var(--accent-cyan)" : "var(--text-secondary)",
                      textDecoration: "none",
                    }}>
                    <Icon size={18} strokeWidth={1.9} />
                    <span className="text-[11px] font-medium leading-tight">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom tab bar: 4 main sections + More ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around z-50"
        style={{
          background: "rgba(13, 19, 48, 0.72)",
          borderTop: "1px solid var(--glass-line)",
          backdropFilter: "blur(var(--glass-blur)) saturate(160%)",
          WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(160%)",
          height: "calc(64px + env(safe-area-inset-bottom))",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {NAV_ITEMS.filter(i => MOBILE_TABS.includes(i.href)).map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact) && !moreOpen;
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
        {(() => {
          // "More" lights up when the current page isn't one of the 4 tabs
          const onOther = !NAV_ITEMS.some(i => MOBILE_TABS.includes(i.href) && isActive(i.href, i.exact));
          const active = moreOpen || onOther;
          return (
            <button onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen} aria-label="More sections"
              className="flex flex-col items-center gap-1 px-3 py-2 text-xs"
              style={{ color: active ? "var(--accent-cyan)" : "var(--text-muted)", background: "none", border: "none" }}>
              <LayoutGrid size={20} strokeWidth={active ? 2.2 : 1.75} />
              <span className="font-medium">More</span>
            </button>
          );
        })()}
      </nav>
    </>
  );
}
