import type { ReactNode } from "react";
import { AdminStatusBadge } from "./AdminStatusBadge";

/**
 * Compact document-list row shared by /admin/statements and
 * /admin/documents - both screens are "a list of documents with a status",
 * just with different meta fields, so the row shell is the reusable part.
 * Same divider/spacing convention as the Owner Center's own document lists
 * (e.g. RecentStatements, Abrechnungen) - divide-line rows, text-ink /
 * text-ink-soft, no bespoke row chrome.
 */
export function DocumentRow({
  title,
  subtitle,
  meta,
  status,
  trailing,
}: {
  title: string;
  subtitle?: string;
  /** Short meta fragments, rendered "a · b · c". */
  meta: string[];
  status: { label: string; tone: "positive" | "strong" | "neutral" | "muted" };
  /** Optional extra content on the right, e.g. "gesehen"/"heruntergeladen" hints. */
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        {subtitle && <p className="text-xs text-ink-soft">{subtitle}</p>}
        {meta.length > 0 && (
          <p className="mt-0.5 text-xs text-ink-soft">
            {meta.map((fragment, index) => (
              // Index is fine here: `meta` is a fixed-order, fixed-length
              // tuple of display fragments per row (not a reorderable list),
              // and fragment text alone isn't unique (e.g. "Nicht zugeordnet"
              // can appear twice in the same row).
              <span key={index}>
                {index > 0 && " · "}
                {fragment}
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {trailing}
        <AdminStatusBadge label={status.label} tone={status.tone} />
      </div>
    </div>
  );
}
