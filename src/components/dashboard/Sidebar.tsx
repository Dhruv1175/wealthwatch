"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  CreditCard,
  Settings,
  Activity,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/portfolio", icon: TrendingUp, label: "Portfolio" },
  { href: "/dashboard/transactions", icon: Receipt, label: "Transactions" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Billing" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  // Handle screen size changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const large = e.matches;
      setIsLargeScreen(large);
      setIsOpen(large);
    };

    handleMediaChange(mediaQuery);
    
    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (!isLargeScreen && isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLargeScreen, isOpen]);

  const closeSidebar = () => setIsOpen(false);
  const openSidebar = () => setIsOpen(true);

  return (
    <>
      {/* Mobile Hamburger Button - only visible on small screens when sidebar is closed */}
      {!isLargeScreen && !isOpen && (
        <button
          onClick={openSidebar}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg lg:hidden"
          style={{
            background: "hsl(var(--surface-raised))",
            border: "1px solid hsl(var(--border-token))",
            color: "hsl(var(--foreground))",
          }}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Backdrop - only visible on mobile when sidebar is open */}
      {!isLargeScreen && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className="fixed top-0 left-0 h-screen flex flex-col z-50 transition-transform duration-300 ease-in-out"
        style={{
          width: "var(--sidebar-width)",
          background: "hsl(220 14% 6%)",
          borderRight: "1px solid hsl(var(--border-token))",
          transform: isLargeScreen
            ? "translateX(0)"
            : isOpen
            ? "translateX(0)"
            : "translateX(-100%)",
          boxShadow: !isLargeScreen && isOpen ? "2px 0 8px rgba(0,0,0,0.15)" : "none",
        }}
      >
        {/* Logo */}
        <div
          className="px-5 py-5 flex items-center justify-between shrink-0"
          style={{ borderBottom: "1px solid hsl(var(--border-token))" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "hsl(var(--info-dim))",
                border: "1px solid hsl(var(--info) / 0.3)",
              }}
            >
              <Activity className="w-4 h-4" style={{ color: "hsl(var(--info))" }} />
            </div>
            <div>
              <p
                className="text-sm font-bold tracking-tight"
                style={{ color: "hsl(var(--foreground))" }}
              >
                WealthWatch
              </p>
              <p
                className="text-[10px]"
                style={{
                  color: "hsl(var(--foreground-tertiary))",
                  fontFamily: "Geist Mono",
                }}
              >
                v2.0 · Dashboard
              </p>
            </div>
          </div>
          {/* Mobile close button inside sidebar */}
          {!isLargeScreen && (
            <button
              onClick={closeSidebar}
              className="p-1 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Close menu"
              style={{ color: "hsl(var(--foreground-tertiary))" }}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="label-xs px-3 mb-3">Navigation</p>
          {NAV.map(({ href, icon: Icon, label }) => {
            // Active: exact match for overview, prefix match for sub-pages
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === href || pathname.startsWith(href + "/");

            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={!isLargeScreen ? closeSidebar : undefined}
              >
                <Icon className="nav-icon w-4 h-4 shrink-0" />
                <span>{label}</span>
                {active && (
                  <ChevronRight
                    className="w-3 h-3 ml-auto shrink-0"
                    style={{ color: "hsl(var(--info))" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom status */}
        <div
          className="px-4 py-4 shrink-0"
          style={{ borderTop: "1px solid hsl(var(--border-token))" }}
        >
          <div
            className="rounded-lg p-3 flex items-center gap-2.5"
            style={{
              background: "hsl(var(--surface-raised))",
              border: "1px solid hsl(var(--border-token))",
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-live-pulse shrink-0"
              style={{ background: "hsl(var(--positive))" }}
            />
            <div>
              <p
                className="text-xs font-medium"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Markets Open
              </p>
              <p
                className="text-[10px]"
                style={{
                  color: "hsl(var(--foreground-tertiary))",
                  fontFamily: "Geist Mono",
                }}
              >
                NSE · BSE · Live
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}