import "server-only";
import { cache } from "react";

/**
 * Request-scoped "did a live statement-document read fail" flag - the
 * Prisma-backed counterpart to server/services/ownerPortal/errorState.ts's
 * apaleo flag. `cache()` returns the same object for every call within one
 * request/render and a fresh one for the next, so mutating `.value` here
 * safely signals a DB error up from statementDocumentService.ts to the page
 * component that decides whether to render "Daten konnten aktuell nicht
 * geladen werden." Never shared across requests/owners.
 */
const getFlag = cache((): { value: boolean } => ({ value: false }));

export function markStatementDataError(): void {
  getFlag().value = true;
}

export function hadStatementDataError(): boolean {
  return getFlag().value;
}
