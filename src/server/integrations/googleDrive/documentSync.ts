import "server-only";
import { prisma } from "@/server/db";
import { isGoogleDriveConfigured } from "./config";
import { listChildFolders } from "./folderService";
import { listChildPdfFiles } from "./fileService";
import { describeGoogleDriveError } from "./errors";
import type { Property as DbProperty } from "@/generated/prisma/client";

/**
 * Google Drive document sync (V1, manual admin-triggered only - see
 * app/admin/actions.ts#syncGoogleDriveDocumentsAction). Walks every active
 * Property's mapped Drive folder, finds "YYYY-MM" month folders, then the
 * "Umsatz-Reporting"/"Rechnung-Gutschrift" category folders inside each, and
 * upserts one StatementDocument per PDF found - by `driveFileId`, so
 * re-running this any number of times never creates duplicate rows. Never
 * touches anything outside a mapped property's own folder tree - the
 * existing security boundary from Property.googleDriveFolderId's own
 * verification (see folderService.ts#assertFolderIsDirectRootChild) is what
 * put that mapping there in the first place, and this only ever descends
 * from it.
 *
 * "Belege" is never opened, matching the spec exactly - it isn't merely
 * filtered out after listing, it's never even requested from Drive.
 */

const MONTH_FOLDER_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const CATEGORY_OWNER_REPORT = "Umsatz-Reporting";
const CATEGORY_INVOICE_CREDIT_NOTE = "Rechnung-Gutschrift";

export interface GoogleDriveSyncResult {
  propertiesChecked: number;
  documentsSeen: number;
  documentsCreated: number;
  documentsUpdated: number;
  /** Count of documents (created, updated, or already existing) that currently sit at "needs_classification" after this run. */
  documentsNeedingClassification: number;
  /** Previously-synced documents no longer found in Drive this run, newly moved to "archived". */
  documentsArchived: number;
  /** Human-readable, per-property/month notes - never a raw error, credential, or token (see describeGoogleDriveError). */
  errors: string[];
}

function emptyResult(): GoogleDriveSyncResult {
  return {
    propertiesChecked: 0,
    documentsSeen: 0,
    documentsCreated: 0,
    documentsUpdated: 0,
    documentsNeedingClassification: 0,
    documentsArchived: 0,
    errors: [],
  };
}

/**
 * Best-effort classification for a "Rechnung-Gutschrift" file name.
 * Deliberately conservative: only claims a type when exactly one of the two
 * German words appears as its own word in the file name - anything
 * ambiguous (both words, neither, a naming convention this heuristic
 * doesn't recognize) falls back to "other"/needs_classification rather than
 * guessing, per spec. This is the one place in the whole sync that reads
 * meaning from a FILE NAME rather than folder structure - everything else
 * (property, period, owner-report/rechnung-gutschrift category) is derived
 * from where the file actually sits in Drive.
 */
export function classifyInvoiceOrCreditNote(fileName: string): "invoice" | "credit_note" | null {
  const lower = fileName.toLowerCase();
  const hasRechnung = /\brechnung\b/.test(lower);
  const hasGutschrift = /\bgutschrift\b/.test(lower);
  if (hasRechnung && !hasGutschrift) return "invoice";
  if (hasGutschrift && !hasRechnung) return "credit_note";
  return null;
}

interface UpsertInput {
  propertyId: string;
  year: number;
  month: number;
  documentType: string;
  status: string;
  fileName: string;
  driveFileId: string;
  driveModifiedAt: Date;
}

type UpsertOutcome = "created" | "updated" | "unchanged";

/**
 * The one place a Drive file becomes (or updates) a StatementDocument row.
 * `driveFileId` is the upsert key (see the @unique constraint on it) - this
 * is what makes repeated syncs idempotent.
 *
 * On UPDATE, property/year/month/documentType are deliberately NEVER
 * touched, even if the file has since moved to a different Drive folder:
 * once a document exists, its property/period/type are admin-owned (via the
 * "Prüfen" review, see services/admin/statementService.ts#updateStatementDocumentFields)
 * and must never be silently reverted by a later sync.
 *
 * V1 decision for a changed `driveModifiedAt` on an ALREADY PUBLISHED
 * document (spec point 15): never silently re-publish new content without
 * re-review. Instead this sets adminStatus to "updated" - the SAME existing
 * mechanism the manual admin-correction flow already uses to flag a
 * republished document "Neu" again for the owner (see
 * lib/statementDocuments.ts#isNewStatementDocument). This is safe because
 * download always streams the CURRENT file live from Drive (see
 * app/api/documents/[id]/download/route.ts) - there is no separate cached
 * copy that could go stale - so the only things this changes are the
 * version counter and the owner-facing "Neu" flag, both non-destructive,
 * reversible signals rather than a silent content replace.
 *
 * A document that was "archived" (see archiveMissingDocuments below) and
 * reappears in Drive is reactivated to "detected" - back to admin review,
 * never silently re-published even if it had been published before going
 * missing.
 */
async function upsertStatementDocument(input: UpsertInput): Promise<{ outcome: UpsertOutcome; finalStatus: string }> {
  const existing = await prisma.statementDocument.findUnique({ where: { driveFileId: input.driveFileId } });

  if (!existing) {
    const title = input.fileName.replace(/\.pdf$/i, "");
    const created = await prisma.statementDocument.create({
      data: {
        propertyId: input.propertyId,
        ownerId: null,
        year: input.year,
        month: input.month,
        documentType: input.documentType,
        title,
        fileName: input.fileName,
        driveFileId: input.driveFileId,
        driveModifiedAt: input.driveModifiedAt,
        adminStatus: input.status,
        version: 1,
      },
    });
    return { outcome: "created", finalStatus: created.adminStatus };
  }

  const modifiedChanged =
    !existing.driveModifiedAt || existing.driveModifiedAt.getTime() !== input.driveModifiedAt.getTime();
  const wasMissing = existing.adminStatus === "archived";

  if (!modifiedChanged && !wasMissing) {
    return { outcome: "unchanged", finalStatus: existing.adminStatus };
  }

  const alreadyOwnerVisible = existing.adminStatus === "published" || existing.adminStatus === "updated";
  const nextStatus = alreadyOwnerVisible ? "updated" : wasMissing ? "detected" : existing.adminStatus;
  const now = new Date();

  const updated = await prisma.statementDocument.update({
    where: { id: existing.id },
    data: {
      fileName: input.fileName,
      driveModifiedAt: input.driveModifiedAt,
      version: modifiedChanged ? { increment: 1 } : undefined,
      adminStatus: nextStatus,
      updatedAt: nextStatus === "updated" ? now : existing.updatedAt,
    },
  });
  return { outcome: "updated", finalStatus: updated.adminStatus };
}

/**
 * Spec point 16: a previously-synced file no longer found in Drive is never
 * hard-deleted - it moves to "archived" (historical tracking preserved) so
 * it also drops out of the owner-visible set (archived isn't in the
 * published/updated whitelist). Only ever called for a property whose
 * folder tree was FULLY enumerated this run without error - see the caller
 * - so a transient listing failure can never be misread as "every document
 * vanished from Drive".
 */
async function archiveMissingDocuments(propertyId: string, seenDriveFileIds: Set<string>): Promise<number> {
  const candidates = await prisma.statementDocument.findMany({
    where: { propertyId, driveFileId: { not: null }, adminStatus: { not: "archived" } },
    select: { id: true, driveFileId: true },
  });
  const missing = candidates.filter((doc) => doc.driveFileId && !seenDriveFileIds.has(doc.driveFileId));
  if (missing.length === 0) return 0;

  await prisma.statementDocument.updateMany({
    where: { id: { in: missing.map((doc) => doc.id) } },
    data: { adminStatus: "archived" },
  });
  return missing.length;
}

async function syncCategoryFiles(options: {
  property: DbProperty;
  year: number;
  month: number;
  categoryFolderId: string;
  /** "owner_report" for an unambiguous category, or `null` for "Rechnung-Gutschrift" (needs per-file classification). */
  fixedType: "owner_report" | null;
  seenDriveFileIds: Set<string>;
  result: GoogleDriveSyncResult;
}): Promise<void> {
  const { property, year, month, categoryFolderId, fixedType, seenDriveFileIds, result } = options;
  const files = await listChildPdfFiles(categoryFolderId);

  for (const file of files) {
    seenDriveFileIds.add(file.id);
    result.documentsSeen += 1;

    let documentType: string;
    let status: string;
    if (fixedType) {
      documentType = fixedType;
      status = "detected";
    } else {
      const classified = classifyInvoiceOrCreditNote(file.name);
      if (classified) {
        documentType = classified;
        status = "detected";
      } else {
        documentType = "other";
        status = "needs_classification";
      }
    }

    const { outcome, finalStatus } = await upsertStatementDocument({
      propertyId: property.id,
      year,
      month,
      documentType,
      status,
      fileName: file.name,
      driveFileId: file.id,
      driveModifiedAt: new Date(file.modifiedAt),
    });

    if (outcome === "created") result.documentsCreated += 1;
    else if (outcome === "updated") result.documentsUpdated += 1;
    if (finalStatus === "needs_classification") result.documentsNeedingClassification += 1;
  }
}

export async function syncGoogleDriveDocuments(): Promise<GoogleDriveSyncResult> {
  const result = emptyResult();

  if (!isGoogleDriveConfigured()) {
    result.errors.push("Google Drive ist nicht konfiguriert.");
    return result;
  }

  const properties = await prisma.property.findMany({
    where: { status: "active", googleDriveFolderId: { not: null } },
  });

  for (const property of properties) {
    result.propertiesChecked += 1;
    const seenDriveFileIds = new Set<string>();
    let propertySyncOk = true;

    try {
      const monthFolders = await listChildFolders(property.googleDriveFolderId!);
      for (const monthFolder of monthFolders) {
        const match = MONTH_FOLDER_PATTERN.exec(monthFolder.name);
        if (!match) continue; // not a "YYYY-MM" folder - silently ignored, not an error
        const year = Number(match[1]);
        const month = Number(match[2]);

        try {
          const categoryFolders = await listChildFolders(monthFolder.id);
          for (const categoryFolder of categoryFolders) {
            if (categoryFolder.name === CATEGORY_OWNER_REPORT) {
              await syncCategoryFiles({
                property,
                year,
                month,
                categoryFolderId: categoryFolder.id,
                fixedType: "owner_report",
                seenDriveFileIds,
                result,
              });
            } else if (categoryFolder.name === CATEGORY_INVOICE_CREDIT_NOTE) {
              await syncCategoryFiles({
                property,
                year,
                month,
                categoryFolderId: categoryFolder.id,
                fixedType: null,
                seenDriveFileIds,
                result,
              });
            }
            // Any other folder name - "Belege" included - is never opened.
          }
        } catch (err) {
          propertySyncOk = false;
          result.errors.push(`${property.name} · ${monthFolder.name}: ${describeGoogleDriveError(err)}`);
        }
      }
    } catch (err) {
      propertySyncOk = false;
      result.errors.push(`${property.name}: ${describeGoogleDriveError(err)}`);
    }

    // Missing-file detection only runs when this property's tree was fully
    // walked without error this run - otherwise a transient listing failure
    // could wrongly archive every document this property has.
    if (propertySyncOk) {
      result.documentsArchived += await archiveMissingDocuments(property.id, seenDriveFileIds);
    }
  }

  return result;
}
