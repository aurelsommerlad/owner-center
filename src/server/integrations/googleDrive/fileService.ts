import "server-only";
import { googleDriveRequest } from "./client";
import { getGoogleDriveConfig } from "./config";
import { GoogleDriveError } from "./errors";
import { GOOGLE_DRIVE_PDF_MIME_TYPE, type GoogleDriveFileInfo, type RawGoogleDriveFileListResponse } from "./types";

/**
 * Direct (non-recursive) PDF-file children of a folder - used by the
 * document sync (see documentSync.ts) inside a month's "Umsatz-Reporting"
 * or "Rechnung-Gutschrift" category folder. Filters strictly on Drive's own
 * `mimeType`, never on a file-name extension - a Google Sheet, an Excel
 * file, an image or a subfolder is never returned here, whatever it's named.
 */
export async function listChildPdfFiles(parentFolderId: string): Promise<GoogleDriveFileInfo[]> {
  const config = getGoogleDriveConfig();
  if (!config) throw new GoogleDriveError("not_configured", "Google Drive credentials are not configured");

  const query = encodeURIComponent(
    `'${parentFolderId}' in parents and mimeType = '${GOOGLE_DRIVE_PDF_MIME_TYPE}' and trashed = false`
  );
  const results: GoogleDriveFileInfo[] = [];
  let pageToken: string | undefined;

  do {
    const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
    const data = await googleDriveRequest<RawGoogleDriveFileListResponse>(
      `/files?q=${query}&fields=nextPageToken,files(id,name,modifiedTime)&pageSize=1000&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true${pageParam}`
    );
    if (!data) break;
    for (const file of data.files) {
      if (file.name !== undefined && file.modifiedTime !== undefined) {
        results.push({ id: file.id, name: file.name, modifiedAt: file.modifiedTime });
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return results;
}
