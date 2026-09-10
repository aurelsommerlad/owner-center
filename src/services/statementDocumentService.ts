import type { StatementDocument } from "@/types";
import { mockStatementDocuments } from "@/data/mock";

/**
 * Statement documents for a property/year - a flat list, since a month can
 * hold any number of documents (Eigentümerreporting, Rechnung, Gutschrift -
 * the three fachlich defined ones - plus any number of further "other"
 * files). Group by month with
 * lib/statementDocuments.ts#groupStatementDocumentsByMonth before rendering.
 *
 * This is the seam the later Google Drive sync replaces: instead of
 * filtering the in-memory mock array, it would resolve
 * ownerId + propertyId + year + month against Drive's
 * "Owner Center / Eigentümer / {Property} / Abrechnungen / {year} / {month}"
 * folder - which may contain any number of files, not exactly three - and
 * return the same StatementDocument[] shape, filling in a real
 * `driveFileId` per file. The authorization check - that the caller's
 * ownerId is actually entitled to this propertyId - belongs here, on the
 * server side, once this stops being mock data; it must not be enforced by
 * the frontend alone, and a signed, time-limited download should be issued
 * per request rather than a public Drive link.
 */
export async function getStatementDocuments(
  propertyId: string,
  year: number
): Promise<StatementDocument[]> {
  return mockStatementDocuments
    .filter((document) => document.propertyId === propertyId && document.year === year)
    .sort((a, b) => b.month - a.month);
}

/** Years that have at least one statement for this property, newest first. */
export async function getStatementDocumentYears(propertyId: string): Promise<number[]> {
  const years = new Set(
    mockStatementDocuments
      .filter((document) => document.propertyId === propertyId)
      .map((document) => document.year)
  );
  return Array.from(years).sort((a, b) => b - a);
}
