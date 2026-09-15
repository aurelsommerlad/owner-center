"use client";

import { useEffect, useId, useRef, useState } from "react";
import { InfoIcon } from "@/components/ui/icons";

/**
 * Small, dezent ⓘ trigger for an explanatory tooltip - the one place this
 * pattern is built, so every period/KPI explanation across the app reuses
 * it instead of a one-off popover. No new UI library: a single absolutely
 * positioned panel, styled like every other floating panel already in the
 * app (see StatisticsPeriodFilter's month dropdown).
 *
 * Desktop: hover or keyboard focus opens it. Mobile (no hover): tapping the
 * icon toggles it open/closed, and tapping anywhere else closes it (same
 * click-outside pattern as the month dropdown).
 */
export function InfoTooltip({
  label,
  title,
  description,
  dateRangeLabel,
  className,
}: {
  /** Accessible name for the trigger button, e.g. "Weitere Informationen". */
  label: string;
  title?: string;
  description: string;
  /** Optional dynamic range line shown below the description, e.g. "1.–15. September 2026". */
  dateRangeLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <span ref={containerRef} className={`relative inline-flex ${className ?? ""}`}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-ink-soft/45 transition-colors hover:text-ink-soft focus-visible:text-ink-soft"
      >
        <InfoIcon className="h-3.5 w-3.5" strokeWidth={1.4} />
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-full z-40 mt-2 w-56 max-w-[75vw] rounded-2xl border border-line bg-paper px-3.5 py-3 text-xs shadow-soft-lg"
        >
          {title && <span className="mb-0.5 block font-medium text-ink">{title}</span>}
          <span className="block text-ink-soft">{description}</span>
          {dateRangeLabel && <span className="mt-1 block text-[11px] text-ink-soft/70">{dateRangeLabel}</span>}
        </span>
      )}
    </span>
  );
}
