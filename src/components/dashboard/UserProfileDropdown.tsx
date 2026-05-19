"use client";

import { useState, useRef, useEffect } from "react";
import { User, CreditCard, LogOut, X, Edit3, Check, Award } from "lucide-react";
import { useNotifications } from "./NotificationContext";

interface UserProfileDropdownProps {
  sessionUser: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  stats: {
    totalTransactions: number;
    totalInvestments: number;
  };
  signOutAction: () => Promise<void>; // Server Action configuration hook
}

const AVATAR_OPTIONS = ["⚡", "🛡️", "📈", "💼", "🤖", "🪙"];

export default function UserProfileDropdown({ sessionUser, stats, signOutAction }: UserProfileDropdownProps) {
  const { triggerToast } = useNotifications();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  
  const [currentName, setCurrentName] = useState<string>(sessionUser.name || "WealthUser");
  const [currentAvatar, setCurrentAvatar] = useState<string>("⚡");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSaveChanges(e: React.FormEvent) {
    e.preventDefault();
    if (!currentName.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: currentName.trim(), avatar: currentAvatar })
      });

      if (res.ok) {
        triggerToast("Profile Configuration Updated", "Your identification records have been committed successfully.", "SUCCESS");
        setShowEditModal(false);
        setIsOpen(false);
      } else {
        triggerToast("Mutation Error", "Database rejected update parameters.", "WARNING");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Connection Fault", "Failed to update profile changes.", "WARNING");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="relative font-mono text-xs text-white" ref={dropdownRef}>
      {/* Target Avatar Trigger Element */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border border-white/10 p-1.5 bg-zinc-950 hover:bg-zinc-900 transition-colors rounded select-none"
      >
        <span className="text-sm bg-zinc-900 w-6 h-6 flex items-center justify-center rounded border border-white/5">{currentAvatar}</span>
        <span className="text-gray-300 max-w-[120px] truncate pr-1 hidden sm:inline">{currentName}</span>
      </button>

      {/* Dynamic Dropdown Floating Shell Block */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-zinc-950 border border-white/10 shadow-2xl z-50">
          <div className="p-4 border-b border-white/5 bg-black/40">
            <div className="font-bold text-gray-200 truncate">{currentName}</div>
            <div className="text-[10px] text-gray-500 truncate mt-0.5">{sessionUser.email}</div>
          </div>

          <div className="p-1 space-y-0.5">
            <button
              onClick={() => { setShowEditModal(true); setIsOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-400 hover:text-white hover:bg-zinc-900 text-left transition-colors"
            >
              <User className="w-3.5 h-3.5 text-sky-400" /> Profile Overview & Stats
            </button>
            <div className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-500 bg-zinc-950 text-left opacity-40 cursor-not-allowed select-none">
              <CreditCard className="w-3.5 h-3.5 text-amber-500" /> Manage Subscriptions
            </div>
          </div>

          {/* Clean execution wrapper linking straight to the server context route */}
          <div className="p-1 border-t border-white/5 bg-black/20">
            <form action={signOutAction} className="w-full">
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/10 text-left transition-colors font-mono text-xs"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out Workspace
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Profile Overview & Edit Modal Component Overlay Layer */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 max-w-md w-full p-6 relative shadow-2xl">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm uppercase tracking-widest font-black text-gray-300 border-b border-white/5 pb-2 mb-4">
              User Profile Matrix Control
            </h3>

            {/* Static Aggregated Metric Analytics Summary Panel Block */}
            <div className="grid grid-cols-2 gap-3 text-center mb-6">
              <div className="bg-black border border-white/5 p-2 rounded">
                <div className="text-[10px] text-gray-500 uppercase">Positions Tracked</div>
                <div className="text-sm font-bold text-sky-400 mt-1">{stats.totalInvestments}</div>
              </div>
              <div className="bg-black border border-white/5 p-2 rounded">
                <div className="text-[10px] text-gray-500 uppercase">Feed Records</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">{stats.totalTransactions}</div>
              </div>
            </div>

            {/* Edit Field Management Workspace Form */}
            <form onSubmit={handleSaveChanges} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1.5 font-bold">Workspace Name</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={currentName}
                    onChange={(e) => setCurrentName(e.target.value)}
                    maxLength={24}
                    className="w-full bg-black border border-white/10 px-3 py-2 text-white outline-none focus:border-sky-500/60 font-mono text-xs pr-8"
                  />
                  <Edit3 className="w-3.5 h-3.5 absolute right-3 text-zinc-600" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-2 font-bold">Identity Symbol (Avatar)</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => setCurrentAvatar(avatar)}
                      className={`py-2 text-lg border transition-all rounded bg-black ${currentAvatar === avatar ? "border-sky-400 bg-sky-950/20" : "border-white/5 hover:border-white/20"}`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-white text-black font-black hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-1.5 rounded"
                >
                  <Check className="w-3.5 h-3.5" /> {isSaving ? "Saving..." : "Commit Structure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}