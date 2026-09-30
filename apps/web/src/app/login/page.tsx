"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { AtSign, Lock, ArrowRight, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { API_BASE, isAuthenticated, setSession } from "@/lib/api";
import { capture, identify } from "@/lib/posthog";
import BrandAttribution from "@/components/BrandAttribution";
import PlanSelectionNotice from "@/components/PlanSelectionNotice";
import { getSelectedPlan, planDestination } from "@/lib/plan-intent";
import TikTokAuthButton from "@/components/auth/TikTokAuthButton";
import "@/styles/auth.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getSelectedPlan();
    const message = new URLSearchParams(window.location.search).get("error");
    if (message) setError(message);
    if (isAuthenticated()) {
      router.replace(planDestination());
      return;
    }
    setCheckingSession(false);
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setSession(data.user, data.expiresAt);
        identify(email, { email });
        capture("login", { email });
        router.push(planDestination());
        return;
      }

      if (data.message && data.message.includes("UNVERIFIED_EMAIL")) {
        router.push(
          `/verify-email?email=${encodeURIComponent(email)}${
            getSelectedPlan() ? "&plan=" + getSelectedPlan() : ""
          }`
        );
        return;
      }

      setError(data.message || "Invalid email address or password.");
    } catch {
      setError("Unable to reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen w-full" style={{ backgroundColor: "var(--bg-base)" }} />;
  }

  return (
    <div className="oy-auth-container">
      <PlanSelectionNotice />

      <div className="oy-auth-card">
        {/* Brand Header */}
        <div className="oy-auth-header">
          <div>
            <Link href="/" className="inline-block focus:outline-none" aria-label="Oyinca Homepage">
              <Logo className="h-8" />
            </Link>
            <h1 className="oy-auth-heading">
              Your social media,
              <br />
              handled.
            </h1>
            <p className="oy-auth-sub">
              Sign in to manage and review your content pipeline.
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Error Notification */}
        {error && (
          <div role="alert" className="oy-auth-error">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TikTok Auth CTA */}
        <TikTokAuthButton label="Continue with TikTok" />

        {/* Divider */}
        <div className="oy-auth-divider" aria-hidden="true">
          <div className="oy-auth-divider-line" />
          <span className="oy-auth-divider-text">or continue with email</span>
          <div className="oy-auth-divider-line" />
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleLogin} className="oy-auth-form" noValidate>
          <div className="oy-auth-field">
            <label htmlFor="login-email" className="oy-auth-label">
              Email address
            </label>
            <div className="oy-auth-input-wrap">
              <AtSign className="oy-auth-input-icon w-4 h-4" />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="oy-auth-input"
              />
            </div>
          </div>

          <div className="oy-auth-field">
            <div className="oy-auth-label-row">
              <label htmlFor="login-password" className="oy-auth-label">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold hover:underline"
                style={{ color: "var(--accent-secondary)" }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="oy-auth-input-wrap">
              <Lock className="oy-auth-input-icon w-4 h-4" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="oy-auth-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="oy-auth-pw-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center space-x-2 text-xs cursor-pointer select-none" style={{ color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded h-4 w-4"
                style={{ accentColor: "var(--accent-secondary)" }}
              />
              <span>Remember me for 30 days</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="oy-auth-submit-btn"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <p className="oy-auth-footer">
          Don&apos;t have an Oyinca account yet?
          <Link href="/register" className="oy-auth-switch-link">
            Sign up
          </Link>
        </p>
      </div>

      <BrandAttribution />
    </div>
  );
}
