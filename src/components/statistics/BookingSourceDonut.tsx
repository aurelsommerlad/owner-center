"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { BookingSourceBreakdown } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import { CHANNEL_COLORS } from "@/data/mock/bookingChannels";

const SIZE = 216;
const RADIUS = 78;
const STROKE = 32;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const INNER_HIT_RADIUS = RADIUS - STROKE / 2;
const OUTER_HIT_RADIUS = RADIUS + STROKE / 2;

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

/**
 * Which segment (if any) the pointer is over, computed once from angle +
 * distance to the ring's center - rather than relying on each stacked
 * segment circle's own SVG stroke hit-testing. The segments are drawn as 4
 * full circles of identical radius, only made to look like separate wedges
 * via strokeDasharray, so their invisible dash gaps still touch at the
 * segment boundaries; letting the browser pick a hit target there flickers
 * between neighboring segments as the pointer nears (or even sits still on)
 * a boundary. Angle math has exactly one answer per pointer position, so
 * there is nothing left to flicker between.
 *
 * Angle 0 is straight up (matching the <g transform="rotate(-90 ...)"> the
 * segments are drawn in) and increases clockwise, matching strokeDashoffset
 * growing clockwise from the top - so it lines up with each segment's
 * cumulative revenueShare in the same order they're drawn.
 */
function segmentIndexAtPoint(
  svg: SVGSVGElement,
  sources: BookingSourceBreakdown[],
  clientX: number,
  clientY: number
): number | null {
  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const localX = ((clientX - rect.left) / rect.width) * SIZE;
  const localY = ((clientY - rect.top) / rect.height) * SIZE;
  const dx = localX - CENTER;
  const dy = localY - CENTER;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < INNER_HIT_RADIUS || distance > OUTER_HIT_RADIUS) return null;

  const degrees = (Math.atan2(dx, -dy) * (180 / Math.PI) + 360) % 360;
  const percent = (degrees / 360) * 100;

  let cumulative = 0;
  for (let index = 0; index < sources.length; index += 1) {
    cumulative += sources[index].revenueShare;
    if (percent < cumulative) return index;
  }
  return sources.length > 0 ? sources.length - 1 : null;
}

export function BookingSourceDonut({ sources }: { sources: BookingSourceBreakdown[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const directShare = sources.find((source) => source.source === "direct")?.revenueShare ?? 0;
  const active = activeIndex !== null ? sources[activeIndex] : null;
  const segments = layoutSegments(sources);

  function handlePointerMove(event: ReactMouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    setActiveIndex(segmentIndexAtPoint(svg, sources, event.clientX, event.clientY));
  }

  function handlePointerLeave() {
    setActiveIndex(null);
  }

  function handleClick(event: ReactMouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const index = segmentIndexAtPoint(svg, sources, event.clientX, event.clientY);
    setActiveIndex((current) => (index !== null && current === index ? null : index));
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[216px] w-[216px]">
        <svg
          ref={svgRef}
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Buchungsumsatz nach Vertriebskanal"
          className="cursor-pointer"
          onMouseMove={handlePointerMove}
          onMouseLeave={handlePointerLeave}
          onClick={handleClick}
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
                  strokeWidth={STROKE}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={offset}
                  opacity={isDimmed ? 0.45 : 1}
                  className="pointer-events-none transition-opacity duration-150"
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
