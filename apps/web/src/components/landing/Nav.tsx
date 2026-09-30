"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Monogram } from "@/components/logo";
import { Menu, X, ArrowRight } from "lucide-react";

const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  return (
    <header className="oy-floating-nav-container" ref={navRef}>
      <nav
        className={`oy-floating-nav ${scrolled ? "is-scrolled" : ""}`}
        aria-label="Main Navigation"
      >
        <Link href="/" className="oy-nav-brand" aria-label="Oyinca Homepage">
          <Monogram className="h-7 w-7 text-[var(--oy-ink)]" />
          <span>OYINCA</span>
        </Link>

        <div className="oy-nav-links" role="menubar">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} role="menuitem">
              {link.label}
            </a>
          ))}
        </div>

        <div className="oy-nav-right">
          <Link href="/login" className="oy-nav-signin">
            Sign in
          </Link>
          <Link href="/register?plan=FREE" className="oy-nav-cta">
            <span>Get started</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="oy-mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="oy-mobile-nav-drawer" role="dialog" aria-modal="true">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
          >
            Sign in
          </Link>
          <Link
            href="/register?plan=FREE"
            className="oy-btn-primary w-full mt-2"
            onClick={() => setMobileOpen(false)}
          >
            Get started
          </Link>
        </div>
      )}
    </header>
  );
}
