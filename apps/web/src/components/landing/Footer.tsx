"use client";

import React from "react";
import Link from "next/link";
import { Monogram } from "@/components/logo";

export default function Footer() {
  return (
    <footer className="oy-editorial-footer" role="contentinfo">
      <div className="oy-footer-inner">
        <div className="oy-footer-top">
          <div className="oy-footer-brand">
            <Link href="/" className="flex items-center gap-2.5 text-[var(--oy-ink)] font-bold tracking-wider text-sm">
              <Monogram className="h-6 w-6" />
              <span>OYINCA</span>
            </Link>
            <p>
              Your social media manager. Intelligent media analysis, drafting, and
              autonomous scheduling for TikTok.
            </p>
          </div>

          <div className="oy-footer-col">
            <h4>Product</h4>
            <ul>
              <li><a href="#product">Overview</a></li>
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>

          <div className="oy-footer-col">
            <h4>Account</h4>
            <ul>
              <li><Link href="/login">Sign in</Link></li>
              <li><Link href="/register?plan=FREE">Get started</Link></li>
            </ul>
          </div>

          <div className="oy-footer-col">
            <h4>Legal</h4>
            <ul>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><a href="mailto:hello@oyinca.com">Contact Support</a></li>
            </ul>
          </div>
        </div>

        <div className="oy-footer-bottom">
          <div>
            © {new Date().getFullYear()} Oyinca. Powered by Turaab Technology. All rights reserved.
          </div>
          <div className="text-xs">
            Focused on TikTok automation & brand memory.
          </div>
        </div>
      </div>
    </footer>
  );
}
