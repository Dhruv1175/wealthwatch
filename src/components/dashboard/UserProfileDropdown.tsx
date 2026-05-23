"use client";

import { useState, useRef, useEffect } from "react";

import Link from "next/link";
import {
  ChevronDown, User, CreditCard, LogOut,
  ShieldCheck, ShieldOff, Check, Edit3, Upload, X,
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
  stats: {
    totalTransactions: number;
    totalInvestments:  number;
  };
  signOutAction: () => Promise<void>;
}

const BASIC_INVESTMENT_LIMIT  = 5;
const BASIC_TRANSACTION_LIMIT = 50;

export default function UserProfileDropdown({
  sessionUser,
  stats,
  signOutAction,
}: UserProfileDropdownProps) {
  const { triggerToast } = useNotifications();
  const [open, setOpen]               = useState(false);
  const [showEdit, setShowEdit]       = useState(false);
  const [currentName, setCurrentName] = useState(sessionUser.name ?? "WealthUser");
  const [currentImage, setCurrentImage] = useState(sessionUser.image ?? "");
  const [isSaving, setIsSaving]       = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (showEdit && !(window as any).cloudinary) {
      const s = document.createElement("script");
      s.src   = "https://upload-widget.cloudinary.com/global/all.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, [showEdit]);

  function handleUploadWidget() {
    if (!(window as any).cloudinary) {
      triggerToast("Widget Fault", "Cloudinary CDN unreachable.", "WARNING");
      return;
    }
    (window as any).cloudinary
      .createUploadWidget(
        {
          cloudName:    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
          uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "",
          sources:      ["local", "url", "camera"],
          multiple:     false,
          theme:        "minimal",
        },
        (_error: any, result: any) => {
          if (!_error && result?.event === "success") {
            setCurrentImage(result.info.secure_url);
            triggerToast("Media Uploaded", "Image staged — commit to save.", "INFO");
          }
        }
      )
      .open();
  }

  async function handleSaveChanges(e: React.FormEvent) {
    e.preventDefault();
    if (!currentName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: currentName.trim(), image: currentImage }),
      });
      if (res.ok) {
        triggerToast("Profile Updated", "Changes committed successfully.", "SUCCESS");
        setShowEdit(false);
        setOpen(false);
      } else {
        triggerToast("Mutation Error", "Database rejected update parameters.", "WARNING");
      }
    } catch {
      triggerToast("Connection Fault", "Failed to commit profile changes.", "WARNING");
    } finally {
      setIsSaving(false);
    }
  }

  const initials = currentName.trim().slice(0, 2).toUpperCase() || "WW";
  const investPct = Math.min((stats.totalInvestments  / BASIC_INVESTMENT_LIMIT)  * 100, 100);
  const txPct     = Math.min((stats.totalTransactions / BASIC_TRANSACTION_LIMIT) * 100, 100);

  return (
    <div ref={ref} className="relative font-mono text-xs">
      {/* ── TRIGGER ───────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 border border-border bg-surface hover:bg-surface-raised transition-colors px-2.5 py-1.5"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="relative w-6 h-6 shrink-0">
          {currentImage ? (
            <img
              src={currentImage}
              alt={currentName}
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-6 h-6 bg-muted border border-border rounded-full flex items-center justify-center text-[9px] font-bold text-accent">
              {initials}
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-positive rounded-full border-2 border-background" />
        </div>
        <span className="hidden sm:block text-muted-foreground max-w-[110px] truncate leading-none">
          {currentName}
        </span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* ── DROPDOWN PANEL ────────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-72 bg-card border border-border z-50 shadow-2xl shadow-black/80 animate-slide-down">

          {/* Identity header */}
          <div className="flex items-start gap-3 p-4 border-b border-border bg-background/60">
            <div className="relative w-9 h-9 shrink-0">
              {currentImage ? (
                <img src={currentImage} alt={currentName} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 bg-muted border border-border rounded-full flex items-center justify-center text-xs font-bold text-accent">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate leading-snug">{currentName}</p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{sessionUser.email}</p>
            </div>
            {/* Inline tier badge */}
            <div className="shrink-0 flex items-center gap-1 border border-border bg-muted px-1.5 py-0.5 self-start">
              <ShieldOff className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">Basic</span>
            </div>
          </div>

          {/* Usage mini-meters */}
          <div className="px-4 py-3 border-b border-border space-y-2.5 bg-background/40">
            <p className="data-label mb-2">Resource utilization</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[10px] text-muted-foreground">Transactions</span>
                <span className={`text-[10px] font-bold tabular-nums ${txPct >= 100 ? "text-negative" : txPct >= 80 ? "text-warning" : "text-foreground/70"}`}>
                  {stats.totalTransactions} / {BASIC_TRANSACTION_LIMIT}
                </span>
              </div>
              <div className="h-0.5 bg-muted overflow-hidden">
                <div className={`h-full ${txPct >= 100 ? "bg-negative" : txPct >= 80 ? "bg-warning" : "bg-accent"}`} style={{ width: `${txPct}%` }} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[10px] text-muted-foreground">Investments</span>
                <span className={`text-[10px] font-bold tabular-nums ${investPct >= 100 ? "text-negative" : investPct >= 80 ? "text-warning" : "text-foreground/70"}`}>
                  {stats.totalInvestments} / {BASIC_INVESTMENT_LIMIT}
                </span>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: BASIC_INVESTMENT_LIMIT }).map((_, i) => (
                  <div key={i} className={`flex-1 h-0.5 rounded-full ${i < stats.totalInvestments ? investPct >= 100 ? "bg-negative" : "bg-accent" : "bg-muted"}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Nav links */}
          <div className="py-1 border-b border-border">
            <button
              onClick={() => { setShowEdit(true); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface transition-colors group text-left"
            >
              <User className="w-3.5 h-3.5 text-accent group-hover:text-accent shrink-0" />
              <div>
                <span className="block font-medium">Profile Overview &amp; Stats</span>
                <span className="text-[9px] text-muted-foreground/60">Account details, usage metrics</span>
              </div>
            </button>
            <Link
              href="/dashboard/billing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface transition-colors group"
            >
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
              <div>
                <span className="block font-medium">Billing Configuration</span>
                <span className="text-[9px] text-muted-foreground/60">Subscription ledger, limits</span>
              </div>
            </Link>
          </div>

          {/* Upgrade CTA */}
          <div className="px-4 py-3 border-b border-border">
            <RazorpayUpgradeButton
              sessionUser={{ id: sessionUser.id, name: currentName, email: sessionUser.email, image: currentImage }}
              buttonText="Upgrade to Pro Tier (₹1,299)"
              className="w-full flex items-center justify-center gap-2 border border-premium/40 bg-premium/8 hover:bg-premium/15 text-premium text-[11px] font-bold uppercase tracking-widest py-2 px-3 transition-colors"
            />
          </div>

          {/* Sign out */}
          <div className="py-1">
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-muted-foreground hover:text-negative hover:bg-negative/5 transition-colors group"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0 group-hover:text-negative" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ────────────────────────────────────────────────────────── */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEdit(false); }}
        >
          <div className="w-full max-w-md bg-card border border-border shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">
                Profile Matrix Control
              </h3>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-2 gap-px border-b border-border">
              {[
                { label: "Positions Tracked", value: stats.totalInvestments,  color: "text-accent"    },
                { label: "Feed Records",       value: stats.totalTransactions, color: "text-positive"  },
              ].map((s) => (
                <div key={s.label} className="bg-surface px-5 py-4">
                  <p className="data-label mb-1">{s.label}</p>
                  <p className={`text-2xl font-black font-mono tabular-nums ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSaveChanges} className="p-5 space-y-4">
              <div>
                <label className="data-label block mb-1.5">Display Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentName}
                    onChange={(e) => setCurrentName(e.target.value)}
                    maxLength={24}
                    className="field pr-8"
                  />
                  <Edit3 className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="data-label block mb-1.5">Profile Photo</label>
                <div className="flex items-center gap-4 bg-background border border-input px-4 py-3">
                  <div className="relative w-10 h-10 shrink-0">
                    {currentImage ? (
                      <img src={currentImage} alt="Preview" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 bg-muted border border-border rounded-full flex items-center justify-center text-sm font-bold text-accent">
                        {initials}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleUploadWidget}
                    className="flex items-center gap-1.5 border border-border text-[10px] font-bold uppercase tracking-wide px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                  >
                    <Upload className="w-3 h-3" /> Upload Image
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="px-4 py-2 border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary w-auto px-5 py-2 text-xs flex items-center gap-2"
                >
                  {isSaving ? (
                    <span className="animate-pulse">Saving…</span>
                  ) : (
                    <><Check className="w-3.5 h-3.5" /> Commit Changes</>
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