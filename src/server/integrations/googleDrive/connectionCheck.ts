import "server-only";
import { prisma } from "@/server/db";
import { isGoogleDriveConfigured } from "./config";
import { countRootFolderItems, getRootFolderInfo } from "./driveService";
import { describeGoogleDriveError } from "./errors";

const CHECK_ID = "google-drive";

export interface GoogleDriveConnectionStatus {
  configured: boolean;
  lastCheck: {
    checkedAt: string;
    success: boolean;
    rootFolderName: string | null;
    itemCount: number | null;
    errorMessage: string | null;
  } | null;
}

/** Current configured-state plus the persisted result of the last "Verbindung testen" run, if any. */
export async function getGoogleDriveConnectionStatus(): Promise<GoogleDriveConnectionStatus> {
  const record = await prisma.googleDriveConnectionCheck.findUnique({ where: { id: CHECK_ID } });
  return {
    configured: isGoogleDriveConfigured(),
    lastCheck: record
      ? {
          checkedAt: record.checkedAt.toISOString(),
          success: record.success,
          rootFolderName: record.rootFolderName,
          itemCount: record.itemCount,
          errorMessage: record.errorMessage,
        }
      : null,
  };
}

/**
 * Performs a real live call to Google Drive (loading the root folder and
 * counting its immediate children) and persists the outcome, so "letzte
 * erfolgreiche Prüfung" survives across requests/serverless instances.
 * Never throws - failures are recorded, not thrown. No file content is ever
 * downloaded here.
 */
export async function testGoogleDriveConnection(): Promise<GoogleDriveConnectionStatus["lastCheck"]> {
  try {
    const folder = await getRootFolderInfo();
    const itemCount = await countRootFolderItems();
    const record = await prisma.googleDriveConnectionCheck.upsert({
      where: { id: CHECK_ID },
      create: { id: CHECK_ID, success: true, rootFolderName: folder.name, itemCount, errorMessage: null },
      update: { success: true, rootFolderName: folder.name, itemCount, errorMessage: null },
    });
    return {
      checkedAt: record.checkedAt.toISOString(),
      success: true,
      rootFolderName: folder.name,
      itemCount,
      errorMessage: null,
    };
  } catch (err) {
    const message = describeGoogleDriveError(err);
    const record = await prisma.googleDriveConnectionCheck.upsert({
      where: { id: CHECK_ID },
      create: { id: CHECK_ID, success: false, rootFolderName: null, itemCount: null, errorMessage: message },
      update: { success: false, rootFolderName: null, itemCount: null, errorMessage: message },
    });
    return {
      checkedAt: record.checkedAt.toISOString(),
      success: false,
      rootFolderName: null,
      itemCount: null,
      errorMessage: message,
    };
  }
}
