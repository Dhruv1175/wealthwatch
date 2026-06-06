"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { registerWithCredentials } from "@/app/actions/auth";
import { Eye, EyeOff, Loader2, Activity, Check } from "lucide-react";

export default function RegisterPage() {
  const [error,         setError]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass,      setShowPass]      = useState(false);
  const [password,      setPassword]      = useState("");

  // Live password strength
  const checks = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    number:  /[0-9]/.test(password),
  };
  const strength = Object.values(checks).filter(Boolean).length;
  const strengthLabel = strength === 0 ? "" : strength === 1 ? "Weak" : strength === 2 ? "Fair" : "Strong";
  const strengthColor =
    strength === 1 ? "hsl(var(--negative))" :
    strength === 2 ? "hsl(var(--warning))"  :
    strength === 3 ? "hsl(var(--positive))" : "transparent";

  async function handleFormAction(formData: FormData) {
    setError("");
    setLoading(true);
    const result = await registerWithCredentials(formData);
    setLoading(false);
    if (result?.error) setError(result.error);
  }

  function handleGoogle() {
    setGoogleLoading(true);
    signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative selection:bg-mint-500/20"
      style={{ background: "hsl(220 13% 5%)" }}
    >
      {/* Grid overlay */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(220 13% 8% / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(220 13% 8% / 0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 60%, transparent 100%)",
        }}
      />

      {/* Top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-10 flex items-center px-8 h-16"
        style={{
          borderBottom:   "1px solid hsl(var(--border-token))",
          background:     "hsl(220 13% 5% / 0.85)",
          backdropFilter: "blur(20px)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "hsl(var(--info-dim))", border: "1px solid hsl(var(--info) / 0.3)" }}
          >
            <Activity className="w-4 h-4" style={{ color: "hsl(var(--info))" }} />
          </div>
          <span className="text-sm font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
            WealthWatch
          </span>
        </Link>
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "hsl(var(--surface))",
          border:     "1px solid hsl(var(--border-token))",
          boxShadow:  "0 32px 80px hsl(220 14% 3% / 0.6)",
        }}
      >
        {/* Top accent */}
        <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, hsl(var(--positive)), transparent)" }} />

        <div className="p-8 md:p-10">

          {/* Heading */}
          <div className="mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "hsl(var(--positive-dim))", border: "1px solid hsl(var(--positive) / 0.3)" }}
            >
              <Activity className="w-5 h-5" style={{ color: "hsl(var(--positive))" }} />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-1" style={{ color: "hsl(var(--foreground))" }}>
              Create your account
            </h1>
            <p className="text-sm" style={{ color: "hsl(var(--foreground-tertiary))" }}>
              Start tracking your wealth in under 60 seconds.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 mb-6 text-sm"
              style={{
                background: "hsl(var(--negative-dim))",
                border:     "1px solid hsl(var(--negative) / 0.3)",
                color:      "hsl(var(--negative))",
                fontFamily: "Geist Mono",
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form action={handleFormAction} className="space-y-4">

            {/* Name */}
            <div>
              <label className="label-xs block mb-1.5">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Alex Johnson"
                className="field"
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="label-xs block mb-1.5">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="field"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="label-xs block mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="field pr-10"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "hsl(var(--foreground-tertiary))" }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength */}
              {password.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{ background: s <= strength ? strengthColor : "hsl(var(--surface-raised))" }}
                      />
                    ))}
                    {strengthLabel && (
                      <span className="text-[10px] font-semibold ml-1 shrink-0" style={{ color: strengthColor, fontFamily: "Geist Mono" }}>
                        {strengthLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "length", label: "8+ chars"      },
                      { key: "upper",  label: "Uppercase"      },
                      { key: "number", label: "Number"         },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-1 text-[10px]"
                        style={{
                          color: checks[key as keyof typeof checks]
                            ? "hsl(var(--positive))"
                            : "hsl(var(--foreground-tertiary))",
                        }}>
                        <Check className="w-2.5 h-2.5" />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-primary w-full justify-center text-sm py-3 gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "hsl(var(--border-token))" }} />
            <span
              className="text-xs px-2"
              style={{ color: "hsl(var(--foreground-tertiary))", fontFamily: "Geist Mono" }}
            >
              OR
            </span>
            <div className="flex-1 h-px" style={{ background: "hsl(var(--border-token))" }} />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading || googleLoading}
            className="btn-ghost w-full justify-center text-sm py-3 gap-3"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 18 18" className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* Login link */}
          <p className="mt-8 text-center text-xs" style={{ color: "hsl(var(--foreground-tertiary))" }}>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold transition-colors"
              style={{ color: "hsl(var(--info))" }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-6 text-xs text-center" style={{ color: "hsl(var(--foreground-tertiary))" }}>
        By creating an account you agree to our{" "}
        <span style={{ color: "hsl(var(--foreground-secondary))" }}>Terms of Service</span>
        {" "}and{" "}
        <span style={{ color: "hsl(var(--foreground-secondary))" }}>Privacy Policy</span>.
      </p>
    </div>
  );
}