"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  CreditCard,
  Settings,
  Activity,
  ChevronRight,
} from "lucide-react";

const NAV = [
  { href: "/dashboard",          icon: LayoutDashboard, label: "Overview"     },
  { href: "/dashboard/#transactions", icon: Receipt,     label: "Transactions" },
  { href: "/dashboard/#portfolio",icon: TrendingUp,      label: "Portfolio"    },
  { href: "/dashboard/billing",  icon: CreditCard,      label: "Billing"      },
  { href: "/dashboard/settings", icon: Settings,        label: "Settings"     },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col z-30"
      style={{
        width: "var(--sidebar-width)",
        background: "hsl(220 14% 6%)",
        borderRight: "1px solid hsl(var(--border))",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "hsl(var(--info-dim))", border: "1px solid hsl(var(--info) / 0.3)" }}
        >
          <Activity className="w-4 h-4" style={{ color: "hsl(var(--info))" }} />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
            WealthWatch
          </p>
          <p className="text-[10px]" style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}>
            Dashboard
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="label-xs px-3 mb-3">Navigation</p>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`}>
              <Icon className="nav-icon w-4 h-4 shrink-0" />
              <span>{label}</span>
              {active && <ChevronRight className="w-3 h-3 ml-auto" style={{ color: "hsl(var(--info))" }} />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section — live status */}
      <div className="px-4 py-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <div
          className="rounded-lg p-3 flex items-center gap-2.5"
          style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border))" }}
        >
          <span className="w-2 h-2 rounded-full animate-live-pulse shrink-0" style={{ background: "hsl(var(--positive))" }} />
          <div>
            <p className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>Markets Open</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}>
              NSE · BSE · Live
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}