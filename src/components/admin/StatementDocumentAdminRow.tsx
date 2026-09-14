"use client";

import { useState } from "react";
import { DocumentRow } from "./DocumentRow";
import { statementStatusBadge } from "./AdminStatusBadge";
import { StatementDocumentReviewModal } from "./StatementDocumentReviewModal";
import { ADMIN_DOCUMENT_TYPE_LABEL } from "@/lib/adminLabels";
import { monthLabel } from "@/lib/dates";
import { formatShortDate } from "@/lib/format";
import type { AdminProperty, AdminStatementDocument } from "@/types/admin";

/** One row on /admin/statements, plus the "Prüfen" review modal it opens - see spec point 9/10. */
export function StatementDocumentAdminRow({
  document,
  propertyName,
  ownerName,
  properties,
}: {
  document: AdminStatementDocument;
  propertyName: string;
  ownerName: string;
  properties: AdminProperty[];
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const badge = statementStatusBadge(document.adminStatus);
  const providedLabel = document.publishedAt
    ? `Bereitgestellt ${formatShortDate(document.publishedAt)}`
    : "Noch nicht bereitgestellt";

  return (
    <>
      <DocumentRow
        title={ADMIN_DOCUMENT_TYPE_LABEL[document.documentType]}
        subtitle={document.title}
        meta={[propertyName, ownerName, `${monthLabel(document.month)} ${document.year}`, document.fileName, providedLabel]}
        status={badge}
        trailing={
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end gap-0.5 text-[11px] text-ink-soft sm:flex">
              <span>Version {document.version}</span>
              <span>
                {document.firstViewedAt ? "gesehen" : "ungesehen"} ·{" "}
                {document.downloadCount > 0 ? `${document.downloadCount}× heruntergeladen` : "nicht heruntergeladen"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              Prüfen
            </button>
          </div>
        }
      />
      <StatementDocumentReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        document={document}
        properties={properties}
      />
    </>
  );
}
