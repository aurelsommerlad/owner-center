import { DocumentsIcon, DownloadIcon } from "@/components/ui/icons";
import type { StatementDocument } from "@/types";
import { formatShortDate } from "@/lib/format";
import {
  isDownloadedStatementDocument,
  isNewStatementDocument,
  statementDocumentDisplayTitle,
} from "@/lib/statementDocuments";

export function StatementDocumentRow({
  document,
  emphasis = "primary",
}: {
  document: StatementDocument;
  /** "primary" is the month's main statement; "secondary" is everything else, styled more quietly. */
  emphasis?: "primary" | "secondary";
}) {
  const isNew = isNewStatementDocument(document);
  const isDownloaded = isDownloadedStatementDocument(document);
  const providedLabel = document.updatedAt
    ? `Aktualisiert am ${formatShortDate(document.updatedAt)}`
    : `Bereitgestellt am ${formatShortDate(document.publishedAt)}`;
  const label = statementDocumentDisplayTitle(document);

  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-3 sm:w-56 sm:shrink-0">
        {emphasis === "primary" ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-dim text-ink-soft/70">
            <DocumentsIcon className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-soft/40" />
          </span>
        )}
        <p className={emphasis === "primary" ? "text-sm font-medium text-ink" : "text-sm text-ink-soft"}>{label}</p>
      </div>

      <div className="flex-1 text-xs text-ink-soft">
        <p>{providedLabel}</p>
        {isDownloaded && document.lastDownloadedAt && (
          <p className="mt-0.5">Heruntergeladen am {formatShortDate(document.lastDownloadedAt)}</p>
        )}
      </div>

      <div className="flex items-center gap-4 sm:shrink-0">
        {isNew ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#87977E]/12 px-2.5 py-1 text-[11px] font-medium text-[#52664E]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#87977E]" />
            Neu
          </span>
        ) : (
          <span className="px-2.5 text-[11px] font-medium text-ink-soft">Gesehen</span>
        )}

        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          Herunterladen
        </button>
      </div>
    </div>
  );
}
