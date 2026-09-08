"use client";
import { useRef, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

/** Radix owns focus trapping, background isolation and nested scroll locks. */
export default function Modal({ open, onClose, title, children, maxWidth = '480px' }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; maxWidth?: string;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="oy-dialog-overlay" />
      <Dialog.Content className="oy-dialog" style={{ maxWidth }} aria-describedby={undefined}
        onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (returnFocus.current?.isConnected) returnFocus.current.focus();
        }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <Dialog.Title className={title ? 'text-h3' : 'sr-only'}>{title || 'Dialog'}</Dialog.Title>
          <Dialog.Close className="btn-icon-glass touch-target ml-auto flex items-center justify-center" aria-label="Close">
            <X aria-hidden="true" className="h-4 w-4" />
          </Dialog.Close>
        </div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
