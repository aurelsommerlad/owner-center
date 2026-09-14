import { DocumentsIcon, DownloadIcon } from "@/components/ui/icons";
import type { StatementDocument } from "@/types";
import { isDownloadedStatementDocument, isNewStatementDocument, statementDocumentDisplayTitle } from "@/lib/statementDocuments";
import { getDictionary, createTranslator, type Locale } from "@/i18n";

/**
 * One document row. `primary` adds the circular document-icon badge used
 * for Eigentümerreporting rows; every row gets the labeled download action,
 * which switches to "Erneut herunterladen" once the document was already
 * downloaded (download-history dates themselves stay out of the owner UI).
 */
export function StatementDocumentRow({
  document,
  locale = "de",
  primary = false,
}: {
  document: StatementDocument;
  locale?: Locale;
  primary?: boolean;
}) {
  const t = createTranslator(getDictionary(locale));
  const isNew = isNewStatementDocument(document);
  const label = statementDocumentDisplayTitle(document);
  const downloadLabel = isDownloadedStatementDocument(document) ? t("statements.redownload") : t("statements.download");

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {primary && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#87977E]/12 text-[#52664E]">
            <DocumentsIcon className="h-4 w-4" />
          </span>
        )}
        <p className="min-w-0 truncate text-sm text-ink">{label}</p>
        {isNew && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#87977E]/12 px-2 py-0.5 text-[11px] font-medium text-[#52664E]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#87977E]" />
            {t("statements.new")}
          </span>
        )}
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
