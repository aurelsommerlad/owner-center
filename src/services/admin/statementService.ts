import type { AdminStatementDocument, AdminStatementStatus } from "@/types/admin";
import { adminStatementDocuments } from "@/data/admin";

export interface StatementDocumentFilters {
  propertyId?: string;
  year?: number;
  month?: number;
  status?: AdminStatementStatus;
}

export async function getStatementDocuments(filters: StatementDocumentFilters = {}): Promise<AdminStatementDocument[]> {
  return adminStatementDocuments
    .filter((doc) => !filters.propertyId || doc.propertyId === filters.propertyId)
    .filter((doc) => !filters.year || doc.year === filters.year)
    .filter((doc) => !filters.month || doc.month === filters.month)
    .filter((doc) => !filters.status || doc.adminStatus === filters.status)
    .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));
}

/** Years present in the statement archive, newest first - for the year filter. */
export async function getStatementDocumentYears(): Promise<number[]> {
  return Array.from(new Set(adminStatementDocuments.map((doc) => doc.year))).sort((a, b) => b - a);
}

/** How many documents were actually published during the given month (by publishedAt, not by the statement's own period). */
export async function countPublishedInMonth(year: number, month: number): Promise<number> {
  return adminStatementDocuments.filter((doc) => {
    if (!doc.publishedAt) return false;
    const [publishedYear, publishedMonth] = doc.publishedAt.split("-").map(Number);
    return publishedYear === year && publishedMonth === month;
  }).length;
}
