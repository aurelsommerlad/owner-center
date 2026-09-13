"use client";

import { useState } from "react";
import { AdminModal } from "./AdminModal";

/**
 * Confirmation step for actions that must not happen on a single accidental
 * click (deactivating an owner/user, removing property access). Deliberately
 * not a browser confirm() - same modal chrome as the rest of Admin.
 */
export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminModal open={open} onClose={onCancel} title={title} description={description} widthClassName="max-w-sm">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "…" : confirmLabel}
        </button>
      </div>
    </AdminModal>
  );
}
