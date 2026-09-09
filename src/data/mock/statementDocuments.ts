import type { StatementDocument } from "@/types";
import { addDays } from "@/lib/dates";

/**
 * Mock stand-in for the future Google Drive sync described in
 * services/statementDocumentService.ts. Real documents would live at
 * "Owner Center / Eigentümer / LÆKE / Abrechnungen / {year} / {month}" in
 * Drive; matching is by ownerId + propertyId + year + month, never by
 * fileName alone, so `fileName` below is display-only.
 */
const OWNER_ID = "owner-schneider";
const PROPERTY_ID = "property-laeke";

interface DocumentSeed {
  year: number;
  month: number;
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

const seeds2026: DocumentSeed[] = [
  {
    year: 2026,
    month: 1,
    publishedAt: publishDateFor(2026, 1),
    firstViewedAt: "2026-02-10",
    firstDownloadedAt: "2026-02-10",
    lastDownloadedAt: "2026-02-10",
    downloadCount: 1,
  },
  {
    year: 2026,
    month: 2,
    publishedAt: publishDateFor(2026, 2),
    firstViewedAt: "2026-03-08",
    firstDownloadedAt: "2026-03-08",
    lastDownloadedAt: "2026-03-08",
    downloadCount: 1,
  },
  {
    year: 2026,
    month: 3,
    publishedAt: publishDateFor(2026, 3),
    firstViewedAt: "2026-04-07",
    firstDownloadedAt: "2026-04-07",
    lastDownloadedAt: "2026-04-20",
    downloadCount: 2,
  },
  {
    year: 2026,
    month: 4,
    publishedAt: publishDateFor(2026, 4),
    firstViewedAt: "2026-05-06",
    firstDownloadedAt: "2026-05-06",
    lastDownloadedAt: "2026-05-06",
    downloadCount: 1,
  },
  {
    year: 2026,
    month: 5,
    publishedAt: publishDateFor(2026, 5),
    firstViewedAt: "2026-06-09",
    firstDownloadedAt: "2026-06-09",
    lastDownloadedAt: "2026-06-09",
    downloadCount: 1,
  },
  // A corrected version was published after the owner had already viewed
  // and downloaded the original - firstViewedAt predates updatedAt, so this
  // is treated as "Neu" again (see lib/statementDocuments.ts).
  {
    year: 2026,
    month: 6,
    publishedAt: publishDateFor(2026, 6),
    version: 2,
    updatedAt: "2026-09-08",
    firstViewedAt: "2026-07-10",
    firstDownloadedAt: "2026-07-10",
    lastDownloadedAt: "2026-07-10",
    downloadCount: 1,
  },
  {
    year: 2026,
    month: 7,
    publishedAt: publishDateFor(2026, 7),
    firstViewedAt: "2026-09-06",
    firstDownloadedAt: "2026-09-06",
    lastDownloadedAt: "2026-09-06",
    downloadCount: 1,
  },
  // Newest month: just published, not opened yet - shows as "Neu".
  {
    year: 2026,
    month: 8,
    publishedAt: publishDateFor(2026, 8),
  },
];

/** Older years: every statement already viewed and downloaded once, no corrections. */
function pastYearSeeds(year: number): DocumentSeed[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const publishedAt = publishDateFor(year, month);
    const viewedAt = addDays(publishedAt, 3);
    return {
      year,
      month,
      publishedAt,
      firstViewedAt: viewedAt,
      firstDownloadedAt: viewedAt,
      lastDownloadedAt: viewedAt,
      downloadCount: 1,
    };
  });
}

const seeds: DocumentSeed[] = [...seeds2026, ...pastYearSeeds(2025), ...pastYearSeeds(2024)];

export const mockStatementDocuments: StatementDocument[] = seeds.map((seed) => ({
  id: `statement-doc-${PROPERTY_ID}-${seed.year}-${String(seed.month).padStart(2, "0")}`,
  ownerId: OWNER_ID,
  propertyId: PROPERTY_ID,
  year: seed.year,
  month: seed.month,
  title: "Monatsabrechnung",
  fileName: `LAEKE_Monatsabrechnung_${seed.year}-${String(seed.month).padStart(2, "0")}.pdf`,
  driveFileId: null,
  version: seed.version ?? 1,
  publishedAt: seed.publishedAt,
  updatedAt: seed.updatedAt ?? null,
  firstViewedAt: seed.firstViewedAt ?? null,
  firstDownloadedAt: seed.firstDownloadedAt ?? null,
  lastDownloadedAt: seed.lastDownloadedAt ?? null,
  downloadCount: seed.downloadCount ?? 0,
}));
