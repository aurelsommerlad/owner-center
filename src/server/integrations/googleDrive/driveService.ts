import "server-only";
import { googleDriveRequest } from "./client";
import { getGoogleDriveConfig } from "./config";
import { GoogleDriveError } from "./errors";
import type { GoogleDriveFolderInfo, RawGoogleDriveFile, RawGoogleDriveFileListResponse } from "./types";

/**
 * Read-only metadata calls against the configured root folder only - this
 * step deliberately does not browse into subfolders, list file details
 * beyond an id, or download any content (see connectionCheck.ts, the only
 * caller right now).
 */

/** Metadata (id + name) for the configured root folder - never its contents' file bytes. */
export async function getRootFolderInfo(): Promise<GoogleDriveFolderInfo> {
  const config = getGoogleDriveConfig();
  if (!config) throw new GoogleDriveError("not_configured", "Google Drive credentials are not configured");

  const data = await googleDriveRequest<RawGoogleDriveFile>(
    `/files/${encodeURIComponent(config.rootFolderId)}?fields=id,name,trashed&supportsAllDrives=true`
  );
  if (!data || data.trashed) {
    throw new GoogleDriveError("not_found", "configured root folder not found or trashed");
  }
  return { id: data.id, name: data.name };
}

/** Count of immediate (non-recursive) children of the root folder - ids only, no file contents. */
export async function countRootFolderItems(): Promise<number> {
  const config = getGoogleDriveConfig();
  if (!config) throw new GoogleDriveError("not_configured", "Google Drive credentials are not configured");

  const query = encodeURIComponent(`'${config.rootFolderId}' in parents and trashed = false`);
  let count = 0;
  let pageToken: string | undefined;

  do {
    const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
    const data = await googleDriveRequest<RawGoogleDriveFileListResponse>(
      `/files?q=${query}&fields=nextPageToken,files(id)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true${pageParam}`
    );
    if (!data) break;
    count += data.files.length;
    pageToken = data.nextPageToken;
  } while (pageToken);

  return count;
}
