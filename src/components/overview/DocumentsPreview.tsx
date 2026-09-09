import Link from "next/link";
import type { OwnerDocument } from "@/types";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon, DocumentsIcon, DownloadIcon } from "@/components/ui/icons";
import { formatShortDate } from "@/lib/format";

export function DocumentsPreview({
  documents,
  propertyId,
}: {
  documents: OwnerDocument[];
  propertyId: string;
}) {
  return (
    <Card className="p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl italic text-ink">Dokumente</h2>
        <Link
          href={`/${propertyId}/dokumente`}
          className="flex items-center gap-1 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Alle Dokumente
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 divide-y divide-line">
        {documents.map((document) => (
          <div key={document.id} className="flex items-center justify-between gap-3 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-dim text-ink-soft">
                <DocumentsIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{document.name}</p>
                <p className="mt-0.5 text-xs text-ink-soft">{formatShortDate(document.date)}</p>
              </div>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink hover:text-ink"
              aria-label={`${document.name} herunterladen`}
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
