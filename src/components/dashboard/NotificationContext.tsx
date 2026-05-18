"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Bell, X, CheckCircle, AlertTriangle, Info } from "lucide-react";

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "SUCCESS" | "WARNING" | "INFO";
}

interface NotificationContextType {
  toasts: ToastMessage[];
  triggerToast: (title: string, message: string, type: "SUCCESS" | "WARNING" | "INFO") => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function triggerToast(title: string, message: string, type: "SUCCESS" | "WARNING" | "INFO" = "INFO") {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, title, message, type };
    
    setToasts((prev) => [...prev, newToast]);

    // Automatically dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }

  return (
    <NotificationContext.Provider value={{ toasts, triggerToast }}>
      {children}
      
      {/* Absolute Toast Container Stack View */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm w-full font-mono text-xs">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 border bg-zinc-950 text-white flex items-start gap-3 shadow-2xl animate-slideIn ${
              toast.type === "SUCCESS" ? "border-emerald-500/40" :
              toast.type === "WARNING" ? "border-amber-500/40" : "border-white/10"
            }`}
          >
            {toast.type === "SUCCESS" && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === "WARNING" && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
            {toast.type === "INFO" && <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />}
            
            <div className="flex-1">
              <div className="font-bold uppercase tracking-wider">{toast.title}</div>
              <div className="text-gray-400 text-[11px] mt-1 leading-normal">{toast.message}</div>
            </div>
            
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-gray-500 hover:text-white transition-colors"
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
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be wrapped inside a NotificationProvider");
  return context;
}