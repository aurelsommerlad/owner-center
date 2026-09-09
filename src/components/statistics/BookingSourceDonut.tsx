"use client";

import { useState } from "react";
import type { BookingSourceBreakdown } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import { CHANNEL_COLORS } from "@/data/mock/bookingChannels";

const SIZE = 216;
const RADIUS = 78;
const STROKE = 32;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface DonutSegment {
  row: BookingSourceBreakdown;
  dash: number;
  gap: number;
  offset: number;
}

/** Precomputes each wedge's dash length and cumulative rotation offset as a
 *  plain, pure array - kept out of the component body so nothing mutates a
 *  render-scoped variable while building the JSX. */
function layoutSegments(sources: BookingSourceBreakdown[]): DonutSegment[] {
  let cumulative = 0;
  return sources.map((row) => {
    const dash = (row.revenueShare / 100) * CIRCUMFERENCE;
    const segment: DonutSegment = { row, dash, gap: CIRCUMFERENCE - dash, offset: -cumulative };
    cumulative += dash;
    return segment;
  });
}

export function BookingSourceDonut({ sources }: { sources: BookingSourceBreakdown[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const directShare = sources.find((source) => source.source === "direct")?.revenueShare ?? 0;
  const active = activeIndex !== null ? sources[activeIndex] : null;
  const segments = layoutSegments(sources);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[216px] w-[216px]">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Buchungsumsatz nach Vertriebskanal"
        >
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--color-line)" strokeWidth={STROKE} />
          <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            {segments.map(({ row, dash, gap, offset }, index) => {
              const isActive = activeIndex === index;
              const isDimmed = activeIndex !== null && !isActive;

              return (
                <circle
                  key={row.source}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke={CHANNEL_COLORS[row.source]}
                  strokeWidth={isActive ? STROKE + 6 : STROKE}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={offset}
                  opacity={isDimmed ? 0.45 : 1}
                  className="cursor-pointer transition-[stroke-width,opacity] duration-150"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={() => setActiveIndex(isActive ? null : index)}
                />
              );
            })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Direktanteil</p>
          <p className="mt-1 font-display text-2xl italic text-ink">{formatNumber(directShare, 0)} %</p>
        </div>
      </div>

      <div className="mt-4 flex h-8 min-w-full items-center justify-center gap-3 rounded-xl border border-line bg-paper-dim/50 px-3 text-xs">
        {active ? (
          <>
            <span className="flex items-center gap-1.5 font-medium text-ink">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CHANNEL_COLORS[active.source] }}
                aria-hidden="true"
              />
              {active.label}
            </span>
            <span className="text-ink-soft">{formatCurrency(active.revenue)}</span>
            <span className="text-ink-soft">{formatNumber(active.revenueShare, 1)} %</span>
            <span className="text-ink-soft">{active.bookingCount} Buchungen</span>
          </>
        ) : (
          <span className="text-ink-soft/60">Segment berühren oder überfahren für Details</span>
        )}
      </div>
    </div>
  );
}
