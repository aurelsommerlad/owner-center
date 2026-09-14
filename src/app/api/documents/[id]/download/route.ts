import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireEffectiveOwnerContext } from "@/server/ownerContext";
import { canOwnerAccessProperty } from "@/server/permissions";
import { googleDriveDownloadRequest } from "@/server/integrations/googleDrive/client";
import { describeGoogleDriveError } from "@/server/integrations/googleDrive/errors";

/**
 * The ONLY way a document's PDF bytes ever reach a browser. No public Drive
 * URL, no access token, and no service-account credential is ever sent to
 * the client - this route authenticates the request, re-checks every
 * authorization rule server-side, then streams the file straight through
 * from Drive:
 *
 *   session -> effective owner -> document -> published? -> OwnerPropertyAccess? -> Drive
 *
 * Every step returns a plain 404 on failure (never a more specific error) -
 * an unpublished document and a document on a property the caller has no
 * access to are deliberately indistinguishable from "id does not exist", so
 * a manipulated document id can never be used to probe which documents
 * exist elsewhere in the system.
 */
const PUBLISHED_STATUSES = new Set(["published", "updated"]);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Redirects to /login (or /admin, for an admin with no active preview) if
  // there is no valid session - same fallback every Owner Center page uses.
  const context = await requireEffectiveOwnerContext();

  const document = await prisma.statementDocument.findUnique({ where: { id } });
  if (!document || !document.driveFileId || !PUBLISHED_STATUSES.has(document.adminStatus)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const allowed = await canOwnerAccessProperty(context.ownerId, document.propertyId);
  if (!allowed) {
    return new NextResponse("Not found", { status: 404 });
  }

  let driveResponse: Response;
  try {
    driveResponse = await googleDriveDownloadRequest(document.driveFileId);
  } catch (err) {
    console.error(`[documents/download] Drive fetch failed for document ${document.id}:`, describeGoogleDriveError(err));
    return new NextResponse("Das Dokument konnte gerade nicht von Google Drive geladen werden.", { status: 502 });
  }

  const now = new Date();
  await prisma.statementDocument.update({
    where: { id: document.id },
    data: {
      downloadCount: { increment: 1 },
      firstDownloadedAt: document.firstDownloadedAt ?? now,
      lastDownloadedAt: now,
    },
  });

  // RFC 6266: an ASCII-safe fallback filename plus the real one, UTF-8
  // percent-encoded, so non-Latin file names (e.g. "ΛLPILΛ") survive intact
  // in browsers that support the extended form and degrade gracefully in
  // those that don't. Stripped of quotes/control characters either way, so
  // nothing from the stored file name can inject extra header directives.
  const safeFileName = document.fileName.replace(/[\r\n"]/g, "");
  const asciiFallback = safeFileName.replace(/[^\x20-\x7E]/g, "_");
  const contentDisposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`;

  return new NextResponse(driveResponse.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition,
      "Cache-Control": "private, no-store",
    },
  });
}
