"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { User, AtSign, Lock, ArrowRight, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { API_BASE, isAuthenticated } from "@/lib/api";
import { capture } from "@/lib/posthog";
import BrandAttribution from "@/components/BrandAttribution";
import PlanSelectionNotice from "@/components/PlanSelectionNotice";
import { getSelectedPlan, planDestination } from "@/lib/plan-intent";
import TikTokAuthButton from "@/components/auth/TikTokAuthButton";
import "@/styles/auth.css";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getSelectedPlan();
    if (isAuthenticated()) {
      router.replace(planDestination());
      return;
    }
    setCheckingSession(false);
  }, [router]);

  const isPasswordLong = password.length >= 8;
  const isPasswordStrong = isPasswordLong && /\d/.test(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isPasswordLong) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        capture("signup_completed");
        router.push(
          `/verify-email?email=${encodeURIComponent(email)}${
            getSelectedPlan() ? "&plan=" + getSelectedPlan() : ""
          }`
        );
        return;
      }

      if (data.signupPending && data.code === "VERIFICATION_EMAIL_NOT_ACCEPTED") {
        router.push(
          `/verify-email?email=${encodeURIComponent(email)}&delivery=failed${
            getSelectedPlan() ? "&plan=" + getSelectedPlan() : ""
          }`
        );
        return;
      }

      setError(data.message || "Failed to create account. Please try again.");
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
              Meet your social media manager
            </h1>
            <p className="oy-auth-sub">
              Give your content an AI manager. Start free in seconds.
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
          <span className="oy-auth-divider-text">or create account with email</span>
          <div className="oy-auth-divider-line" />
        </div>

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="oy-auth-form" noValidate>
          <div className="oy-auth-field">
            <label htmlFor="register-name" className="oy-auth-label">
              Full name
            </label>
            <div className="oy-auth-input-wrap">
              <User className="oy-auth-input-icon w-4 h-4" />
              <input
                id="register-name"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Morgan"
                className="oy-auth-input"
              />
            </div>
          </div>

          <div className="oy-auth-field">
            <label htmlFor="register-email" className="oy-auth-label">
              Email address
            </label>
            <div className="oy-auth-input-wrap">
              <AtSign className="oy-auth-input-icon w-4 h-4" />
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                className="oy-auth-input"
              />
            </div>
          </div>

          <div className="oy-auth-field">
            <label htmlFor="register-password" className="oy-auth-label">
              Password
            </label>
            <div className="oy-auth-input-wrap">
              <Lock className="oy-auth-input-icon w-4 h-4" />
              <input
                id="register-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
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

          <div className="oy-auth-field">
            <label htmlFor="register-confirm-password" className="oy-auth-label">
              Confirm password
            </label>
            <div className="oy-auth-input-wrap">
              <Lock className="oy-auth-input-icon w-4 h-4" />
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="oy-auth-input"
              />
            </div>
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <div className="space-y-1">
              <div className="oy-pw-strength-track">
                <div
                  className="oy-pw-strength-bar"
                  style={{
                    width: isPasswordStrong ? "100%" : isPasswordLong ? "66%" : "33%",
                    backgroundColor: isPasswordStrong
                      ? "#10B981"
                      : isPasswordLong
                      ? "#F59E0B"
                      : "#EF4444",
                  }}
                />
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                {isPasswordStrong
                  ? "Strong password"
                  : isPasswordLong
                  ? "Add a number for a stronger password"
                  : "Minimum 8 characters required"}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="oy-auth-submit-btn"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <p className="oy-auth-footer">
          Already have an account?
          <Link href="/login" className="oy-auth-switch-link">
            Sign in
          </Link>
        </p>
      </div>

      <BrandAttribution />
    </div>
  );
}
