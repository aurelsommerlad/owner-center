import { DownloadIcon } from "@/components/ui/icons";
import type { StatementDocument } from "@/types";
import { isNewStatementDocument, statementDocumentDisplayTitle } from "@/lib/statementDocuments";
import { getDictionary, createTranslator, type Locale } from "@/i18n";

/**
 * One document, as compact as a title and a download action - no per-row
 * date, no download history (that's admin/backend-only tracking, not
 * something the owner needs to see here), and no "already downloaded"
 * variant: a download that already happened is not a different action for
 * the owner, still the same icon-only affordance either way. The "Neu" tag
 * is the one exception, kept dezent (existing green palette, no notification
 * color) since it's the one signal that actually distinguishes documents
 * within the same month.
 */
export function StatementDocumentRow({ document, locale = "de" }: { document: StatementDocument; locale?: Locale }) {
  const t = createTranslator(getDictionary(locale));
  const isNew = isNewStatementDocument(document);
  const label = statementDocumentDisplayTitle(document);

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
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
        aria-label={t("statements.download")}
        title={t("statements.download")}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
      >
        <DownloadIcon className="h-4 w-4" />
      </a>
    </div>
  );
}
