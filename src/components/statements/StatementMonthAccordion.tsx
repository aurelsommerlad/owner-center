"use client";

import { useState } from "react";
import type { StatementMonthGroup as StatementMonthGroupData } from "@/lib/statementDocuments";
import {
  statementMonthGroupLabel,
  statementMonthIsComplete,
  statementMonthProvided,
} from "@/lib/statementDocuments";
import { StatementDocumentRow } from "./StatementDocumentRow";
import { ChevronDownIcon } from "@/components/ui/icons";
import { formatShortDate } from "@/lib/format";
import type { StatementDocument } from "@/types";
import { getDictionary, createTranslator, type Locale } from "@/i18n";

/** One category within an expanded month - a heading plus its rows, omitted entirely when empty. */
function DocumentSection({ title, documents }: { title: string; documents: StatementDocument[] }) {
  if (documents.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-soft/70">{title}</p>
      <div className="mt-1 flex flex-col divide-y divide-line/60">
        {documents.map((document) => (
          <StatementDocumentRow key={document.id} document={document} />
        ))}
      </div>
    </div>
  );
}

/**
 * One property/year's one statement month - the central unit the
 * Abrechnungen page renders. Collapsed by default (the page decides which
 * single month, if any, starts open); expanding reveals Eigentümerreporting
 * and Abrechnung (Rechnung+Gutschrift together, each row still individually
 * labeled by its own real type) as their own sections, plus Belege behind
 * its own "N Belege anzeigen" toggle - never listed open by default, and
 * the whole section is omitted when there are none.
 */
export function StatementMonthAccordion({
  group,
  locale = "de",
  defaultOpen = false,
}: {
  group: StatementMonthGroupData;
  locale?: Locale;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const t = createTranslator(getDictionary(locale));

  const isComplete = statementMonthIsComplete(group);
  const provided = statementMonthProvided(group);
  const settlementDocuments = [...group.invoiceDocuments, ...group.creditNoteDocuments];
  const receiptCount = group.receiptDocuments.length;
  const receiptNoun = t(receiptCount === 1 ? "statements.otherDocument" : "statements.otherDocuments");

  return (
    <div className="py-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink">
            {statementMonthGroupLabel(group, locale)}
            {group.newCount > 0 && (
              <span className="text-xs font-medium text-[#52664E]">{t("statements.newSuffix", { count: group.newCount })}</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {group.documentCount} {group.documentCount === 1 ? t("statements.documentSingular") : t("statements.documentsPlural")}
            {provided &&
              ` · ${
                provided.wasUpdated
                  ? t("statements.updatedOn", { date: formatShortDate(provided.date, locale) })
                  : t("statements.providedOn", { date: formatShortDate(provided.date, locale) })
              }`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {isComplete && <span className="text-xs font-medium text-[#52664E]">{t("statements.complete")}</span>}
          <ChevronDownIcon className={`h-4 w-4 text-ink-soft transition-transform ${open ? "rotate-180" : "-rotate-90"}`} />
        </div>
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-4">
          <DocumentSection title={t("statements.ownerReport")} documents={group.ownerReportDocuments} />
          <DocumentSection title={t("statements.settlement")} documents={settlementDocuments} />

          {receiptCount > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-ink-soft/70">{t("statements.otherDocuments")}</p>
              {receiptsOpen ? (
                <div className="mt-1 flex flex-col divide-y divide-line/60">
                  {group.receiptDocuments.map((document) => (
                    <StatementDocumentRow key={document.id} document={document} />
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setReceiptsOpen(true)}
                  className="mt-1 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  {t("statements.showReceipts", { count: receiptCount, noun: receiptNoun })}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
