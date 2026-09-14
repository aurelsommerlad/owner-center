import "server-only";

/**
 * Minimal raw shapes for the Drive v3 endpoints this layer calls
 * (`files.get`, `files.list`). Deliberately only the fields this app
 * actually reads - never file content, never anything guest/PII-related.
 */

/** Drive's fixed mimeType for a folder resource - never a real file's mimeType. */
export const GOOGLE_DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

/** Drive's fixed mimeType for a PDF file - the only file type V1 of the document sync ever imports. */
export const GOOGLE_DRIVE_PDF_MIME_TYPE = "application/pdf";

export interface RawGoogleDriveFile {
  id: string;
  name: string;
  trashed?: boolean;
  mimeType?: string;
  /** Direct parent folder ids. Drive normally returns exactly one entry (shared-drive edge cases aside). */
  parents?: string[];
  /** RFC 3339 timestamp of the file's last content/metadata change - drives StatementDocument.driveModifiedAt. */
  modifiedTime?: string;
}

export interface RawGoogleDriveFileListResponse {
  /** Only the fields actually requested via the `fields=` query param come back populated. */
  files: Array<{ id: string; name?: string; modifiedTime?: string }>;
  nextPageToken?: string;
}

export interface GoogleDriveFolderInfo {
  id: string;
  name: string;
}

export interface GoogleDriveFileInfo {
  id: string;
  name: string;
  /** RFC 3339 timestamp, straight from Drive's own `modifiedTime`. */
  modifiedAt: string;
}
