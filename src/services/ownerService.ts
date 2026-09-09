import type { Owner } from "@/types";
import { mockOwners } from "@/data/mock";

/**
 * Data-access boundary for the signed-in owner. In V1 this resolves against
 * mock fixtures; once auth/apaleo is wired up, this is the only file that
 * needs to change (e.g. read the owner from a session and call the apaleo
 * profile API) — callers keep using `getCurrentOwner()` unchanged.
 */
export async function getCurrentOwner(): Promise<Owner> {
  return mockOwners[0];
}
