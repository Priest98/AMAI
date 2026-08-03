"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

/**
 * Design System v2 modal primitive -- glass-panel surface, premium-ease
 * scale/fade transition, Escape-to-close and backdrop-click-to-close for
 * keyboard/mouse users alike. Portals to document.body so it always sits
 * above dashboard layout stacking contexts.
 */
export default function Modal({ open, onClose, title, children, maxWidth = "480px" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(10, 11, 20, 0.55)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="glass-panel relative w-full rounded-[var(--radius-xl)] p-6"
            style={{ maxWidth }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {title && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-h3" style={{ color: "var(--text-primary)" }}>
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="btn-icon-glass touch-target w-8 h-8 flex items-center justify-center"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
