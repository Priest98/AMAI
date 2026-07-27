import React from "react";

interface ComposerActionsProps {
  autoPublishEnabled: boolean;
  onSendToApproval: () => void;
  onScheduleDirectly: () => void;
}

export default function ComposerActions({
  autoPublishEnabled,
  onSendToApproval,
  onScheduleDirectly,
}: ComposerActionsProps) {
  return (
    <div className="space-y-3">
      {/* Primary Action — Deep Emerald Pill Button matching user screenshot */}
      <button
        onClick={onSendToApproval}
        className="w-full rounded-2xl py-3.5 font-bold text-xs shadow-lg transition touch-target btn-emerald-cta"
      >
        Send to Approval Queue
      </button>

      {/* Secondary Action — Champagne Gold Metallic Button */}
      {autoPublishEnabled && (
        <button
          onClick={onScheduleDirectly}
          className="w-full rounded-2xl py-3 text-xs font-bold transition touch-target btn-gold-cta"
        >
          Publish with Smart AI Time
        </button>
      )}

      {!autoPublishEnabled && (
        <p className="text-[11px] text-center font-semibold text-[#706356]">
          Direct publishing unlocks after you've approved a few posts.
        </p>
      )}
    </div>
  );
}
