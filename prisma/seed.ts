import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/server/passwordCore";

/**
 * Seeds the database with the same owners/users/properties/access
 * that the previous mock-data step used, plus a realistic statement- and
 * general-document archive - so the existing UI keeps working with the same
 * example data, now served from the real database instead of in-memory
 * arrays. Run via `npm run db:seed` (or `npm run db:reset` to wipe + reseed).
 *
 * Deliberately does NOT touch admin accounts: it only ever deletes/recreates
 * `role: "owner"` Users (and everything that cascades from Owner/Property).
 * The one admin account is created exactly once by `npm run seed:admin`
 * (see prisma/seedAdmin.ts) - re-running this demo seed must never wipe or
 * recreate it, since that is the "no public admin registration" boundary.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const OWNER_PASSWORD = "owner-2026";

function d(value: string): Date {
  return new Date(value);
}

async function main() {
  console.log("Seeding database...");

  // Wipe in FK-safe order so this script is re-runnable (`npm run db:reset`).
  // Sessions are wiped entirely (harmless - everyone just has to log in
  // again); Users are wiped only for role "owner", so an already-bootstrapped
  // admin account survives a reseed untouched.
  await prisma.generalDocument.deleteMany();
  await prisma.statementDocument.deleteMany();
  await prisma.ownerPropertyAccess.deleteMany();
  await prisma.ownerUser.deleteMany();
  await prisma.property.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany({ where: { role: "owner" } });

  // --- Properties --------------------------------------------------------
  // property-laeke keeps this exact id: src/data/mock/{units,reservations,
  // statements}.ts (reservations/occupancy/statistics - explicitly NOT part
  // of this DB migration, see prisma/schema.prisma's header comment) still
  // hardcode "property-laeke" as a literal propertyId.
  const laeke = await prisma.property.create({
    data: {
      id: "property-laeke",
      name: "LÆKE",
      city: "Lindau",
      region: "Bodensee",
      status: "active",
      apaleoPropertyId: "LAEKE",
      statementsDriveFolderId: "drive-laeke-statements",
      documentsDriveFolderId: "drive-laeke-documents",
      createdAt: d("2024-01-10"),
      updatedAt: d("2026-08-20"),
    },
  });
  const hoev = await prisma.property.create({
    data: {
      id: "property-hoev",
      name: "HØV",
      city: "Altusried",
      region: "Allgäu",
      status: "active",
      apaleoPropertyId: "ALTUS",
      statementsDriveFolderId: "drive-hoev-statements",
      documentsDriveFolderId: "drive-hoev-documents",
      createdAt: d("2024-06-01"),
      updatedAt: d("2026-07-15"),
    },
  });
  const alpila = await prisma.property.create({
    data: {
      id: "property-alpila",
      name: "ΛLPILΛ",
      city: "Gaschurn",
      region: "Montafon",
      status: "active",
      apaleoPropertyId: "ALPILA",
      createdAt: d("2026-08-25"),
      updatedAt: d("2026-08-25"),
    },
  });
  const husle = await prisma.property.create({
    data: {
      id: "property-husle",
      name: "HŪSLE",
      city: "Bludenz",
      region: "Vorarlberg",
      status: "active",
      apaleoPropertyId: "HUESLE",
      createdAt: d("2026-09-01"),
      updatedAt: d("2026-09-01"),
    },
  });

  // --- Owners + OwnerUsers (logins) --------------------------------------
  const schneider = await prisma.owner.create({
    data: {
      id: "owner-schneider",
      name: "Familie Schneider",
      companyName: "Schneider Immobilien GmbH",
      status: "active",
      createdAt: d("2024-01-15"),
      updatedAt: d("2024-01-15"),
    },
  });
  const berger = await prisma.owner.create({
    data: {
      id: "owner-berger",
      name: "Dr. Anna Berger",
      companyName: "Berger Capital Living GmbH",
      status: "active",
      createdAt: d("2024-06-02"),
      updatedAt: d("2024-06-02"),
    },
  });
  const thalberg = await prisma.owner.create({
    data: {
      id: "owner-thalberg",
      name: "Michael Thalberg",
      companyName: "Thalberg Invest",
      status: "inactive",
      createdAt: d("2025-02-20"),
      updatedAt: d("2025-11-12"),
    },
  });

  async function createOwnerLogin(input: {
    ownerId: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string;
  }) {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: hashPassword(OWNER_PASSWORD),
        role: "owner",
      },
    });
    await prisma.ownerUser.create({
      data: {
        ownerId: input.ownerId,
        userId: user.id,
        firstName: input.firstName,
        lastName: input.lastName,
        status: input.status,
        createdAt: d(input.createdAt),
        updatedAt: d(input.updatedAt),
        lastLoginAt: d(input.lastLoginAt),
      },
    });
  }

  await createOwnerLogin({
    ownerId: schneider.id,
    firstName: "Julia",
    lastName: "Schneider",
    email: "j.schneider@example.com",
    status: "active",
    createdAt: "2024-01-15",
    updatedAt: "2024-01-15",
    lastLoginAt: "2026-09-08",
  });
  await createOwnerLogin({
    ownerId: schneider.id,
    firstName: "Markus",
    lastName: "Schneider",
    email: "m.schneider@example.com",
    status: "active",
    createdAt: "2024-03-01",
    updatedAt: "2024-03-01",
    lastLoginAt: "2026-08-30",
  });
  await createOwnerLogin({
    ownerId: berger.id,
    firstName: "Anna",
    lastName: "Berger",
    email: "a.berger@example.com",
    status: "active",
    createdAt: "2024-06-02",
    updatedAt: "2024-06-02",
    lastLoginAt: "2026-09-05",
  });
  await createOwnerLogin({
    ownerId: thalberg.id,
    firstName: "Michael",
    lastName: "Thalberg",
    email: "m.thalberg@example.com",
    status: "inactive",
    createdAt: "2025-02-20",
    updatedAt: "2025-11-12",
    lastLoginAt: "2025-11-12",
  });

  // --- OwnerPropertyAccess -----------------------------------------------
  // ΛLPILΛ deliberately linked to two owners (many-to-many, no 1:1
  // assumption). Schneider<->HØV is deliberately "inactive": a previously
  // granted, since-revoked access - proof that access is soft-revoked
  // rather than deleted.
  await prisma.ownerPropertyAccess.createMany({
    data: [
      { ownerId: schneider.id, propertyId: laeke.id, status: "active", createdAt: d("2024-01-10") },
      { ownerId: schneider.id, propertyId: alpila.id, status: "active", createdAt: d("2026-08-25") },
      { ownerId: schneider.id, propertyId: hoev.id, status: "inactive", createdAt: d("2024-02-01") },
      { ownerId: berger.id, propertyId: hoev.id, status: "active", createdAt: d("2024-06-01") },
      { ownerId: berger.id, propertyId: alpila.id, status: "active", createdAt: d("2026-08-25") },
      { ownerId: thalberg.id, propertyId: husle.id, status: "active", createdAt: d("2026-09-01") },
    ],
  });

  // --- StatementDocuments --------------------------------------------------
  await seedStatementDocuments(schneider.id, laeke.id, hoev.id, berger.id);

  // --- GeneralDocuments ----------------------------------------------------
  await prisma.generalDocument.createMany({
    data: [
      {
        title: "Eigentümervertrag LÆKE",
        category: "vertrag",
        propertyId: laeke.id,
        ownerId: schneider.id,
        fileName: "LAEKE_Eigentuemervertrag.pdf",
        status: "published",
        publishedAt: d("2024-03-12"),
        createdAt: d("2024-03-12"),
      },
      {
        title: "Hausordnung LÆKE",
        category: "objektunterlage",
        propertyId: laeke.id,
        ownerId: schneider.id,
        fileName: "LAEKE_Hausordnung.pdf",
        status: "published",
        publishedAt: d("2024-03-12"),
        createdAt: d("2024-03-12"),
      },
      {
        title: "Steuerbescheinigung 2025",
        category: "steuerunterlage",
        propertyId: laeke.id,
        ownerId: schneider.id,
        fileName: "LAEKE_Steuerbescheinigung_2025.pdf",
        status: "published",
        publishedAt: d("2026-01-30"),
        createdAt: d("2026-01-30"),
      },
      {
        title: "Versicherungspolice HØV",
        category: "versicherung",
        propertyId: hoev.id,
        ownerId: berger.id,
        fileName: "HOEV_Versicherungspolice.pdf",
        status: "published",
        publishedAt: d("2024-06-10"),
        createdAt: d("2024-06-10"),
      },
      {
        title: "Grundrisse ΛLPILΛ",
        category: "objektunterlage",
        propertyId: alpila.id,
        // Property is jointly held (Schneider + Berger) - not yet assigned
        // to a single owner, hence the missing-assignment hint on the admin
        // dashboard.
        ownerId: null,
        fileName: "ALPILA_Grundrisse.pdf",
        status: "draft",
        publishedAt: null,
        createdAt: d("2026-08-28"),
      },
      {
        title: "Neue Unterlage (unsortiert)",
        category: "sonstiges",
        propertyId: null,
        ownerId: null,
        fileName: "Scan_2026-09-07.pdf",
        status: "draft",
        publishedAt: null,
        createdAt: d("2026-09-07"),
      },
    ],
  });

  console.log("Seed complete.");
  console.log("");
  console.log("Demo owner logins (Owner Center, /login):");
  console.log(`  j.schneider@example.com / ${OWNER_PASSWORD}  (role: owner, LÆKE + ΛLPILΛ)`);
  console.log(`  m.schneider@example.com / ${OWNER_PASSWORD}  (role: owner, LÆKE + ΛLPILΛ)`);
  console.log(`  a.berger@example.com / ${OWNER_PASSWORD}  (role: owner, HØV + ΛLPILΛ)`);
  console.log(`  m.thalberg@example.com / ${OWNER_PASSWORD}  (role: owner, deactivated - login blocked)`);
  console.log("");
  console.log("No admin account is created here - run `npm run seed:admin` (see .env.example).");
}

/** 1-12 */
function monthLabel(month: number): string {
  const labels = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];
  return labels[month - 1];
}

function publishDateFor(year: number, month: number): string {
  const publishYear = month === 12 ? year + 1 : year;
  const publishMonth = month === 12 ? 1 : month + 1;
  return `${publishYear}-${String(publishMonth).padStart(2, "0")}-05`;
}

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

interface StatementSeed {
  ownerId: string;
  propertyId: string;
  year: number;
  month: number;
  documentType: string;
  title: string;
  fileName: string;
  version?: number;
  adminStatus: string;
  publishedAt: string | null;
  updatedAt?: string | null;
  firstViewedAt?: string | null;
  firstDownloadedAt?: string | null;
  lastDownloadedAt?: string | null;
  downloadCount?: number;
}

/**
 * Ports the previous statement-document mock data (both the Owner Center's
 * multi-year LÆKE archive and admin's smaller multi-status HØV set) into one
 * seed, so both /abrechnungen (owner-facing, published/updated only) and
 * /admin/statements (every adminStatus) show the same example data as
 * before.
 */
async function seedStatementDocuments(schneiderId: string, laekeId: string, hoevId: string, bergerId: string) {
  function ownerReport(year: number, month: number, overrides: Partial<StatementSeed> = {}): StatementSeed {
    return {
      ownerId: schneiderId,
      propertyId: laekeId,
      year,
      month,
      documentType: "owner_report",
      title: `Eigentümerreporting ${monthLabel(month)} ${year}`,
      fileName: `LAEKE_owner_report_${year}-${String(month).padStart(2, "0")}.pdf`,
      adminStatus: "published",
      publishedAt: publishDateFor(year, month),
      ...overrides,
    };
  }

  const seeds2026: StatementSeed[] = [
    ownerReport(2026, 1, {
      firstViewedAt: "2026-02-10", firstDownloadedAt: "2026-02-10", lastDownloadedAt: "2026-02-10", downloadCount: 1,
    }),
    ownerReport(2026, 2, {
      firstViewedAt: "2026-03-08", firstDownloadedAt: "2026-03-08", lastDownloadedAt: "2026-03-08", downloadCount: 1,
    }),
    ownerReport(2026, 3, {
      firstViewedAt: "2026-04-07", firstDownloadedAt: "2026-04-07", lastDownloadedAt: "2026-04-20", downloadCount: 2,
    }),
    ownerReport(2026, 4, {
      firstViewedAt: "2026-05-06", firstDownloadedAt: "2026-05-06", lastDownloadedAt: "2026-05-06", downloadCount: 1,
    }),
    ownerReport(2026, 5, {
      firstViewedAt: "2026-06-09", firstDownloadedAt: "2026-06-09", lastDownloadedAt: "2026-06-09", downloadCount: 1,
    }),
    // Corrected version published after the owner had already viewed/downloaded the original.
    ownerReport(2026, 6, {
      version: 2, adminStatus: "updated", updatedAt: "2026-09-08",
      firstViewedAt: "2026-07-10", firstDownloadedAt: "2026-07-10", lastDownloadedAt: "2026-07-10", downloadCount: 1,
    }),
    ownerReport(2026, 7, {
      firstViewedAt: "2026-08-06", firstDownloadedAt: "2026-08-06", lastDownloadedAt: "2026-08-06", downloadCount: 1,
    }),
    {
      ownerId: schneiderId, propertyId: laekeId, year: 2026, month: 7, documentType: "other",
      title: "Ergänzende Unterlage", fileName: "LAEKE_other_2026-07.pdf",
      adminStatus: "published", publishedAt: "2026-09-01",
    },
    // Newest month: fresh unread report, already-downloaded invoice, seen-but-not-downloaded credit note.
    ownerReport(2026, 8),
    {
      ownerId: schneiderId, propertyId: laekeId, year: 2026, month: 8, documentType: "invoice",
      title: "Rechnung August 2026", fileName: "LAEKE_invoice_2026-08.pdf",
      adminStatus: "published", publishedAt: "2026-09-05",
      firstViewedAt: "2026-09-06", firstDownloadedAt: "2026-09-06", lastDownloadedAt: "2026-09-06", downloadCount: 1,
    },
    {
      ownerId: schneiderId, propertyId: laekeId, year: 2026, month: 8, documentType: "credit_note",
      title: "Gutschrift August 2026", fileName: "LAEKE_credit_note_2026-08.pdf",
      adminStatus: "published", publishedAt: "2026-09-05",
      firstViewedAt: "2026-09-06",
    },
    // September not yet published - a draft, invisible to the owner.
    {
      ownerId: schneiderId, propertyId: laekeId, year: 2026, month: 9, documentType: "owner_report",
      title: "Eigentümerreporting September 2026", fileName: "LAEKE_owner_report_2026-09.pdf",
      adminStatus: "draft", publishedAt: null,
    },
  ];

  function pastYearSeeds(year: number): StatementSeed[] {
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const publishedAt = publishDateFor(year, month);
      const viewedAt = addDays(publishedAt, 3);
      return ownerReport(year, month, {
        firstViewedAt: viewedAt, firstDownloadedAt: viewedAt, lastDownloadedAt: viewedAt, downloadCount: 1,
      });
    });
  }

  // A small hand-picked HØV/Berger set spanning every adminStatus, so the
  // admin statements screen has more than one owner/property represented.
  const hoevSeeds: StatementSeed[] = [
    {
      ownerId: bergerId, propertyId: hoevId, year: 2026, month: 9, documentType: "owner_report",
      title: "Eigentümerreporting September 2026", fileName: "HOEV_owner_report_2026-09.pdf",
      adminStatus: "ready", publishedAt: null,
    },
    {
      ownerId: bergerId, propertyId: hoevId, year: 2026, month: 8, documentType: "owner_report",
      title: "Eigentümerreporting August 2026", fileName: "HOEV_owner_report_2026-08.pdf",
      adminStatus: "published", publishedAt: "2026-09-06",
      firstViewedAt: "2026-09-07", firstDownloadedAt: "2026-09-07", lastDownloadedAt: "2026-09-07", downloadCount: 1,
    },
    {
      ownerId: bergerId, propertyId: hoevId, year: 2026, month: 8, documentType: "invoice",
      title: "Rechnung August 2026", fileName: "HOEV_invoice_2026-08.pdf",
      version: 2, adminStatus: "updated", publishedAt: "2026-09-06", updatedAt: "2026-09-09",
      firstViewedAt: "2026-09-07", firstDownloadedAt: "2026-09-07", lastDownloadedAt: "2026-09-07", downloadCount: 1,
    },
  ];

  const seeds: StatementSeed[] = [...seeds2026, ...pastYearSeeds(2025), ...pastYearSeeds(2024), ...hoevSeeds];

  await prisma.statementDocument.createMany({
    data: seeds.map((seed) => ({
      ownerId: seed.ownerId,
      propertyId: seed.propertyId,
      year: seed.year,
      month: seed.month,
      documentType: seed.documentType,
      title: seed.title,
      fileName: seed.fileName,
      version: seed.version ?? 1,
      adminStatus: seed.adminStatus,
      publishedAt: seed.publishedAt ? d(seed.publishedAt) : null,
      updatedAt: seed.updatedAt ? d(seed.updatedAt) : null,
      firstViewedAt: seed.firstViewedAt ? d(seed.firstViewedAt) : null,
      firstDownloadedAt: seed.firstDownloadedAt ? d(seed.firstDownloadedAt) : null,
      lastDownloadedAt: seed.lastDownloadedAt ? d(seed.lastDownloadedAt) : null,
      downloadCount: seed.downloadCount ?? 0,
    })),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
