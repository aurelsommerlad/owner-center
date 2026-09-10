import { DocumentsIcon, DownloadIcon } from "@/components/ui/icons";
import type { StatementDocument } from "@/types";
import { formatShortDate } from "@/lib/format";
import {
  isDownloadedStatementDocument,
  isNewStatementDocument,
  statementDocumentDisplayTitle,
} from "@/lib/statementDocuments";

type Emphasis = "primary" | "standard" | "muted";

export function StatementDocumentRow({
  document,
  emphasis = "standard",
}: {
  document: StatementDocument;
  /**
   * "primary" - the month's Eigentümerreporting. "standard" - Rechnung /
   * Gutschrift, equally important but not the lead document. "muted" -
   * further ("other") documents, styled clearly more quietly.
   */
  emphasis?: Emphasis;
}) {
  const isNew = isNewStatementDocument(document);
  const isDownloaded = isDownloadedStatementDocument(document);
  const providedLabel = document.updatedAt
    ? `Aktualisiert am ${formatShortDate(document.updatedAt)}`
    : `Bereitgestellt ${formatShortDate(document.publishedAt)}`;
  const label = statementDocumentDisplayTitle(document);
  const downloadLabel = isDownloaded ? "Erneut herunterladen" : "Herunterladen";

  return (
    <div className={`flex items-center justify-between gap-4 ${emphasis === "muted" ? "py-2" : "py-3"}`}>
      <div className="flex min-w-0 items-start gap-3">
        {emphasis === "primary" && (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-dim text-ink-soft/70">
            <DocumentsIcon className="h-3.5 w-3.5" />
          </span>
        )}
        <div className="min-w-0">
          <p
            className={
              emphasis === "primary"
                ? "text-sm font-medium text-ink"
                : emphasis === "standard"
                  ? "text-sm text-ink"
                  : "text-xs text-ink-soft"
            }
          >
            {label}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-soft">
            <span>{providedLabel}</span>
            {isNew ? (
              <>
                <span aria-hidden="true" className="text-ink-soft/50">
                  ·
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#87977E]/12 px-2 py-0.5 text-[11px] font-medium text-[#52664E]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#87977E]" />
                  Neu
                </span>
              </>
            ) : (
              isDownloaded &&
              document.lastDownloadedAt && (
                <>
                  <span aria-hidden="true" className="text-ink-soft/50">
                    ·
                  </span>
                  <span>Heruntergeladen am {formatShortDate(document.lastDownloadedAt)}</span>
                </>
              )
            )}
          </div>
        </div>
      </div>

      {emphasis === "muted" ? (
        <button
          type="button"
          className="shrink-0 text-[11px] font-medium text-ink-soft underline decoration-ink-soft/40 underline-offset-2 transition-colors hover:text-ink"
        >
          {downloadLabel}
        </button>
      ) : (
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          {downloadLabel}
        </button>
      )}
    </div>
  );
}
