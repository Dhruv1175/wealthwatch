"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import AddTransactionModal from "@/components/dashboard/AddTransactionModal";

export default function AddTransactionButtonInline() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap"
        style={{
          background: "hsl(var(--surface-raised) / 0.5)",
          border:     "1px solid hsl(var(--border-token))",
          color:      "hsl(var(--info))",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "hsl(var(--surface-overlay) / 0.6)";
          e.currentTarget.style.borderColor = "hsl(var(--info) / 0.2)";
          e.currentTarget.style.color = "hsl(var(--info))";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "hsl(var(--surface-raised) / 0.5)";
          e.currentTarget.style.borderColor = "hsl(var(--border-token))";
          e.currentTarget.style.color = "hsl(var(--info))";
        }}
      >
        <Plus className="w-4 h-4" />
        <span>Add Transaction</span>
      </button>
      <AddTransactionModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}