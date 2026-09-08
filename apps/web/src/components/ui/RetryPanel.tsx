"use client";

import { AlertTriangle } from 'lucide-react';

export default function RetryPanel({ message, onRetry, label = 'Try again' }: {
  message: string;
  onRetry: () => void;
  label?: string;
}) {
  return (
    <div className="exec-card card-pad text-center" role="alert">
      <AlertTriangle aria-hidden="true" className="h-5 w-5 mx-auto mb-3" style={{ color: 'var(--accent-warning)' }} />
      <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      <button type="button" onClick={onRetry} className="btn-secondary mt-4 px-4 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold touch-target">
        {label}
      </button>
    </div>
  );
}
