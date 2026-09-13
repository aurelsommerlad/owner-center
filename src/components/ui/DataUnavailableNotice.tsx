/**
 * The one honest fallback the Owner Portal shows when a live apaleo read
 * failed for this request - never mock data standing in as if it were
 * live (see server/services/ownerPortal/errorState.ts). The rest of the
 * page still renders around this notice with its (zeroed) figures.
 */
export function DataUnavailableNotice() {
  return (
    <div className="rounded-2xl border border-line bg-[#F1EDE4]/60 px-4 py-3 text-sm text-ink-soft">
      Daten konnten aktuell nicht geladen werden.
    </div>
  );
}
