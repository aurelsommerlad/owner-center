import "server-only";

/**
 * Minimal raw shapes for the Drive v3 endpoints this layer calls
 * (`files.get`, `files.list`). Deliberately only the fields this app
 * actually reads - never file content, never anything guest/PII-related.
 */

/** Drive's fixed mimeType for a folder resource - never a real file's mimeType. */
export const GOOGLE_DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

export interface RawGoogleDriveFile {
  id: string;
  name: string;
  trashed?: boolean;
  mimeType?: string;
  /** Direct parent folder ids. Drive normally returns exactly one entry (shared-drive edge cases aside). */
  parents?: string[];
}

export interface RawGoogleDriveFileListResponse {
  /** Only the fields actually requested via the `fields=` query param come back populated. */
  files: Array<{ id: string; name?: string }>;
  nextPageToken?: string;
}

export interface GoogleDriveFolderInfo {
  id: string;
  name: string;
}
