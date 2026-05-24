"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown, User, CreditCard, LogOut,
  ShieldCheck, ShieldOff, Check, Edit3, Upload, X,
  TrendingUp, Receipt,
} from "lucide-react";
import { useNotifications } from "@/components/dashboard/NotificationContext";
import RazorpayUpgradeButton from "@/components/dashboard/RazorpayUpgradeButton";

interface UserProfileDropdownProps {
  sessionUser: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  stats: { totalTransactions: number; totalInvestments: number };
  signOutAction: () => Promise<void>;
}

const BASIC_INVEST_LIMIT = 5;
const BASIC_TX_LIMIT     = 50;

export default function UserProfileDropdown({
  sessionUser, stats, signOutAction,
}: UserProfileDropdownProps) {
  const { triggerToast } = useNotifications();
  const [open, setOpen]             = useState(false);
  const [showEdit, setShowEdit]     = useState(false);
  const [currentName, setName]      = useState(sessionUser.name ?? "");
  const [currentImage, setImage]    = useState(sessionUser.image ?? "");
  const [isSaving, setSaving]       = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (showEdit && !(window as any).cloudinary) {
      const s = document.createElement("script");
      s.src = "https://upload-widget.cloudinary.com/global/all.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, [showEdit]);

  function openCloudinary() {
    if (!(window as any).cloudinary) {
      triggerToast("Widget Fault", "Cloudinary CDN unreachable.", "WARNING");
      return;
    }
    (window as any).cloudinary.createUploadWidget(
      {
        cloudName:    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "",
        sources: ["local", "url", "camera"],
        multiple: false,
        theme: "minimal",
      },
      (_: any, result: any) => {
        if (!_ && result?.event === "success") {
          setImage(result.info.secure_url);
          triggerToast("Image staged", "Commit to save.", "INFO");
        }
      }
    ).open();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: currentName.trim(), image: currentImage }),
      });
      if (res.ok) {
        triggerToast("Profile Updated", "Changes committed.", "SUCCESS");
        setShowEdit(false);
        setOpen(false);
      } else {
        triggerToast("Update Failed", "Server rejected changes.", "WARNING");
      }
    } catch {
      triggerToast("Network Error", "Could not reach server.", "WARNING");
    } finally {
      setSaving(false);
    }
  }

  const initials   = (currentName || sessionUser.name || "WW").slice(0, 2).toUpperCase();
  const investPct  = Math.min((stats.totalInvestments  / BASIC_INVEST_LIMIT) * 100, 100);
  const txPct      = Math.min((stats.totalTransactions / BASIC_TX_LIMIT)     * 100, 100);

  return (
    <div ref={ref} className="relative">
      {/* ── TRIGGER ──────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all"
        style={{
          background:   "hsl(var(--surface-raised))",
          border:       "1px solid hsl(var(--border))",
          color:        "hsl(var(--foreground))",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border-focus) / 0.4)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border))"; }}
      >
        <div className="relative w-7 h-7 shrink-0">
          {currentImage ? (
            <img src={currentImage} alt={currentName} className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "hsl(var(--info-dim))", color: "hsl(var(--info))" }}
            >
              {initials}
            </div>
          )}
          <span
            className="absolute bottom-0 right-0 w-2 h-2 rounded-full border-2"
            style={{ background: "hsl(var(--positive))", borderColor: "hsl(var(--background))" }}
          />
        </div>
        <span className="hidden sm:block text-sm font-medium max-w-[110px] truncate">
          {currentName || sessionUser.name || "User"}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 shrink-0 transition-transform"
          style={{
            color: "hsl(var(--foreground-tertiary))",
            transform: open ? "rotate(180deg)" : "rotate(0)",
          }}
        />
      </button>

      {/* ── DROPDOWN ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-xl z-50 animate-fade-up overflow-hidden"
          style={{
            background:   "hsl(var(--surface-overlay))",
            border:       "1px solid hsl(var(--border))",
            boxShadow:    "0 20px 60px hsl(220 14% 3% / 0.6)",
          }}
        >
          {/* Identity */}
          <div
            className="flex items-center gap-3 px-4 py-4"
            style={{ borderBottom: "1px solid hsl(var(--border))" }}
          >
            <div className="relative shrink-0">
              {currentImage ? (
                <img src={currentImage} alt={currentName} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ background: "hsl(var(--info-dim))", color: "hsl(var(--info))" }}
                >
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>
                {currentName || sessionUser.name}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}>
                {sessionUser.email}
              </p>
            </div>
            {/* Tier pill */}
            <span className="badge-muted shrink-0">Basic</span>
          </div>

          {/* Usage meters */}
          <div className="px-4 py-3.5" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
            <p className="label-xs mb-3">Usage</p>
            <div className="space-y-3">
              {[
                { label: "Investments", used: stats.totalInvestments, max: BASIC_INVEST_LIMIT, pct: investPct, icon: TrendingUp },
                { label: "Transactions", used: stats.totalTransactions, max: BASIC_TX_LIMIT, pct: txPct, icon: Receipt },
              ].map(({ label, used, max, pct, icon: Icon }) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3 h-3" style={{ color: "hsl(var(--foreground-tertiary))" }} />
                      <span className="text-xs" style={{ color: "hsl(var(--foreground-secondary))" }}>{label}</span>
                    </div>
                    <span
                      className="text-xs font-bold tabular"
                      style={{
                        color: pct >= 100 ? "hsl(var(--negative))" : pct >= 80 ? "hsl(var(--warning))" : "hsl(var(--foreground-secondary))",
                        fontFamily: "Geist Mono",
                      }}
                    >
                      {used}/{max}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 100
                          ? "hsl(var(--negative))"
                          : pct >= 80
                          ? "hsl(var(--warning))"
                          : "hsl(var(--info))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nav links */}
          <div className="p-2" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
            <button
              onClick={() => { setShowEdit(true); setOpen(false); }}
              className="nav-item w-full text-left"
            >
              <User className="nav-icon w-4 h-4 shrink-0" />
              Profile Overview &amp; Stats
            </button>
            <Link href="/dashboard/billing" onClick={() => setOpen(false)} className="nav-item">
              <CreditCard className="nav-icon w-4 h-4 shrink-0" />
              Billing &amp; Subscription
            </Link>
          </div>

          {/* Upgrade CTA */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
            <RazorpayUpgradeButton
              sessionUser={{ id: sessionUser.id, name: currentName, email: sessionUser.email, image: currentImage }}
              buttonText="Upgrade to Pro (₹1,299)"
              className="btn-premium w-full justify-center text-xs"
            />
          </div>

          {/* Sign out */}
          <div className="p-2">
            <form action={signOutAction}>
              <button
                type="submit"
                className="nav-item w-full text-left"
                style={{ color: "hsl(var(--negative) / 0.8)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "hsl(var(--negative))";
                  (e.currentTarget as HTMLElement).style.background = "hsl(var(--negative-dim))";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "hsl(var(--negative) / 0.8)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ───────────────────────────────────────────────────── */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "hsl(220 14% 3% / 0.8)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEdit(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl animate-scale-in"
            style={{
              background:  "hsl(var(--surface-overlay))",
              border:      "1px solid hsl(var(--border))",
              boxShadow:   "0 24px 80px hsl(220 14% 3% / 0.7)",
            }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: "1px solid hsl(var(--border))" }}
            >
              <div>
                <p className="text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>Edit Profile</p>
                <p className="label-xs mt-0.5">Update your display name and avatar</p>
              </div>
              <button
                onClick={() => setShowEdit(false)}
                className="btn-icon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stats bar */}
            <div
              className="grid grid-cols-2"
              style={{ borderBottom: "1px solid hsl(var(--border))" }}
            >
              {[
                { label: "Positions Tracked", val: stats.totalInvestments,  color: "hsl(var(--info))" },
                { label: "Feed Records",       val: stats.totalTransactions, color: "hsl(var(--positive))" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="px-6 py-4"
                  style={{ borderRight: s.label === "Positions Tracked" ? "1px solid hsl(var(--border))" : "none" }}
                >
                  <p className="label-xs mb-1">{s.label}</p>
                  <p className="text-2xl font-bold tabular" style={{ color: s.color, fontFamily: "Geist" }}>
                    {s.val}
                  </p>
                </div>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="label-xs block mb-2">Display Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentName}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={28}
                    className="field pr-9"
                    placeholder="Your name"
                  />
                  <Edit3 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "hsl(var(--foreground-tertiary))" }} />
                </div>
              </div>

              <div>
                <label className="label-xs block mb-2">Profile Photo</label>
                <div
                  className="flex items-center gap-4 rounded-xl p-3"
                  style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))" }}
                >
                  {currentImage ? (
                    <img src={currentImage} alt="Preview" className="w-12 h-12 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                      style={{ background: "hsl(var(--info-dim))", color: "hsl(var(--info))" }}
                    >
                      {initials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={openCloudinary}
                    className="btn-ghost text-xs gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload New Photo
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="btn-ghost flex-1 justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary flex-1 justify-center gap-2"
                >
                  {isSaving ? (
                    <span className="animate-pulse">Saving…</span>
                  ) : (
                    <><Check className="w-3.5 h-3.5" /> Save Changes</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}