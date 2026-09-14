"use client";

import { useState } from "react";
import { AdminModal } from "./AdminModal";
import { ADMIN_INPUT_CLASS, ADMIN_LABEL_CLASS, ADMIN_SELECT_CLASS } from "./adminFormStyles";
import { useAdminToast } from "./AdminToast";
import {
  archiveStatementDocumentAction,
  publishStatementDocumentAction,
  updateStatementDocumentAction,
} from "@/app/admin/actions";
import { ADMIN_DOCUMENT_TYPE_LABEL } from "@/lib/adminLabels";
import { monthLabel } from "@/lib/dates";
import type { AdminDocumentType, AdminProperty, AdminStatementDocument } from "@/types/admin";

const DOCUMENT_TYPES: AdminDocumentType[] = ["owner_report", "invoice", "credit_note", "other"];

/**
 * "Prüfen" on /admin/statements: an admin corrects property/period/type,
 * then publishes or archives - see services/admin/statementService.ts for
 * exactly what each action does. "Veröffentlichen" saves any pending edits
 * first (so a corrected type is what actually gets checked/published), then
 * publishes - the server action itself refuses to publish a still-"other"
 * "Rechnung-Gutschrift" document (spec point 10).
 */
export function StatementDocumentReviewModal({
  open,
  onClose,
  document,
  properties,
}: {
  open: boolean;
  onClose: () => void;
  document: AdminStatementDocument;
  properties: AdminProperty[];
}) {
  const [propertyId, setPropertyId] = useState(document.propertyId);
  const [year, setYear] = useState(document.year);
  const [month, setMonth] = useState(document.month);
  const [documentType, setDocumentType] = useState<AdminDocumentType>(document.documentType);
  const [pending, setPending] = useState<"save" | "publish" | "archive" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const showToast = useAdminToast();

  async function handleSave() {
    setPending("save");
    setError(null);
    const result = await updateStatementDocumentAction(document.id, { propertyId, year, month, documentType });
    setPending(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    showToast(result.message);
    onClose();
  }

  async function handlePublish() {
    setPending("publish");
    setError(null);
    const saveResult = await updateStatementDocumentAction(document.id, { propertyId, year, month, documentType });
    if (!saveResult.ok) {
      setPending(null);
      setError(saveResult.message);
      return;
    }
    const result = await publishStatementDocumentAction(document.id);
    setPending(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    showToast(result.message);
    onClose();
  }

  async function handleArchive() {
    setPending("archive");
    setError(null);
    const result = await archiveStatementDocumentAction(document.id);
    setPending(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    showToast(result.message);
    onClose();
  }

  return (
    <AdminModal open={open} onClose={onClose} title="Dokument prüfen" description={document.fileName} widthClassName="max-w-lg">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={ADMIN_LABEL_CLASS}>Objekt</span>
          <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className={ADMIN_SELECT_CLASS}>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={ADMIN_LABEL_CLASS}>Jahr</span>
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className={ADMIN_INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={ADMIN_LABEL_CLASS}>Monat</span>
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className={ADMIN_SELECT_CLASS}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((monthNumber) => (
                <option key={monthNumber} value={monthNumber}>
                  {monthLabel(monthNumber)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={ADMIN_LABEL_CLASS}>Dokumenttyp</span>
          <select
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value as AdminDocumentType)}
            className={ADMIN_SELECT_CLASS}
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {ADMIN_DOCUMENT_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-ink-soft">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={handleArchive}
            disabled={pending !== null}
            className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending === "archive" ? "Archiviert…" : "Archivieren"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending !== null}
            className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending === "save" ? "Speichert…" : "Speichern"}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={pending !== null}
            className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending === "publish" ? "Veröffentlicht…" : "Veröffentlichen"}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}
