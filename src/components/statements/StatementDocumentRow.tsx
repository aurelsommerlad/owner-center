import { createElement } from "react";
import { DownloadIcon } from "@/components/ui/icons";
import type { StatementDocument } from "@/types";
import { formatShortDate } from "@/lib/format";
import {
  isDownloadedStatementDocument,
  isNewStatementDocument,
  statementDocumentDisplayTitle,
  statementDocumentIcon,
} from "@/lib/statementDocuments";
import { getDictionary, createTranslator, type Locale } from "@/i18n";

/**
 * One document row. The circular badge's icon varies by `documentType` (see
 * statementDocumentIcon) - Rechnung and Gutschrift get visually distinct
 * symbols so a month with several of each (e.g. after a cancellation)
 * stays tellable apart at a glance; Eigentümerreporting/Belege share the
 * generic document icon. The labeled download action switches to "Erneut
 * herunterladen" once the document was already downloaded. The subline
 * shows when it was provided and, once it stops being "Neu", when it was
 * last downloaded - the two states are mutually exclusive so the line never
 * grows to more than one fact.
 */
export function StatementDocumentRow({
  document,
  locale = "de",
}: {
  document: StatementDocument;
  locale?: Locale;
}) {
  const t = createTranslator(getDictionary(locale));
  const isNew = isNewStatementDocument(document);
  const isDownloaded = isDownloadedStatementDocument(document);
  const label = statementDocumentDisplayTitle(document);
  const icon = createElement(statementDocumentIcon(document.documentType), { className: "h-4 w-4" });
  const downloadLabel = isDownloaded ? t("statements.redownload") : t("statements.download");
  const providedLabel = document.updatedAt
    ? t("statements.updatedOn", { date: formatShortDate(document.updatedAt, locale) })
    : t("statements.providedOn", { date: formatShortDate(document.publishedAt, locale) });

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#87977E]/12 text-[#52664E]">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-sm text-ink">{label}</p>
            {isNew && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#87977E]/12 px-2 py-0.5 text-[11px] font-medium text-[#52664E]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#87977E]" />
                {t("statements.new")}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-ink-soft">
            {providedLabel}
            {!isNew && isDownloaded && document.lastDownloadedAt && (
              <> · {t("statements.downloadedOn", { date: formatShortDate(document.lastDownloadedAt, locale) })}</>
            )}
          </p>
        </div>
      </div>
      <a
        href={`/api/documents/${document.id}/download`}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        {downloadLabel}
      </a>
    </div>
  );
}
