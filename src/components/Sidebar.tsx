"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/financial", label: "Financial", icon: "💰" },
  { href: "/goals", label: "Goals + Vision", icon: "🎯" },
  { href: "/planner", label: "Planner", icon: "📅" },
  { href: "/health", label: "Health", icon: "🏋️" },
];

export default function Sidebar() {
  const pathname = usePathname();

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
        <nav className="flex flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  active ? "nav-active" : ""
                }`}
                style={{
                  color: active ? "var(--accent-cyan)" : "var(--text-secondary)",
                  borderLeft: active ? undefined : "2px solid transparent",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
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
          v0.1.0
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
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
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
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
              <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
              <span className="font-medium">{label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
