"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Monogram } from "@/components/logo";
const links = [
  ["#product", "Product"],
  ["#how-it-works", "How it works"],
  ["#pricing", "Pricing"],
  ["#faq", "FAQ"],
];
export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const outside = (e: PointerEvent) => {
      if (!header.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  return (
    <header ref={header} className={`oy-nav${scrolled ? " is-scrolled" : ""}${open ? " is-expanded" : ""}`}>
      <nav aria-label="Primary">
        <Link href="/" aria-label="Oyinca home">
          <Monogram className="h-9 w-9" />
        </Link>
        <div className="oy-nav-links">
          {links.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </div>
        <div className="oy-nav-actions">
          <ThemeToggle />
          <Link className="oy-signin" href="/login">
            Sign in
          </Link>
          <Link
            className="lp-btn-primary oy-button oy-nav-start"
            href="/register"
          >
            Start free
          </Link>
          <button
            ref={toggle}
            className="oy-menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen(!open)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </nav>
      <div id="mobile-navigation" className="oy-mobile-nav" hidden={!open}>
        {links.map(([href, label]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
        <Link href="/login" onClick={() => setOpen(false)}>
          Sign in
        </Link>
        <Link href="/register" onClick={() => setOpen(false)}>
          Start free
        </Link>
      </div>
    </header>
  );
}
