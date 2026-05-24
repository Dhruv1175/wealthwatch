import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import Link from "next/link";
import {
  ArrowLeft, ShieldCheck, ShieldOff, Clock, Zap,
  CheckCircle, XCircle, Lock,
} from "lucide-react";
import RazorpayUpgradeButton from "@/components/dashboard/RazorpayUpgradeButton";
import Sidebar from "@/components/dashboard/Sidebar";

const LIMITS = { investments: 5, transactions: 50 };

const FEATURES: { label: string; basic: boolean | string; pro: boolean | string }[] = [
  { label: "Investment positions",        basic: "5 max",     pro: "Unlimited" },
  { label: "Transaction records",         basic: "50 max",    pro: "Unlimited" },
  { label: "AI PDF statement parsing",    basic: "3 / month", pro: "Unlimited" },
  { label: "Real-time price feeds",       basic: true,        pro: true        },
  { label: "Portfolio news intelligence", basic: true,        pro: true        },
  { label: "SIP reminder engine",         basic: false,       pro: true        },
  { label: "Tax-loss harvesting signals", basic: false,       pro: true        },
  { label: "CSV / PDF export",           basic: false,       pro: true        },
  { label: "Security audit log",          basic: false,       pro: true        },
];

// Pure server-renderable progress bar — no event handlers
function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct   = Math.min((used / max) * 100, 100);
  const color =
    pct >= 100 ? "hsl(var(--negative))"
    : pct >= 80 ? "hsl(var(--warning))"
    : "hsl(var(--info))";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label-xs">{label}</span>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold tabular"
            style={{ color, fontFamily: "Geist Mono" }}
          >
            {used} / {max}
          </span>
          {pct >= 100 && <span className="badge-negative">Full</span>}
        </div>
      </div>
      <div className="progress-track" style={{ height: "6px" }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {max <= 10 && (
        <div className="flex gap-1">
          {Array.from({ length: max }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full"
              style={{ background: i < used ? color : "hsl(var(--muted))" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      tier: true, subscriptionEnd: true,
      email: true, name: true, image: true,
      _count: { select: { investments: true, transactions: true } },
    },
  });
  if (!user) redirect("/");

  const isPro    = user.tier === "PRO";
  const invCount = user._count.investments;
  const txCount  = user._count.transactions;

  const expiry = user.subscriptionEnd
    ? new Intl.DateTimeFormat("en-US", {
        month: "2-digit", day: "2-digit", year: "numeric",
      }).format(new Date(user.subscriptionEnd))
    : null;

  const daysLeft = user.subscriptionEnd
    ? Math.max(
        0,
        Math.ceil(
          (new Date(user.subscriptionEnd).getTime() - Date.now()) / 86_400_000
        )
      )
    : null;

  const renewalUrgent = isPro && daysLeft !== null && daysLeft <= 30;

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-content">
        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex items-center gap-4 px-8 h-16"
          style={{
            background:   "hsl(220 14% 6% / 0.9)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid hsl(var(--border-token))",
          }}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm transition-colors text-secondary hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span style={{ color: "hsl(var(--border-token))" }}>·</span>
          <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            Billing &amp; Subscription
          </span>
        </header>

        <main className="flex-1 px-8 py-10 max-w-4xl mx-auto w-full space-y-8">
          {/* Page heading */}
          <div>
            <p className="label-xs mb-1">Account Management</p>
            <h1
              className="text-3xl font-black tracking-tight"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Subscription Ledger
            </h1>
            <p
              className="text-sm mt-1.5"
              style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}
            >
              {user.email}
            </p>
          </div>

          {/* ── TIER + WINDOW ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Tier card */}
            <div
              className="rounded-2xl p-6 space-y-4 relative overflow-hidden"
              style={{
                background: isPro
                  ? "linear-gradient(135deg, hsl(40 95% 10%), hsl(40 60% 7%))"
                  : "hsl(var(--surface))",
                border: `1px solid ${isPro ? "hsl(var(--premium) / 0.35)" : "hsl(var(--border-token))"}`,
              }}
            >
              {isPro && (
                <div
                  className="absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl pointer-events-none"
                  style={{ background: "hsl(var(--premium) / 0.1)" }}
                />
              )}
              <div className="flex items-center justify-between relative">
                <p className="label-xs">Active Tier</p>
                {isPro
                  ? <ShieldCheck className="w-5 h-5" style={{ color: "hsl(var(--premium))" }} />
                  : <ShieldOff   className="w-5 h-5" style={{ color: "hsl(var(--foreground-tertiary))" }} />
                }
              </div>
              <div className="flex items-center gap-3 relative">
                <p
                  className="text-5xl font-black tracking-tight"
                  style={{ color: isPro ? "hsl(var(--premium))" : "hsl(var(--foreground-secondary))" }}
                >
                  {isPro ? "PRO" : "BASIC"}
                </p>
                {isPro
                  ? <span className="badge-premium">Active</span>
                  : <span className="badge-muted">Free</span>
                }
              </div>
              <p
                className="text-xs leading-relaxed relative"
                style={{ color: "hsl(var(--foreground-secondary))" }}
              >
                {isPro
                  ? "Full platform access — all data pool limits removed."
                  : `Limited to ${LIMITS.investments} investment positions and ${LIMITS.transactions} transactions.`}
              </p>
            </div>

            {/* Subscription window */}
            <div
              className="rounded-2xl p-6 space-y-4"
              style={{
                background: "hsl(var(--surface))",
                border: `1px solid ${renewalUrgent ? "hsl(var(--warning) / 0.3)" : "hsl(var(--border-token))"}`,
              }}
            >
              <div className="flex items-center justify-between">
                <p className="label-xs">Access Window</p>
                <Clock className="w-4 h-4" style={{ color: "hsl(var(--foreground-tertiary))" }} />
              </div>

              {isPro && expiry ? (
                <>
                  <div>
                    <p className="label-xs mb-1">Premium access active until</p>
                    <p
                      className="text-2xl font-black tabular"
                      style={{ color: "hsl(var(--foreground))", fontFamily: "Geist" }}
                    >
                      {expiry}
                    </p>
                  </div>
                  {daysLeft !== null && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="label-xs">Days remaining</span>
                        <span
                          className="text-xs font-bold tabular"
                          style={{
                            color:
                              daysLeft <= 7  ? "hsl(var(--negative))" :
                              daysLeft <= 30 ? "hsl(var(--warning))"  :
                              "hsl(var(--positive))",
                            fontFamily: "Geist Mono",
                          }}
                        >
                          {daysLeft}d
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min((daysLeft / 365) * 100, 100)}%`,
                            background:
                              daysLeft <= 7  ? "hsl(var(--negative))" :
                              daysLeft <= 30 ? "hsl(var(--warning))"  :
                              "hsl(var(--positive))",
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {renewalUrgent && (
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: "hsl(var(--warning-dim))",
                        border:     "1px solid hsl(var(--warning) / 0.25)",
                      }}
                    >
                      <p className="text-xs font-semibold" style={{ color: "hsl(var(--warning))" }}>
                        ⚠ Expires in {daysLeft} days — renew to maintain Pro access
                      </p>
                    </div>
                  )}
                </>
              ) : isPro ? (
                <p className="text-sm font-semibold" style={{ color: "hsl(var(--positive))" }}>
                  Lifetime / no expiry set
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="label-xs">Premium access active until</p>
                  <p
                    className="text-sm"
                    style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}
                  >
                    — No active subscription —
                  </p>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "hsl(var(--foreground-tertiary))" }}
                  >
                    Upgrade to Pro to unlock unrestricted access and activate your billing cycle.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── USAGE METERS (BASIC ONLY) ─────────────────────────────────── */}
          {!isPro && (
            <div
              className="rounded-2xl p-6 space-y-6"
              style={{
                background: "hsl(var(--surface))",
                border:     "1px solid hsl(var(--border-token))",
              }}
            >
              <div
                className="flex items-center justify-between pb-4"
                style={{ borderBottom: "1px solid hsl(var(--border-token))" }}
              >
                <div>
                  <p className="label-xs mb-0.5">Resource Usage</p>
                  <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                    Basic Tier Capacity
                  </p>
                </div>
                <Lock className="w-4 h-4" style={{ color: "hsl(var(--foreground-tertiary))" }} />
              </div>
              <Meter label="Investment Positions" used={invCount} max={LIMITS.investments} />
              <Meter label="Transaction Records"  used={txCount}  max={LIMITS.transactions} />
            </div>
          )}

          {/* ── PRO CONFIRMATION ──────────────────────────────────────────── */}
          {isPro && (
            <div
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{
                background: "hsl(var(--premium-dim))",
                border:     "1px solid hsl(var(--premium) / 0.25)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "hsl(var(--premium) / 0.15)",
                  border:     "1px solid hsl(var(--premium) / 0.3)",
                }}
              >
                <Zap className="w-5 h-5" style={{ color: "hsl(var(--premium))" }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "hsl(var(--premium))" }}>
                  Pro Tier Active — All Limits Removed
                </p>
                <p
                  className="text-xs mt-1 leading-relaxed"
                  style={{ color: "hsl(var(--foreground-secondary))" }}
                >
                  Unrestricted investment tracking, unlimited transactions, and all premium features active.
                </p>
              </div>
            </div>
          )}

          {/* ── UPGRADE HERO (BASIC ONLY) ─────────────────────────────────── */}
          {!isPro && (
            <div
              className="rounded-2xl p-8 space-y-6 relative overflow-hidden"
              style={{
                background: "hsl(var(--surface))",
                border:     "1px solid hsl(var(--premium) / 0.2)",
              }}
            >
              <div
                className="absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl pointer-events-none"
                style={{ background: "hsl(var(--premium) / 0.06)" }}
              />
              <div className="relative space-y-2">
                <span className="badge-premium">Upgrade Available</span>
                <h2
                  className="text-2xl font-black tracking-tight"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  Remove every limit.
                  <br />
                  <span style={{ color: "hsl(var(--premium))" }}>One annual payment.</span>
                </h2>
                <p
                  className="text-sm leading-relaxed max-w-lg"
                  style={{ color: "hsl(var(--foreground-secondary))" }}
                >
                  Unlimited positions, no caps, SIP reminders, tax-loss harvesting, export, and priority support.
                </p>
              </div>
              <div className="relative">
                <RazorpayUpgradeButton
                  sessionUser={{
                    id:    session.user.id!,
                    name:  user.name,
                    email: user.email,
                    image: user.image,
                  }}
                  buttonText="Upgrade to Pro Tier (₹1,299)"
                  className="btn-premium text-sm px-8 py-4"
                />
                <p
                  className="text-xs mt-2"
                  style={{ color: "hsl(var(--foreground-tertiary))" }}
                >
                  Annual plan · Powered by Razorpay · Secured
                </p>
              </div>
            </div>
          )}

          {/* ── FEATURE MATRIX ────────────────────────────────────────────── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "hsl(var(--surface))",
              border:     "1px solid hsl(var(--border-token))",
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid hsl(var(--border-token))" }}
            >
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                Feature Entitlements
              </p>
              <div className="flex gap-10 text-xs font-bold" style={{ fontFamily: "Geist Mono" }}>
                <span style={{ color: "hsl(var(--foreground-tertiary))" }}>Basic</span>
                <span style={{ color: "hsl(var(--premium))" }}>Pro</span>
              </div>
            </div>

            {FEATURES.map(({ label, basic, pro }, i) => {
              const locked = !isPro && basic === false;
              return (
                <div
                  key={label}
                  className="flex items-center justify-between px-6 py-3.5 transition-colors billing-row-hover"
                  style={{
                    borderBottom:
                      i < FEATURES.length - 1
                        ? "1px solid hsl(var(--border-token))"
                        : "none",
                    opacity: locked ? 0.45 : 1,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {locked && (
                      <Lock
                        className="w-3 h-3"
                        style={{ color: "hsl(var(--foreground-tertiary))" }}
                      />
                    )}
                    <span
                      className="text-sm"
                      style={{ color: "hsl(var(--foreground-secondary))" }}
                    >
                      {label}
                    </span>
                  </div>
                  <div className="flex gap-10 items-center">
                    <div className="w-16 flex justify-center">
                      {typeof basic === "boolean" ? (
                        basic ? (
                          <CheckCircle className="w-4 h-4" style={{ color: "hsl(var(--foreground-secondary))" }} />
                        ) : (
                          <XCircle className="w-4 h-4" style={{ color: "hsl(var(--border-token))" }} />
                        )
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}
                        >
                          {basic}
                        </span>
                      )}
                    </div>
                    <div className="w-16 flex justify-center">
                      {typeof pro === "boolean" ? (
                        pro ? (
                          <CheckCircle className="w-4 h-4" style={{ color: "hsl(var(--premium))" }} />
                        ) : (
                          <XCircle className="w-4 h-4" style={{ color: "hsl(var(--border-token))" }} />
                        )
                      ) : (
                        <span
                          className="text-xs font-semibold"
                          style={{ color: "hsl(var(--premium))", fontFamily: "Geist Mono" }}
                        >
                          {pro}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {!isPro && (
              <div
                className="px-6 py-4"
                style={{ borderTop: "1px solid hsl(var(--border-token))" }}
              >
                <RazorpayUpgradeButton
                  sessionUser={{
                    id:    session.user.id!,
                    name:  user.name,
                    email: user.email,
                    image: user.image,
                  }}
                  buttonText="Upgrade to Pro Tier (₹1,299)"
                  className="text-sm font-semibold flex items-center gap-2 transition-colors text-premium hover:opacity-80"
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}