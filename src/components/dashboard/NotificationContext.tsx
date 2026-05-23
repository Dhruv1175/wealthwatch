"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";

interface Toast {
  id:      string;
  title:   string;
  message: string;
  type:    "SUCCESS" | "WARNING" | "INFO";
}

interface NotificationContextType {
  toasts:       Toast[];
  triggerToast: (title: string, message: string, type: "SUCCESS" | "WARNING" | "INFO") => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function triggerToast(
    title:   string,
    message: string,
    type:    "SUCCESS" | "WARNING" | "INFO" = "INFO"
  ) {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <NotificationContext.Provider value={{ toasts, triggerToast }}>
      {children}

      {/* Toast stack */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 w-80 font-mono text-xs">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 border bg-card text-foreground flex items-start gap-3 shadow-2xl shadow-black/60 animate-slide-down ${
              toast.type === "SUCCESS"
                ? "border-positive/30"
                : toast.type === "WARNING"
                ? "border-warning/30"
                : "border-border"
            }`}
          >
            {toast.type === "SUCCESS" && <CheckCircle className="w-4 h-4 text-positive shrink-0 mt-0.5" />}
            {toast.type === "WARNING" && <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />}
            {toast.type === "INFO"    && <Info          className="w-4 h-4 text-info    shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <p className="font-bold uppercase tracking-wider text-[10px]">{toast.title}</p>
              <p className="text-muted-foreground text-[10px] mt-1 leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => dismiss(toast.id)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
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
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}