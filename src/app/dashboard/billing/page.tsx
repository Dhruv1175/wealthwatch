import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldOff,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  Lock,
  ReceiptText,
  BarChart3,
  FileText,
  Bell,
  Download,
  Activity,
} from "lucide-react";
import RazorpayUpgradeButton from "@/components/dashboard/RazorpayUpgradeButton";

const BASIC_LIMITS = { investments: 5, transactions: 50, pdfParses: 3 };

const FEATURES: {
  label: string;
  icon: React.ElementType;
  basic: boolean | string;
  pro: boolean | string;
}[] = [
  { label: "Investment positions",        icon: BarChart3,   basic: "5 max",     pro: "Unlimited" },
  { label: "Transaction records",         icon: ReceiptText, basic: "50 max",    pro: "Unlimited" },
  { label: "AI PDF statement parsing",    icon: FileText,    basic: "3 / month", pro: "Unlimited" },
  { label: "Real-time price feeds",       icon: Activity,    basic: true,        pro: true        },
  { label: "Portfolio news intelligence", icon: Activity,    basic: true,        pro: true        },
  { label: "SIP reminder engine",         icon: Bell,        basic: false,       pro: true        },
  { label: "Tax-loss harvesting signals", icon: Zap,         basic: false,       pro: true        },
  { label: "CSV / PDF export",           icon: Download,    basic: false,       pro: true        },
  { label: "Security audit log",          icon: ShieldCheck, basic: false,       pro: true        },
];

function MeterBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min((used / max) * 100, 100);
  const isCritical = pct >= 100;
  const isWarning  = pct >= 80 && !isCritical;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-mono font-bold tabular-nums ${isCritical ? "text-negative" : isWarning ? "text-warning" : "text-foreground/70"}`}>
            {used} / {max}
          </span>
          {isCritical && (
            <span className="text-[9px] font-mono uppercase bg-negative/10 border border-negative/30 text-negative px-1.5 py-0.5">Limit</span>
          )}
        </div>
      </div>
      <div className="h-1 w-full bg-muted overflow-hidden">
        <div className={`h-full transition-all duration-700 ${isCritical ? "bg-negative" : isWarning ? "bg-warning" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
      {max <= 10 && (
        <div className="flex gap-1">
          {Array.from({ length: max }).map((_, i) => (
            <div key={i} className={`flex-1 h-0.5 rounded-full transition-colors ${i < used ? isCritical ? "bg-negative" : "bg-accent" : "bg-muted"}`} />
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
      tier: true, subscriptionEnd: true, email: true, name: true, image: true,
      _count: { select: { investments: true, transactions: true } },
    },
  });
  if (!user) redirect("/");

  const isPro            = user.tier === "PRO";
  const investmentCount  = user._count.investments;
  const transactionCount = user._count.transactions;

  const subscriptionEndFormatted = user.subscriptionEnd
    ? new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).format(new Date(user.subscriptionEnd))
    : null;

  const daysRemaining = user.subscriptionEnd
    ? Math.max(0, Math.ceil((new Date(user.subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const renewalUrgent = daysRemaining !== null && daysRemaining <= 30 && isPro;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-4 px-6 h-14">
          <Link href="/dashboard" className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />Dashboard
          </Link>
          <span className="text-border select-none">·</span>
          <span className="text-[11px] font-mono text-foreground/60 uppercase tracking-wider">Billing &amp; Subscription</span>
        </div>
      </header>

      <main className="px-6 py-10 max-w-5xl mx-auto space-y-10">
        <div>
          <p className="data-label mb-1">Subscription Ledger</p>
          <h1 className="text-3xl font-black tracking-tight">Account &amp; Access</h1>
          <p className="text-sm text-muted-foreground mt-2 font-mono">{user.email}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`panel p-6 space-y-4 ${isPro ? "border-premium/30" : ""}`}>
            <div className="flex items-center justify-between">
              <p className="data-label">Active Tier</p>
              {isPro ? <ShieldCheck className="w-4 h-4 text-premium" /> : <ShieldOff className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-4xl font-black tracking-tight ${isPro ? "text-premium" : "text-foreground/50"}`}>{isPro ? "PRO" : "BASIC"}</span>
              {isPro ? <span className="badge-pro">Active</span> : <span className="badge-basic">Free</span>}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-mono">
              {isPro ? "Full platform access. All data pool limits removed." : `Limited to ${BASIC_LIMITS.investments} investment positions and ${BASIC_LIMITS.transactions} transactions.`}
            </p>
          </div>

          <div className={`panel p-6 space-y-4 ${renewalUrgent ? "border-warning/30" : ""}`}>
            <div className="flex items-center justify-between">
              <p className="data-label">Access Window</p>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            {isPro && subscriptionEndFormatted ? (
              <>
                <div>
                  <p className="data-label mb-1">Premium access active until</p>
                  <p className="text-2xl font-black font-mono tabular-nums text-foreground">{subscriptionEndFormatted}</p>
                </div>
                {daysRemaining !== null && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="data-label">Days remaining</span>
                      <span className={`text-xs font-mono font-bold ${daysRemaining <= 7 ? "text-negative" : daysRemaining <= 30 ? "text-warning" : "text-positive"}`}>{daysRemaining}d</span>
                    </div>
                    <div className="h-1 bg-muted overflow-hidden">
                      <div className={`h-full ${daysRemaining <= 7 ? "bg-negative" : daysRemaining <= 30 ? "bg-warning" : "bg-positive"}`} style={{ width: `${Math.min((daysRemaining / 365) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}
                {renewalUrgent && (
                  <div className="bg-warning/5 border border-warning/25 px-3 py-2.5">
                    <p className="text-[11px] font-mono text-warning uppercase tracking-wide">⚠ Expires in {daysRemaining} days — renew to maintain access</p>
                  </div>
                )}
              </>
            ) : isPro ? (
              <div>
                <p className="data-label mb-1">Subscription window</p>
                <p className="text-sm font-mono text-positive">Lifetime / no expiry set</p>
              </div>
            ) : (
              <div className="space-y-3 mt-1">
                <p className="data-label">Premium access active until</p>
                <p className="text-sm font-mono text-muted-foreground">— No active subscription —</p>
                <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">Upgrade to Pro to unlock unrestricted data pools.</p>
              </div>
            )}
          </div>
        </div>

        {!isPro && (
          <div className="panel p-6 space-y-6">
            <div className="flex items-center justify-between divider pb-4">
              <div>
                <p className="data-label mb-0.5">Data Pool Usage</p>
                <h2 className="text-sm font-bold text-foreground tracking-tight">Basic Tier Capacity</h2>
              </div>
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <MeterBar label="Investment Positions" used={investmentCount}  max={BASIC_LIMITS.investments}  />
            <MeterBar label="Transaction Records"  used={transactionCount} max={BASIC_LIMITS.transactions} />
          </div>
        )}

        {isPro && (
          <div className="border border-premium/20 bg-premium/5 p-5 flex items-start gap-4">
            <Zap className="w-5 h-5 text-premium shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold font-mono text-premium uppercase tracking-wider">Pro Tier Active — All Limits Removed</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-mono">Unrestricted investment tracking, unlimited transaction records, and all premium features active.</p>
            </div>
          </div>
        )}

        {!isPro && (
          <div className="panel p-8 space-y-6 relative overflow-hidden">
            <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ background: "radial-gradient(ellipse 60% 40% at 80% 50%, hsl(38 92% 50%), transparent)" }} />
            <div className="relative space-y-2">
              <p className="data-label text-premium">Upgrade to Pro</p>
              <h2 className="text-2xl font-black tracking-tight text-foreground">Remove every limit.<br /><span className="text-premium">One annual payment.</span></h2>
              <p className="text-sm text-muted-foreground font-mono leading-relaxed max-w-lg">Unlimited investment tracking, no transaction caps, SIP reminders, tax-loss harvesting, PDF export, and priority support.</p>
            </div>
            <div className="relative max-w-sm">
              <RazorpayUpgradeButton
                sessionUser={{ id: session.user.id!, name: user.name, email: user.email, image: user.image }}
                buttonText="Upgrade to Pro Tier (₹1,299)"
                className="w-full flex items-center justify-center gap-3 bg-premium hover:bg-premium/90 text-background font-black text-sm uppercase tracking-widest py-4 px-6 transition-colors"
              />
              <p className="text-[10px] font-mono text-muted-foreground mt-2 text-center">Annual plan · Powered by Razorpay · Secured</p>
            </div>
          </div>
        )}

        <div className="panel">
          <div className="flex items-center justify-between px-5 py-4 divider">
            <p className="data-label">Feature Entitlements</p>
            <div className="flex gap-8 text-[9px] font-mono uppercase tracking-widest">
              <span className="text-muted-foreground">Basic</span>
              <span className="text-premium">Pro</span>
            </div>
          </div>
          <div className="divide-y divide-border">
            {FEATURES.map(({ label, icon: Icon, basic, pro }) => {
              const locked = !isPro && basic === false;
              return (
                <div key={label} className={`flex items-center justify-between px-5 py-3 transition-colors ${locked ? "opacity-40" : "hover:bg-surface"}`}>
                  <div className="flex items-center gap-3">
                    {locked && <Lock className="w-2.5 h-2.5 text-muted-foreground shrink-0" />}
                    <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-xs font-mono text-muted-foreground">{label}</span>
                  </div>
                  <div className="flex gap-8 items-center">
                    <div className="w-16 flex justify-center">
                      {typeof basic === "boolean" ? (
                        basic ? <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground/30" />
                      ) : (
                        <span className="text-[10px] font-mono text-muted-foreground">{basic}</span>
                      )}
                    </div>
                    <div className="w-16 flex justify-center">
                      {typeof pro === "boolean" ? (
                        pro ? <CheckCircle className="w-3.5 h-3.5 text-premium" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground/30" />
                      ) : (
                        <span className="text-[10px] font-mono text-premium">{pro}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {!isPro && (
            <div className="px-5 py-4 border-t border-border">
              <RazorpayUpgradeButton
                sessionUser={{ id: session.user.id!, name: user.name, email: user.email, image: user.image }}
                buttonText="Upgrade to Pro Tier (₹1,299)"
                className="flex items-center gap-2 text-[11px] font-mono text-premium hover:text-premium/80 transition-colors"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}