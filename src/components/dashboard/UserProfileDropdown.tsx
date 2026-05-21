"use client";

import { useState, useRef, useEffect } from "react";
import { User, CreditCard, LogOut, X, Edit3, Check, Upload } from "lucide-react";
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
    totalInvestments: number;
  };
  signOutAction: () => Promise<void>;
}

export default function UserProfileDropdown({ sessionUser, stats, signOutAction }: UserProfileDropdownProps) {
  const { triggerToast } = useNotifications();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  
  const [currentName, setCurrentName] = useState<string>(sessionUser.name || "WealthUser");
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(sessionUser.image || "");
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

  // Inject Cloudinary Core Upload Widget Pipeline script onto layout context
  useEffect(() => {
    if (showEditModal && !window.hasOwnProperty("cloudinary")) {
      const script = document.createElement("script");
      script.src = "https://upload-widget.cloudinary.com/global/all.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [showEditModal]);

  function handleTriggerUploadWidget() {
    // Check if CDN loaded safely
    if (!(window as any).cloudinary) {
      triggerToast("Widget Initialization Fault", "Cloudinary media script CDN is currently unreachable.", "WARNING");
      return;
    }

    const myWidget = (window as any).cloudinary.createUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "your_cloud_name", 
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "your_unsigned_preset",
        sources: ["local", "url", "camera"],
        multiple: false,
        theme: "minimal"
      },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          // Capture the fresh permanent cloud asset address string directly
          setCurrentImageUrl(result.info.secure_url);
          triggerToast("Media File Uploaded", "Asset staged successfully. Commit changes to save.", "INFO");
        }
      }
    );
    myWidget.open();
  }

  async function handleSaveChanges(e: React.FormEvent) {
    e.preventDefault();
    if (!currentName.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: currentName.trim(), 
          image: currentImageUrl // 🔥 Transmits link down to PostgreSQL updates
        })
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
      triggerToast("Connection Fault", "Failed to compile profile data changes.", "WARNING");
    } finally {
      setIsSaving(false);
    }
  }

  // Helper utility to calculate structural text-based initials fallbacks safely
  const userInitials = currentName.trim().substring(0, 1).toUpperCase() || "W";

  return (
    <div className="relative font-mono text-xs text-white" ref={dropdownRef}>
      {/* Dynamic Avatar Image / Initial Badge Trigger element */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border border-white/10 p-1 bg-zinc-950 hover:bg-zinc-900 transition-colors rounded select-none"
      >
        {currentImageUrl ? (
          <img 
            src={currentImageUrl} 
            alt="Profile Avatar" 
            className="w-6 h-6 rounded border border-white/5 object-cover"
            referrerPolicy="no-referrer" // Prevents Google imagery access blocks
          />
        ) : (
          <span className="text-xs font-bold bg-zinc-900 w-6 h-6 flex items-center justify-center rounded border border-white/10 text-sky-400 font-mono">
            {userInitials}
          </span>
        )}
        <span className="text-gray-300 max-w-[120px] truncate pr-1 hidden sm:inline">{currentName}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-zinc-950 border border-white/10 shadow-2xl z-50">
          <div className="p-4 border-b border-white/5 bg-black/40 flex items-center gap-3">
            {currentImageUrl ? (
              <img src={currentImageUrl} className="w-8 h-8 rounded object-cover border border-white/10" referrerPolicy="no-referrer" />
            ) : (
              <span className="w-8 h-8 rounded bg-zinc-900 border border-white/5 flex items-center justify-center font-bold text-sky-400 text-sm">{userInitials}</span>
            )}
            <div className="overflow-hidden">
              <div className="font-bold text-gray-200 truncate">{currentName}</div>
              <div className="text-[10px] text-gray-500 truncate mt-0.5">{sessionUser.email}</div>
            </div>
          </div>

          <div className="p-1 space-y-0.5">
            <button
              onClick={() => { setShowEditModal(true); setIsOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-400 hover:text-white hover:bg-zinc-900 text-left transition-colors"
            >
              <User className="w-3.5 h-3.5 text-sky-400" /> Profile Overview & Stats
            </button>
            <RazorpayUpgradeButton 
    sessionUser={{
      id: sessionUser.id,
      name: currentName,
      email: sessionUser.email,
      image: currentImageUrl
    }}
    buttonText="Upgrade to Pro Tier (₹1,299)"
    className="w-full px-3 py-2 text-gray-400 hover:text-white hover:bg-zinc-900 text-left transition-colors"
  />
          </div>

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

      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 max-w-md w-full p-6 relative shadow-2xl">
            <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm uppercase tracking-widest font-black text-gray-300 border-b border-white/5 pb-2 mb-4">
              User Profile Matrix Control
            </h3>

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

              {/* Dynamic Free-Tier Cloudinary Upload Block Action zone */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-2 font-bold">Workspace Profile Photo</label>
                <div className="flex items-center gap-4 bg-black p-3 border border-white/5">
                  {currentImageUrl ? (
                    <img src={currentImageUrl} className="w-12 h-12 rounded object-cover border border-white/10" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 bg-zinc-900 border border-white/5 flex items-center justify-center font-bold text-lg text-sky-400">{userInitials}</div>
                  )}
                  <button
                    type="button"
                    onClick={handleTriggerUploadWidget}
                    className="flex items-center gap-1.5 border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-[10px] uppercase font-bold tracking-wide px-3 py-2 transition-colors text-sky-400"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Custom Image
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-white/5 text-gray-400 hover:text-white transition-colors">Dismiss</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-white text-black font-black hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-1.5 rounded">
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