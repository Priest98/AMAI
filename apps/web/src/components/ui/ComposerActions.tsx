import React from "react";
import { Loader2, Send, Zap } from "lucide-react";

interface ComposerActionsProps {
  onSendToQueue: () => void;
  onPublishNow?: () => void;
  isSubmitting?: boolean;
  mode?: "APPROVAL_QUEUE" | "AUTO_PUBLISH";
}

export default function ComposerActions({
  onSendToQueue,
  onPublishNow,
  isSubmitting = false,
  mode = "APPROVAL_QUEUE",
}: ComposerActionsProps) {
  return (
    <div className="space-y-3">
      {/* Primary Action — Send to Approval Queue */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={onSendToQueue}
        className="w-full rounded-xl py-3.5 px-4 font-bold text-xs shadow-lg transition touch-target btn-emerald-cta disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving & Sending to Approval Queue...</span>
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            <span>Send to Approval Queue</span>
          </>
        )}
      </button>

      {/* Secondary Action — Publish Direct / Auto-Publish */}
      {mode === "AUTO_PUBLISH" && onPublishNow && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onPublishNow}
          className="w-full rounded-xl py-3 px-4 text-xs font-bold transition touch-target btn-gold-cta flex items-center justify-center space-x-2"
        >
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span>Publish Now with Smart AI Time</span>
        </button>
      )}

      {mode !== "AUTO_PUBLISH" && (
        <p className="text-[11px] text-center font-medium" style={{ color: "var(--text-secondary)" }}>
          Approval-first active. Posts are sent to your Approval Queue for review before going live.
        </p>
      )}
    </div>
  );
}
