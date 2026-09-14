"use client";

import { createElement, useState } from "react";
import { AdminStatusBadge, statementMonthPublishStatusBadge, statementStatusBadge } from "./AdminStatusBadge";
import { StatementDocumentReviewModal } from "./StatementDocumentReviewModal";
import { PublishStatementMonthButton } from "./PublishStatementMonthButton";
import { ChevronDownIcon } from "@/components/ui/icons";
import { ADMIN_DOCUMENT_TYPE_ICON } from "@/lib/adminLabels";
import { monthLabel } from "@/lib/dates";
import type { AdminProperty, AdminStatementDocument, AdminStatementMonthGroup } from "@/types/admin";

/** One document row inside an expanded category section - icon (varies by documentType, see ADMIN_DOCUMENT_TYPE_ICON), filename, status, "Prüfen". */
function StatementMonthDocumentRow({ document, properties }: { document: AdminStatementDocument; properties: AdminProperty[] }) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const badge = statementStatusBadge(document.adminStatus);
  const icon = createElement(ADMIN_DOCUMENT_TYPE_ICON[document.documentType], { className: "h-3.5 w-3.5" });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#87977E]/12 text-[#52664E]">
            {icon}
          </span>
          <p className="min-w-0 truncate text-xs text-ink">{document.fileName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AdminStatusBadge label={badge.label} tone={badge.tone} />
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Prüfen
          </button>
        </div>
      </div>
      <StatementDocumentReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} document={document} properties={properties} />
    </>
  );
}

function CategorySection({
  title,
  documents,
  properties,
  emptyHint,
}: {
  title: string;
  documents: AdminStatementDocument[];
  properties: AdminProperty[];
  emptyHint?: string;
}) {
  if (documents.length === 0 && !emptyHint) return null;

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-soft/70">{title}</p>
      {documents.length === 0 ? (
        <p className="py-2 text-xs text-ink-soft">{emptyHint}</p>
      ) : (
        <div className="divide-y divide-line/60">
          {documents.map((document) => (
            <StatementMonthDocumentRow key={document.id} document={document} properties={properties} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One property's one statement month - the central unit /admin/statements
 * now renders (spec point 6/7), replacing the old flat per-document list.
 * The collapsed header shows two independent badges: "Vollständig"/
 * "Unvollständig" (completeness - are all expected documents there) and
 * "Veröffentlicht"/"Teilweise veröffentlicht"/"Nicht veröffentlicht"
 * (publication - has the owner actually seen them) - a complete month can
 * still be entirely unpublished, and that must be visible without
 * expanding the card. Expanding reveals Eigentümerreporting, Rechnung and
 * Gutschrift as their own clearly labeled sections (never one merged
 * "Rechnung & Gutschrift" list - each file's real type must be visible at a
 * glance), Belege, and "Monat veröffentlichen" (spec point 8). A
 * "Rechnung-Gutschrift" file still awaiting classification gets its own
 * "Zu klassifizieren" section instead of being hidden - so the admin sees
 * exactly why a month is "Unvollständig".
 */
export function StatementMonthCard({ group, properties }: { group: AdminStatementMonthGroup; properties: AdminProperty[] }) {
  const [expanded, setExpanded] = useState(false);

  const coreDocumentCount = group.ownerReportDocuments.length + group.invoiceDocuments.length + group.creditNoteDocuments.length;
  const receiptCount = group.receiptDocuments.length;
  const totalCount = coreDocumentCount + receiptCount + group.needsClassificationDocuments.length;
  const isComplete = group.completeness.status === "complete";
  const publishBadge = statementMonthPublishStatusBadge(group.publishStatus);

  return (
    <div className="rounded-2xl border border-line p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-ink">
            {monthLabel(group.month)} {group.year}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {coreDocumentCount} Kerndokument{coreDocumentCount === 1 ? "" : "e"} · {receiptCount} Beleg{receiptCount === 1 ? "" : "e"}
            {group.needsClassificationDocuments.length > 0 ? ` · ${group.needsClassificationDocuments.length} zu klassifizieren` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <AdminStatusBadge label={isComplete ? "Vollständig" : "Unvollständig"} tone={isComplete ? "positive" : "strong"} />
          <AdminStatusBadge label={publishBadge.label} tone={publishBadge.tone} />
          <ChevronDownIcon className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
          {group.completeness.issues.length > 0 && (
            <ul className="list-inside list-disc text-xs text-ink-soft">
              {group.completeness.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}

          <CategorySection title="Eigentümerreporting" documents={group.ownerReportDocuments} properties={properties} />
          <CategorySection title="Rechnung" documents={group.invoiceDocuments} properties={properties} />
          <CategorySection title="Gutschrift" documents={group.creditNoteDocuments} properties={properties} />
          {group.needsClassificationDocuments.length > 0 && (
            <CategorySection title="Zu klassifizieren" documents={group.needsClassificationDocuments} properties={properties} />
          )}
          <CategorySection title="Belege" documents={group.receiptDocuments} properties={properties} emptyHint="Keine Belege für diesen Monat." />

          <div className="flex justify-end border-t border-line pt-4">
            <PublishStatementMonthButton
              propertyId={group.propertyId}
              year={group.year}
              month={group.month}
              coreDocumentCount={coreDocumentCount}
              receiptCount={receiptCount}
              completeness={group.completeness}
              disabled={totalCount === 0}
            />
          </div>
        </div>
      )}
    </div>
  );
}
