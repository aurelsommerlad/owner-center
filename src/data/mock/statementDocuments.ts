import type { StatementDocument, StatementDocumentType } from "@/types";
import { addDays, monthLabel } from "@/lib/dates";

/**
 * Mock stand-in for the future Google Drive sync described in
 * services/statementDocumentService.ts. Real documents would live at
 * "Owner Center / Eigentümer / LÆKE / Abrechnungen / {year} / {month}" in
 * Drive, where a month's folder can hold any number of files; matching is
 * by ownerId + propertyId + year + month + documentType, never by fileName
 * alone, so `fileName` below is display-only.
 */
const OWNER_ID = "owner-schneider";
const PROPERTY_ID = "property-laeke";

interface DocumentSeed {
  year: number;
  month: number;
  documentType: StatementDocumentType;
  title: string;
  publishedAt: string;
  version?: number;
  updatedAt?: string | null;
  firstViewedAt?: string | null;
  firstDownloadedAt?: string | null;
  lastDownloadedAt?: string | null;
  downloadCount?: number;
}

/** Statements are published in the first days of the following month. */
function publishDateFor(year: number, month: number): string {
  const publishYear = month === 12 ? year + 1 : year;
  const publishMonth = month === 12 ? 1 : month + 1;
  return `${publishYear}-${String(publishMonth).padStart(2, "0")}-05`;
}

function monthlyStatementSeed(
  year: number,
  month: number,
  overrides: Partial<DocumentSeed> = {}
): DocumentSeed {
  return {
    year,
    month,
    documentType: "monthly_statement",
    title: `Monatsabrechnung ${monthLabel(month)} ${year}`,
    publishedAt: publishDateFor(year, month),
    ...overrides,
  };
}

const seeds2026: DocumentSeed[] = [
  monthlyStatementSeed(2026, 1, {
    firstViewedAt: "2026-02-10",
    firstDownloadedAt: "2026-02-10",
    lastDownloadedAt: "2026-02-10",
    downloadCount: 1,
  }),
  monthlyStatementSeed(2026, 2, {
    firstViewedAt: "2026-03-08",
    firstDownloadedAt: "2026-03-08",
    lastDownloadedAt: "2026-03-08",
    downloadCount: 1,
  }),
  monthlyStatementSeed(2026, 3, {
    firstViewedAt: "2026-04-07",
    firstDownloadedAt: "2026-04-07",
    lastDownloadedAt: "2026-04-20",
    downloadCount: 2,
  }),
  monthlyStatementSeed(2026, 4, {
    firstViewedAt: "2026-05-06",
    firstDownloadedAt: "2026-05-06",
    lastDownloadedAt: "2026-05-06",
    downloadCount: 1,
  }),
  monthlyStatementSeed(2026, 5, {
    firstViewedAt: "2026-06-09",
    firstDownloadedAt: "2026-06-09",
    lastDownloadedAt: "2026-06-09",
    downloadCount: 1,
  }),
  // A corrected version was published after the owner had already viewed
  // and downloaded the original - firstViewedAt predates updatedAt, so this
  // is treated as "Neu" again (see lib/statementDocuments.ts). Single
  // document for the month, still shown compact.
  monthlyStatementSeed(2026, 6, {
    version: 2,
    updatedAt: "2026-09-08",
    firstViewedAt: "2026-07-10",
    firstDownloadedAt: "2026-07-10",
    lastDownloadedAt: "2026-07-10",
    downloadCount: 1,
  }),
  // Single-document month - stays compact, no month-level document count.
  monthlyStatementSeed(2026, 7, {
    firstViewedAt: "2026-09-06",
    firstDownloadedAt: "2026-09-06",
    lastDownloadedAt: "2026-09-06",
    downloadCount: 1,
  }),
  // Newest month, three documents: the statement was viewed and downloaded
  // right away, a credit note followed a day later and was also seen, and
  // an additional invoice was added afterwards and is still unopened - only
  // that invoice (not the whole month) shows as "Neu".
  monthlyStatementSeed(2026, 8, {
    firstViewedAt: "2026-09-06",
    firstDownloadedAt: "2026-09-06",
    lastDownloadedAt: "2026-09-06",
    downloadCount: 1,
  }),
  {
    year: 2026,
    month: 8,
    documentType: "credit_note",
    title: "Gutschrift",
    publishedAt: "2026-09-06",
    firstViewedAt: "2026-09-07",
    firstDownloadedAt: "2026-09-07",
    lastDownloadedAt: "2026-09-07",
    downloadCount: 1,
  },
  {
    year: 2026,
    month: 8,
    documentType: "invoice",
    title: "Rechnung zusätzliche Leistungen",
    publishedAt: "2026-09-08",
  },
];

/** Older years: every statement already viewed and downloaded once, no corrections or extras. */
function pastYearSeeds(year: number): DocumentSeed[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const publishedAt = publishDateFor(year, month);
    const viewedAt = addDays(publishedAt, 3);
    return monthlyStatementSeed(year, month, {
      firstViewedAt: viewedAt,
      firstDownloadedAt: viewedAt,
      lastDownloadedAt: viewedAt,
      downloadCount: 1,
    });
  });
}

const seeds: DocumentSeed[] = [...seeds2026, ...pastYearSeeds(2025), ...pastYearSeeds(2024)];

export const mockStatementDocuments: StatementDocument[] = seeds.map((seed) => ({
  id: `statement-doc-${PROPERTY_ID}-${seed.year}-${String(seed.month).padStart(2, "0")}-${seed.documentType}`,
  ownerId: OWNER_ID,
  propertyId: PROPERTY_ID,
  year: seed.year,
  month: seed.month,
  documentType: seed.documentType,
  title: seed.title,
  fileName: `LAEKE_${seed.documentType}_${seed.year}-${String(seed.month).padStart(2, "0")}.pdf`,
  driveFileId: null,
  version: seed.version ?? 1,
  publishedAt: seed.publishedAt,
  updatedAt: seed.updatedAt ?? null,
  firstViewedAt: seed.firstViewedAt ?? null,
  firstDownloadedAt: seed.firstDownloadedAt ?? null,
  lastDownloadedAt: seed.lastDownloadedAt ?? null,
  downloadCount: seed.downloadCount ?? 0,
}));
