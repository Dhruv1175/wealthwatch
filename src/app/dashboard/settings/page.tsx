import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import Sidebar from "@/components/dashboard/Sidebar";
import RazorpayUpgradeButton from "@/components/dashboard/RazorpayUpgradeButton";
import { ShieldCheck, User, Mail, Sparkles, Lock, CreditCard } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      tier: true,
      createdAt: true,
      subscriptionEnd: true,
      _count: {
        select: {
          transactions: true,
          investments: true,
          goals: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/");
  }

  const isPro = user.tier === "PRO";

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 lg:ml-[var(--sidebar-width)] max-w-5xl space-y-8">
        <div>
          <p className="label-xs mb-1">Account & Preferences</p>
          <h1 className="text-2xl font-bold tracking-tight">User Settings</h1>
        </div>

        {/* Profile Card */}
        <section className="card p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <User className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold">Profile Overview</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-sm">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase">Full Name</span>
              <div className="font-semibold text-gray-200">{user.name || "N/A"}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email Address
              </span>
              <div className="font-semibold text-gray-200">{user.email}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase">Member Since</span>
              <div className="font-semibold text-gray-200">
                {new Date(user.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase">Current Tier</span>
              <div>
                {isPro ? (
                  <span className="badge-positive font-bold flex items-center gap-1 w-fit">
                    <Sparkles className="w-3 h-3" /> PRO TIER
                  </span>
                ) : (
                  <span className="badge-warning font-bold flex items-center gap-1 w-fit">
                    BASIC TIER
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Subscription & Tier Limits */}
        <section className="card p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold">Subscription Plan</h2>
            </div>
            {isPro ? (
              <span className="badge-positive font-bold">Active Pro Subscription</span>
            ) : (
              <RazorpayUpgradeButton
                sessionUser={{ id: user.id, name: user.name, email: user.email }}
                className="btn-primary text-xs px-4 py-2"
                buttonText="Upgrade to Pro — ₹1,299/yr"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl border border-white/5 bg-zinc-950">
              <div className="text-gray-400">Transactions</div>
              <div className="text-lg font-bold text-white mt-1">
                {user._count.transactions} / {isPro ? "∞" : 50}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-zinc-950">
              <div className="text-gray-400">Investments Tracked</div>
              <div className="text-lg font-bold text-white mt-1">
                {user._count.investments} / {isPro ? "∞" : 5}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-zinc-950">
              <div className="text-gray-400">Goals Defined</div>
              <div className="text-lg font-bold text-white mt-1">
                {user._count.goals} / {isPro ? "∞" : 3}
              </div>
            </div>
          </div>
        </section>

        {/* Security Info */}
        <section className="card p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <Lock className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold">Security & Encryption</h2>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed font-mono">
            WealthWatch employs AES-256 field encryption for financial metadata, OAuth 2.0 SSL/TLS for session management, and strict Content Security Policies (CSP) to ensure zero data leakage.
          </p>
        </section>
      </main>
    </div>
  );
}
