"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { loginWithCredentials } from "@/app/actions/auth"; // adjust import path

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFormAction = async (formData: FormData) => {
    setError("");
    setLoading(true);
    const result = await loginWithCredentials(formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-brand-black text-brand-white font-sans antialiased overflow-x-hidden selection:bg-mint-500/20 px-4">
      {/* Grid overlay – identical to landing page */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      {/* Minimal top bar */}
      <div className="absolute top-0 left-0 right-0 border-b border-white/10 px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-medium uppercase tracking-[0.12em] text-brand-white hover:text-gray-300 transition-colors">
          <span className="flex items-center justify-center w-6 h-6 border border-mint-600">
            <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none">
              <polyline points="1,10 4,6 7,8 10,3 13,5" stroke="#22C55E" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          WealthWatch
        </Link>
      </div>

      {/* Login card */}
      <div className="w-full max-w-md border border-white/10 p-8 md:p-10 bg-gray-950/50 backdrop-blur-sm">
        <h1 className="text-2xl font-light tracking-[-0.02em] mb-2">Welcome back</h1>
        <p className="text-sm text-gray-400 mb-8">Sign in to your account to continue.</p>

        {error && (
          <div className="mb-6 px-4 py-3 border border-error-500/30 bg-error-500/10 text-error-400 text-sm font-mono">
            {error}
          </div>
        )}

        {/* Credentials form */}
        <form action={handleFormAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-mono text-gray-500 tracking-[0.08em] uppercase">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="name@company.com"
              className="w-full py-3 px-4 bg-brand-black border border-white/10 text-brand-white font-sans text-sm outline-none focus:border-sky-500 transition-colors placeholder:text-gray-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-mono text-gray-500 tracking-[0.08em] uppercase">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full py-3 px-4 bg-brand-black border border-white/10 text-brand-white font-sans text-sm outline-none focus:border-sky-500 transition-colors placeholder:text-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-sans text-sm font-medium text-brand-black bg-brand-white border border-brand-white hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in with Email"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6 text-[11px] text-gray-600 font-mono before:flex-1 before:h-px before:bg-white/10 after:flex-1 after:h-px after:bg-white/10">
          OR
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogleSignIn}
          className="flex items-center justify-center gap-3 w-full py-3 bg-brand-white text-brand-black font-sans text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <svg viewBox="0 0 18 18" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        {/* Register link */}
        <p className="mt-6 text-center text-xs text-gray-500 font-mono">
          Don’t have an account?{" "}
          <Link href="/register" className="text-sky-400 underline underline-offset-2 hover:text-sky-300 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}