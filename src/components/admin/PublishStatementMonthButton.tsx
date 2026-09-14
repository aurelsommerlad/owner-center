"use client";

import { useState } from "react";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { publishStatementMonthAction } from "@/app/admin/actions";
import { monthLabel } from "@/lib/dates";
import type { AdminStatementMonthCompleteness } from "@/types/admin";

/**
 * "Monat veröffentlichen" (spec point 8) - publishes every classifiable
 * document for one property/month in one action (see
 * statementService.ts#publishStatementMonth). Never technically blocked by
 * an incomplete month - the admin sees the warning here and has to
 * consciously confirm anyway, exactly per spec ("nicht zwingend technisch
 * blockieren, aber deutlich warnen").
 */
export function PublishStatementMonthButton({
  propertyId,
  year,
  month,
  coreDocumentCount,
  receiptCount,
  completeness,
  disabled,
}: {
  propertyId: string;
  year: number;
  month: number;
  coreDocumentCount: number;
  receiptCount: number;
  completeness: AdminStatementMonthCompleteness;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const showToast = useAdminToast();

  async function handleConfirm() {
    setPending(true);
    const result = await publishStatementMonthAction(propertyId, year, month);
    setPending(false);
    setOpen(false);
    showToast(result.message);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Monat veröffentlichen
      </button>

      <AdminModal
        open={open}
        onClose={() => setOpen(false)}
        title={`${monthLabel(month)} ${year} veröffentlichen?`}
        widthClassName="max-w-sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            {coreDocumentCount} Kerndokument{coreDocumentCount === 1 ? "" : "e"} und {receiptCount} Beleg
            {receiptCount === 1 ? "" : "e"} werden für den Eigentümer bereitgestellt.
          </p>
          {completeness.status === "incomplete" && (
            <p className="rounded-xl border border-status-blocked/30 bg-status-blocked/5 px-3.5 py-2.5 text-xs text-ink-soft">
              Dieser Monat ist noch nicht vollständig.
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Veröffentlicht…" : "Veröffentlichen"}
            </button>
          </div>
        </div>
      </AdminModal>
    </>
  );
}
