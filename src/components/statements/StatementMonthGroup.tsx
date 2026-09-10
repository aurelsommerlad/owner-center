import type { StatementMonthGroup as StatementMonthGroupData } from "@/lib/statementDocuments";
import { statementMonthGroupLabel } from "@/lib/statementDocuments";
import { StatementDocumentRow } from "./StatementDocumentRow";

export function StatementMonthGroup({ group }: { group: StatementMonthGroupData }) {
  const { mainDocument, otherDocuments, documentCount, newCount } = group;

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
        {mainDocument && <StatementDocumentRow document={mainDocument} emphasis="primary" />}
        {otherDocuments.map((document) => (
          <StatementDocumentRow key={document.id} document={document} emphasis="secondary" />
        ))}
      </div>
    </div>
  );
}
