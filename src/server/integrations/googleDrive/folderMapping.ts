import "server-only";
import { isGoogleDriveConfigured } from "./config";
import { listRootPropertyFolders } from "./folderService";
import { describeGoogleDriveError } from "./errors";
import type { GoogleDriveFolderInfo } from "./types";

/**
 * The internal Property.googleDriveFolderId <-> live Drive root-child-folder
 * mapping state, computed once per page render (a single
 * `listRootPropertyFolders()` call) rather than one Drive request per row -
 * mirrors `integrations/apaleo/mappingStatus.ts` exactly, for the same
 * reason: any admin page that needs to show Drive mapping status can share
 * one loader instead of querying Drive per property.
 */
export interface GoogleDriveFolderMappingOverview {
  /** false when Drive is unconfigured or unreachable this render - never treated as "mapping fehlerhaft". */
  available: boolean;
  errorMessage: string | null;
  folders: GoogleDriveFolderInfo[];
  byId: Map<string, GoogleDriveFolderInfo>;
}

export async function loadGoogleDriveFolderMappingOverview(): Promise<GoogleDriveFolderMappingOverview> {
  if (!isGoogleDriveConfigured()) {
    return {
      available: false,
      errorMessage: "Google Drive ist nicht konfiguriert.",
      folders: [],
      byId: new Map(),
    };
  }

  try {
    const folders = await listRootPropertyFolders();
    return {
      available: true,
      errorMessage: null,
      folders,
      byId: new Map(folders.map((folder) => [folder.id, folder])),
    };
  } catch (err) {
    return {
      available: false,
      errorMessage: describeGoogleDriveError(err),
      folders: [],
      byId: new Map(),
    };
  }
}

export type GoogleDriveMappingStatus = "connected" | "not_connected" | "mapping_error" | "unavailable";

/**
 * The mapping status for one internal property, given an already-loaded
 * overview. `mapping_error` only ever fires when Drive WAS reachable and
 * the id simply isn't among the root's current direct child folders (a
 * stale/removed one) - never confused with Drive being temporarily
 * unreachable, which is `unavailable`.
 */
export function driveMappingStatusFor(
  googleDriveFolderId: string | null | undefined,
  overview: GoogleDriveFolderMappingOverview
): GoogleDriveMappingStatus {
  if (!googleDriveFolderId) return "not_connected";
  if (!overview.available) return "unavailable";
  return overview.byId.has(googleDriveFolderId) ? "connected" : "mapping_error";
}
