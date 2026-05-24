"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";

interface Toast { id: string; title: string; message: string; type: "SUCCESS" | "WARNING" | "INFO"; }
interface Ctx   { toasts: Toast[]; triggerToast: (t: string, m: string, type?: "SUCCESS" | "WARNING" | "INFO") => void; }

const NotificationContext = createContext<Ctx | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function triggerToast(title: string, message: string, type: "SUCCESS" | "WARNING" | "INFO" = "INFO") {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((p) => [...p, { id, title, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }

  return (
    <NotificationContext.Provider value={{ toasts, triggerToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-3 rounded-xl p-4 animate-slide-right"
            style={{
              background:  "hsl(var(--surface-overlay))",
              border:      `1px solid ${t.type === "SUCCESS" ? "hsl(var(--positive) / 0.3)" : t.type === "WARNING" ? "hsl(var(--warning) / 0.3)" : "hsl(var(--border))"}`,
              boxShadow:   "0 8px 32px hsl(220 14% 3% / 0.5)",
            }}
          >
            {t.type === "SUCCESS" && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--positive))" }} />}
            {t.type === "WARNING" && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--warning))" }} />}
            {t.type === "INFO"    && <Info           className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--info))" }} />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{t.title}</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "hsl(var(--foreground-secondary))" }}>{t.message}</p>
            </div>
            <button
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              className="btn-icon shrink-0"
              style={{ width: "24px", height: "24px" }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
}