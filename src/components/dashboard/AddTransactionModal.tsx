"use client";

import { useState } from "react";
import {
  X, Plus, Loader2, CheckCircle, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Tag, Calendar,
  FileText, Sparkles, ShieldAlert,
} from "lucide-react";
import { useNotifications } from "@/components/dashboard/NotificationContext";
import { useRouter } from "next/navigation";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FormState = {
  description: string;
  amount:      string;
  type:        "credit" | "debit";
  category:    string;
  date:        string;
};

const CATEGORIES = [
  "SALARY", "INCOME", "INVESTMENT", "TRANSFER",
  "FOOD", "HOUSING", "UTILITIES", "TRANSPORT",
  "HEALTHCARE", "ENTERTAINMENT", "SHOPPING", "EDUCATION",
  "INSURANCE", "SUBSCRIPTION", "OTHER",
];

const EMPTY_FORM: FormState = {
  description: "",
  amount:      "",
  type:        "debit",
  category:    "",
  date:        new Date().toISOString().split("T")[0],
};

type Status =
  | { state: "idle" }
  | { state: "categorizing" }
  | { state: "submitting" }
  | { state: "success"; count: number }
  | { state: "error"; message: string };

export default function AddTransactionModal({ isOpen, onClose }: AddTransactionModalProps) {
  const [form, setForm]     = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const { triggerToast }    = useNotifications();
  const router              = useRouter();

  if (!isOpen) return null;

  // ── AI auto-categorize based on description ────────────────────────────────
  async function handleAutoCategory() {
    if (!form.description.trim()) return;
    setStatus({ state: "categorizing" });
    try {
      const res  = await fetch("/api/transactions/categorize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ description: form.description }),
      });
      if (res.ok) {
        const { category } = await res.json();
        setForm((f) => ({ ...f, category }));
        triggerToast("Category Suggested", `AI categorized as: ${category}`, "INFO");
      }
    } catch {
      triggerToast("AI Unavailable", "Could not fetch category suggestion.", "WARNING");
    } finally {
      setStatus({ state: "idle" });
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim() || !form.amount || !form.date) return;

    const rawAmount  = parseFloat(form.amount);
    const finalAmount = form.type === "debit" ? -Math.abs(rawAmount) : Math.abs(rawAmount);

    setStatus({ state: "submitting" });
    try {
      const res = await fetch("/api/transactions/manual", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          description: form.description.trim(),
          amount:      finalAmount,
          category:    form.category || "OTHER",
          date:        form.date,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.upgradeRequired) {
          setStatus({
            state:   "error",
            message: `Transaction limit reached (${data.limit} max on Basic tier). Upgrade to Pro to add unlimited records.`,
          });
          return;
        }
        setStatus({ state: "error", message: data.error || "Failed to save transaction." });
        return;
      }

      setStatus({ state: "success", count: 1 });
      triggerToast(
        "Transaction Added",
        `₹${Math.abs(finalAmount).toFixed(2)} — ${form.description} committed to ledger.`,
        "SUCCESS"
      );
      router.refresh();

      // Auto-close after 1.5s on success
      setTimeout(() => {
        setForm(EMPTY_FORM);
        setStatus({ state: "idle" });
        onClose();
      }, 1500);
    } catch {
      setStatus({ state: "error", message: "Network error — check connection." });
    }
  }

  const busy = status.state === "submitting" || status.state === "categorizing";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "hsl(220 14% 3% / 0.85)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-tx-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden animate-scale-in"
        style={{
          background: "hsl(var(--surface-overlay))",
          border:     "1px solid hsl(var(--border-token))",
          boxShadow:  "0 32px 80px hsl(220 14% 3% / 0.8)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid hsl(var(--border-token))" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "hsl(var(--info-dim))",
                border:     "1px solid hsl(var(--info) / 0.3)",
              }}
            >
              <Plus className="w-4 h-4" style={{ color: "hsl(var(--info))" }} />
            </div>
            <div>
              <p
                id="add-tx-title"
                className="text-sm font-bold"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Add Transaction
              </p>
              <p className="label-xs mt-0.5">Manual ledger entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            disabled={busy}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success state */}
        {status.state === "success" && (
          <div
            className="mx-6 mt-5 rounded-xl p-4 flex items-center gap-3"
            style={{
              background: "hsl(var(--positive-dim))",
              border:     "1px solid hsl(var(--positive) / 0.3)",
            }}
          >
            <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--positive))" }} />
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              Transaction committed to ledger
            </p>
          </div>
        )}

        {/* Error state */}
        {status.state === "error" && (
          <div
            className="mx-6 mt-5 rounded-xl p-4 flex items-start gap-3"
            style={{
              background: "hsl(var(--negative-dim))",
              border:     "1px solid hsl(var(--negative) / 0.3)",
            }}
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "hsl(var(--negative))" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                Could not save transaction
              </p>
              <p
                className="text-xs mt-0.5 leading-relaxed"
                style={{ color: "hsl(var(--foreground-secondary))" }}
              >
                {status.message}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Credit / Debit toggle */}
          <div>
            <label className="label-xs block mb-2">Transaction Type</label>
            <div
              className="grid grid-cols-2 rounded-xl p-1 gap-1"
              style={{
                background: "hsl(var(--surface-raised))",
                border:     "1px solid hsl(var(--border-token))",
              }}
            >
              {(["debit", "credit"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: form.type === t
                      ? t === "credit"
                        ? "hsl(var(--positive-dim))"
                        : "hsl(var(--negative-dim))"
                      : "transparent",
                    color: form.type === t
                      ? t === "credit"
                        ? "hsl(var(--positive))"
                        : "hsl(var(--negative))"
                      : "hsl(var(--foreground-tertiary))",
                    border: form.type === t
                      ? `1px solid hsl(var(--${t === "credit" ? "positive" : "negative"}) / 0.3)`
                      : "1px solid transparent",
                  }}
                >
                  {t === "credit"
                    ? <ArrowUpRight   className="w-3.5 h-3.5" />
                    : <ArrowDownRight className="w-3.5 h-3.5" />
                  }
                  {t === "credit" ? "Credit / Income" : "Debit / Expense"}
                </button>
              ))}
            </div>
          </div>

          {/* Description + AI categorize */}
          <div>
            <label className="label-xs block mb-2">Description</label>
            <div className="relative">
              <div
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "hsl(var(--foreground-tertiary))" }}
              >
                <FileText className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                required
                placeholder="e.g. Grocery shopping at DMart"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="field pl-9 pr-24"
                disabled={busy}
              />
              <button
                type="button"
                onClick={handleAutoCategory}
                disabled={busy || !form.description.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{
                  background: "hsl(var(--info-dim))",
                  border:     "1px solid hsl(var(--info) / 0.3)",
                  color:      "hsl(var(--info))",
                }}
                title="Auto-categorize with AI"
              >
                {status.state === "categorizing"
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Sparkles className="w-3 h-3" />
                }
                AI
              </button>
            </div>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs block mb-2">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="field font-mono"
                disabled={busy}
              />
            </div>
            <div>
              <label className="label-xs block mb-2">Date</label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                  style={{ color: "hsl(var(--foreground-tertiary))" }}
                />
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="field pl-9"
                  disabled={busy}
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="label-xs block mb-2">
              Category
              <span
                className="ml-1.5 text-[10px] normal-case"
                style={{ color: "hsl(var(--foreground-tertiary))" }}
              >
                (or use AI button above to auto-detect)
              </span>
            </label>
            <div className="relative">
              <Tag
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: "hsl(var(--foreground-tertiary))" }}
              />
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="field pl-9"
                disabled={busy}
              >
                <option value="">Select a category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          {form.description && form.amount && (
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{
                background: "hsl(var(--surface-raised))",
                border:     "1px solid hsl(var(--border-token))",
              }}
            >
              <div>
                <p className="label-xs mb-0.5">Preview</p>
                <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                  {form.description}
                </p>
              </div>
              <p
                className="text-base font-black tabular"
                style={{
                  color:      form.type === "credit" ? "hsl(var(--positive))" : "hsl(var(--negative))",
                  fontFamily: "Geist Mono",
                }}
              >
                {form.type === "credit" ? "+" : "−"}₹{parseFloat(form.amount || "0").toFixed(2)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setForm(EMPTY_FORM); setStatus({ state: "idle" }); onClose(); }}
              className="btn-ghost flex-1 justify-center"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || status.state === "success"}
              className="btn-primary flex-1 justify-center gap-2"
            >
              {status.state === "submitting" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : status.state === "success" ? (
                <><CheckCircle className="w-4 h-4" /> Saved</>
              ) : (
                <><Plus className="w-4 h-4" /> Add Transaction</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}