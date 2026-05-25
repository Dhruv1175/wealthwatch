"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import AddTransactionModal from "@/components/dashboard/AddTransactionModal"

export default function AddTransactionButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Add transaction"
        className="fixed bottom-8 right-8 z-40 flex items-center gap-2.5 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all shadow-2xl group"
        style={{
          background:  "hsl(var(--info))",
          color:       "hsl(0 0% 100%)",
          boxShadow:   "0 8px 32px hsl(var(--info) / 0.4)",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.background  = "hsl(210 100% 65%)";
          el.style.boxShadow   = "0 12px 40px hsl(var(--info) / 0.55)";
          el.style.transform   = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.background  = "hsl(var(--info))";
          el.style.boxShadow   = "0 8px 32px hsl(var(--info) / 0.4)";
          el.style.transform   = "translateY(0)";
        }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "hsl(0 0% 100% / 0.2)" }}
        >
          <Plus className="w-3.5 h-3.5" />
        </div>
        <span>Add Transaction</span>
      </button>

      <AddTransactionModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}