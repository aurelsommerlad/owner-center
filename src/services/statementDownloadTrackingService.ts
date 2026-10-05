import "server-only";
import { prisma } from "@/server/db";
import type { AccountingDownloadEvent } from "@/lib/statementDocuments";

/**
 * The one place a statement-document download is ever recorded - both the
 * existing aggregate fields on StatementDocument (downloadCount/
 * firstDownloadedAt/lastDownloadedAt, unchanged, still what drives the
 * owner-facing "Heruntergeladen am" badge) and the new per-event
 * StatementDocumentDownload log (which additionally attributes the download
 * to the specific OwnerUser who performed it - owner or restricted
 * accounting access alike). Called from exactly one place,
 * api/documents/[id]/download/route.ts, and only AFTER that route has
 * already passed every authorization check and successfully streamed the
 * file from Drive - see that route's own doc comment. A failed or
 * unauthorized download never reaches this function, so it can never be
 * counted.
 */
export async function recordStatementDocumentDownload(
  documentId: string,
  ownerUserId: string,
  currentFirstDownloadedAt: Date | null
): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.statementDocument.update({
      where: { id: documentId },
      data: {
        downloadCount: { increment: 1 },
        firstDownloadedAt: currentFirstDownloadedAt ?? now,
        lastDownloadedAt: now,
      },
    }),
    prisma.statementDocumentDownload.create({
      data: { documentId, ownerUserId, downloadedAt: now },
    }),
  ]);
}

/**
 * Every accounting-access download event for the given documents - the raw
 * data lib/statementDocuments.ts#computeDocumentAccountingDownloadStatus and
 * computeMonthAccountingDownloadStatus derive the Abrechnungen page's
 * "Buchhaltung: heruntergeladen"-style badges from. Filtered to
 * `ownerUser.role === "accounting"` at the query level, so an owner's own
 * download of the very same document (role "owner") can never be mistaken
 * for - or silently count toward - an accounting-access download.
 */
export async function getAccountingDownloadEvents(documentIds: string[]): Promise<AccountingDownloadEvent[]> {
  if (documentIds.length === 0) return [];
  const rows = await prisma.statementDocumentDownload.findMany({
    where: { documentId: { in: documentIds }, ownerUser: { role: "accounting" } },
    select: { documentId: true, ownerUserId: true, downloadedAt: true },
    orderBy: { downloadedAt: "asc" },
  });
  return rows.map((row) => ({
    documentId: row.documentId,
    ownerUserId: row.ownerUserId,
    downloadedAt: row.downloadedAt.toISOString(),
  }));
}

/**
 * The most recent download by one specific accounting-access grant, across
 * every document it has ever downloaded - shown as "Zuletzt heruntergeladen"
 * on its row in the Abrechnungen page's "Zugang für Buchhaltung" section
 * (see components/statements/AccountingAccessRow.tsx). No property/document
 * filtering needed: a StatementDocumentDownload row can only exist for a
 * download that was already authorized at the time it happened.
 */
export async function getLastAccountingDownloadAt(ownerUserId: string): Promise<string | undefined> {
  const row = await prisma.statementDocumentDownload.findFirst({
    where: { ownerUserId },
    orderBy: { downloadedAt: "desc" },
    select: { downloadedAt: true },
  });
  return row ? row.downloadedAt.toISOString() : undefined;
}
