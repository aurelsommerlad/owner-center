import type { StatementMonthGroup as StatementMonthGroupData } from "@/lib/statementDocuments";
import { statementMonthGroupLabel } from "@/lib/statementDocuments";
import { StatementDocumentRow } from "./StatementDocumentRow";

export function StatementMonthGroup({ group }: { group: StatementMonthGroupData }) {
  const { ownerReport, standardDocuments, extraDocuments, documentCount, newCount } = group;

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{statementMonthGroupLabel(group)}</h3>
        {documentCount > 1 && (
          <span className="text-[11px] text-ink-soft">
            {documentCount} Dokumente
            {newCount > 0 ? ` · ${newCount} neu` : ""}
          </span>
        )}
      </div>

      <div className="mt-1 flex flex-col divide-y divide-line/60">
        {ownerReport && <StatementDocumentRow document={ownerReport} emphasis="primary" />}
        {standardDocuments.map((document) => (
          <StatementDocumentRow key={document.id} document={document} emphasis="standard" />
        ))}
      </div>

      {extraDocuments.length > 0 && (
        <div className="mt-1.5 border-t border-line/60 pt-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-soft/70">Weitere Dokumente</p>
          <div className="flex flex-col">
            {extraDocuments.map((document) => (
              <StatementDocumentRow key={document.id} document={document} emphasis="muted" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
