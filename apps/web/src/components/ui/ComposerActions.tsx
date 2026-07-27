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
      {/* Always the primary action, always present, always full width */}
      <button
        onClick={onSendToApproval}
        className="w-full rounded-2xl py-3.5 font-bold text-xs shadow-md transition touch-target"
        style={{
          backgroundColor: "var(--accent-primary)",
          color: "white",
        }}
      >
        Send to Approval Queue
      </button>

      {/* Only rendered once account unlocks Auto-Publish */}
      {autoPublishEnabled && (
        <button
          onClick={onScheduleDirectly}
          className="w-full rounded-2xl py-2.5 text-xs font-semibold border transition touch-target"
          style={{
            borderColor: "var(--accent-primary)",
            color: "var(--accent-primary)",
            backgroundColor: "transparent",
          }}
        >
          Publish with Smart AI Time
        </button>
      )}

      {!autoPublishEnabled && (
        <p className="text-[11px] text-center font-medium" style={{ color: "var(--text-secondary)" }}>
          Direct publishing unlocks after you've approved a few posts.
        </p>
      )}
    </div>
  );
}
