import "server-only";
import { googleDriveRequest } from "./client";
import { getGoogleDriveConfig } from "./config";
import { GoogleDriveError } from "./errors";
import {
  GOOGLE_DRIVE_FOLDER_MIME_TYPE,
  type GoogleDriveFolderInfo,
  type RawGoogleDriveFile,
  type RawGoogleDriveFileListResponse,
} from "./types";

/**
 * Folder-level Drive reads used for the admin Property <-> Drive-folder
 * mapping (see folderMapping.ts). Deliberately separate from
 * driveService.ts (root folder existence/count, used only by the
 * "Verbindung testen" check) - this is the one file that ever lists or
 * verifies a SPECIFIC folder a Property can be mapped to. Every call here
 * stays strictly read-only (drive.readonly scope, see auth.ts) and never
 * touches file content, matching the rest of this integration.
 */

/**
 * Direct (non-recursive) child FOLDERS of any given folder - used both for
 * the admin Property mapping (children of the root) and, by the document
 * sync (see documentSync.ts), for a property folder's "YYYY-MM" month
 * folders and a month folder's category folders ("Umsatz-Reporting" etc.).
 * Plain files are never returned here.
 */
export async function listChildFolders(parentFolderId: string): Promise<GoogleDriveFolderInfo[]> {
  const config = getGoogleDriveConfig();
  if (!config) throw new GoogleDriveError("not_configured", "Google Drive credentials are not configured");

  const query = encodeURIComponent(
    `'${parentFolderId}' in parents and mimeType = '${GOOGLE_DRIVE_FOLDER_MIME_TYPE}' and trashed = false`
  );
  const results: GoogleDriveFolderInfo[] = [];
  let pageToken: string | undefined;

  do {
    const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
    const data = await googleDriveRequest<RawGoogleDriveFileListResponse>(
      `/files?q=${query}&fields=nextPageToken,files(id,name)&pageSize=1000&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true${pageParam}`
    );
    if (!data) break;
    for (const file of data.files) {
      if (file.name !== undefined) results.push({ id: file.id, name: file.name });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return results;
}

/**
 * Direct child folders of the configured ROOT folder specifically - the
 * exact set an admin may pick from for a Property's Drive mapping. Folders
 * nested deeper than one level (e.g. a property's own "2026-08" month
 * folders) are never returned here - the admin mapping step only ever
 * connects a Property to one of these top-level folders.
 */
export async function listRootPropertyFolders(): Promise<GoogleDriveFolderInfo[]> {
  const config = getGoogleDriveConfig();
  if (!config) throw new GoogleDriveError("not_configured", "Google Drive credentials are not configured");

  return listChildFolders(config.rootFolderId);
}

/**
 * The one security-critical check in this whole feature: proves a folder id
 * is, right now, a non-trashed folder whose direct parent is the configured
 * root - never trusts a client-submitted id (or the dropdown list it came
 * from) on its own. Always re-fetches the folder's OWN metadata fresh from
 * Drive rather than checking membership in a previously-listed array, so a
 * forged/stale id from a manipulated request can never slip through.
 *
 * Returns the folder's real name (never a name the caller might have sent)
 * on success, or `null` when the id does not resolve to a direct child of
 * the root - whether because it doesn't exist (or the service account
 * can't see it), is trashed, isn't a folder, or its parent is anything
 * other than the configured root (including a folder nested two or more
 * levels down, e.g. one property's own "2026-08" subfolder, or a folder
 * that lives entirely outside the root's tree).
 */
export async function assertFolderIsDirectRootChild(folderId: string): Promise<GoogleDriveFolderInfo | null> {
  const config = getGoogleDriveConfig();
  if (!config) throw new GoogleDriveError("not_configured", "Google Drive credentials are not configured");

  let data: RawGoogleDriveFile | null;
  try {
    data = await googleDriveRequest<RawGoogleDriveFile>(
      `/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,trashed,parents&supportsAllDrives=true`
    );
  } catch (err) {
    // A missing/inaccessible id is a normal "not a valid folder to map to"
    // outcome here, not an infrastructure failure - see client.ts, which
    // maps both "genuinely doesn't exist" and "service account has no
    // access" to the same 404/not_found. Any other error kind (auth
    // failure, rate limit, unreachable) is real and still propagates.
    if (err instanceof GoogleDriveError && err.kind === "not_found") return null;
    throw err;
  }
  if (!data || data.trashed) return null;
  if (data.mimeType !== GOOGLE_DRIVE_FOLDER_MIME_TYPE) return null;
  if (!data.parents?.includes(config.rootFolderId)) return null;

  return { id: data.id, name: data.name };
}

/**
 * NEXT STEP - not implemented here, and nothing in this file reads into a
 * mapped folder yet (no listing, no sync, no publishing to the Owner
 * Center). Recorded so the next step builds on the agreed structure rather
 * than guessing it from scratch. Inside a Property's mapped folder
 * (`Property.googleDriveFolderId`), the real structure is:
 *
 *   <mapped property folder>
 *   └── YYYY-MM                    one folder per statement month
 *       ├── Belege                 receipts - NOT published to the Owner
 *       │                          Center for now
 *       ├── Rechnung-Gutschrift    -> AdminDocumentType "invoice" /
 *       │                          "credit_note" (which of the two still
 *       │                          needs a rule beyond the folder name)
 *       └── Umsatz-Reporting       -> AdminDocumentType "owner_report"
 *
 * Year and month are meant to come from parsing the "YYYY-MM" folder name
 * itself, not primarily from each file's own filename.
 */
