import "server-only";

/**
 * Minimal raw shapes for the Drive v3 endpoints this layer calls
 * (`files.get`, `files.list`). Deliberately only the fields this app
 * actually reads - never file content, never anything guest/PII-related.
 */

export interface RawGoogleDriveFile {
  id: string;
  name: string;
  trashed?: boolean;
}

export interface RawGoogleDriveFileListResponse {
  files: Array<{ id: string }>;
  nextPageToken?: string;
}

export interface GoogleDriveFolderInfo {
  id: string;
  name: string;
}
