"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { BookingSourceBreakdown } from "@/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { CHANNEL_COLORS } from "@/data/mock/bookingChannels";
import { useTranslations } from "@/components/i18n/LocaleProvider";

const SIZE = 216;
const RADIUS = 78;
const STROKE = 32;
const CENTER = SIZE / 2;
const INNER_RADIUS = RADIUS - STROKE / 2;
const OUTER_RADIUS = RADIUS + STROKE / 2;

interface DonutSegment {
  row: BookingSourceBreakdown;
  /** Degrees clockwise from straight up (0 = 12 o'clock), matching segmentIndexAtPoint's convention below. */
  startAngle: number;
  endAngle: number;
}

/** Precomputes each wedge's [startAngle, endAngle) in degrees as a plain,
 *  pure array - kept out of the component body so nothing mutates a
 *  render-scoped variable while building the JSX. Adjacent segments share
 *  the exact same boundary angle (each one's end is the next one's start,
 *  both derived from the same running `cumulative`), so the paths drawn
 *  from these angles meet at identical points with no seam between them. */
function layoutSegments(sources: BookingSourceBreakdown[]): DonutSegment[] {
  let cumulative = 0;
  return sources.map((row) => {
    const startAngle = (cumulative / 100) * 360;
    cumulative += row.revenueShare;
    return { row, startAngle, endAngle: (cumulative / 100) * 360 };
  });
}

function polarPoint(radius: number, angleDegrees: number): { x: number; y: number } {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(angleRadians), y: CENTER - radius * Math.cos(angleRadians) };
}

/** SVG path for one ring wedge (an annular sector) between innerRadius and
 *  outerRadius, from startAngle to endAngle - drawn as a single filled
 *  shape rather than a stroked circle arc, so there is no dependency on
 *  another element's stroke lining up with it at the boundary. */
function wedgePath(startAngle: number, endAngle: number): string {
  const sweep = Math.min(endAngle - startAngle, 359.99);
  const largeArc = sweep > 180 ? 1 : 0;
  const outerStart = polarPoint(OUTER_RADIUS, startAngle);
  const outerEnd = polarPoint(OUTER_RADIUS, startAngle + sweep);
  const innerEnd = polarPoint(INNER_RADIUS, startAngle + sweep);
  const innerStart = polarPoint(INNER_RADIUS, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

/**
 * Which segment (if any) the pointer is over, computed once from angle +
 * distance to the ring's center, using the exact same [startAngle, endAngle)
 * data the wedges are drawn from - so the hit area always matches the
 * visible shape exactly, with nothing to disagree about at a boundary.
 *
 * Angle 0 is straight up and increases clockwise, matching layoutSegments'
 * / wedgePath's convention above.
 */
function segmentIndexAtPoint(
  svg: SVGSVGElement,
  segments: DonutSegment[],
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
  if (distance < INNER_RADIUS || distance > OUTER_RADIUS) return null;

  const degrees = (Math.atan2(dx, -dy) * (180 / Math.PI) + 360) % 360;
  const index = segments.findIndex(({ startAngle, endAngle }) => degrees >= startAngle && degrees < endAngle);
  return index === -1 ? null : index;
}

function channelLabel(row: BookingSourceBreakdown, dict: ReturnType<typeof useTranslations>["dict"]): string {
  if (row.source === "direct") return dict.statistics.channelDirect;
  if (row.source === "other") return dict.statistics.channelOther;
  return row.label;
}

export function BookingSourceDonut({ sources }: { sources: BookingSourceBreakdown[] }) {
  const { locale, dict, t } = useTranslations();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const directShare = sources.find((source) => source.source === "direct")?.revenueShare ?? 0;
  const active = activeIndex !== null ? sources[activeIndex] : null;
  const segments = layoutSegments(sources);

  function handlePointerMove(event: ReactMouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    setActiveIndex(segmentIndexAtPoint(svg, segments, event.clientX, event.clientY));
  }

  function handlePointerLeave() {
    setActiveIndex(null);
  }

  function handleClick(event: ReactMouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const index = segmentIndexAtPoint(svg, segments, event.clientX, event.clientY);
    setActiveIndex((current) => (index !== null && current === index ? null : index));
  }

  return (
    // Fixed width, matching the ring below: the detail row's text length
    // varies a lot between the idle placeholder and an active segment's
    // "name, amount, %, count" - without a fixed width here, that swing
    // resized this flex column and re-centered the ring under it, moving
    // the ring out from under a stationary cursor and re-triggering hover
    // on a different segment (which swings the text again - a flicker
    // loop, not a hover-detection bug).
    <div className="flex w-[216px] flex-col items-center">
      <div className="relative h-[216px] w-[216px]">
        <svg
          ref={svgRef}
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={t("statistics.bookingSourceChartLabel")}
          className="cursor-pointer"
          onMouseMove={handlePointerMove}
          onMouseLeave={handlePointerLeave}
          onClick={handleClick}
        >
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--color-line)" strokeWidth={STROKE} />
          {segments.map(({ row, startAngle, endAngle }, index) => {
            const isDimmed = activeIndex !== null && activeIndex !== index;

            return (
              <path
                key={row.source}
                d={wedgePath(startAngle, endAngle)}
                fill={CHANNEL_COLORS[row.source]}
                opacity={isDimmed ? 0.45 : 1}
                className="pointer-events-none transition-opacity duration-150"
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">{t("statistics.directShare")}</p>
          <p className="mt-1 font-display text-2xl italic text-ink">{formatPercent(directShare, 0, locale)}</p>
        </div>
      </div>

      <div className="mt-4 flex min-h-8 w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border border-line bg-paper-dim/50 px-3 py-1.5 text-xs">
        {active ? (
          <>
            <span className="flex items-center gap-1.5 font-medium text-ink">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CHANNEL_COLORS[active.source] }}
                aria-hidden="true"
              />
              {channelLabel(active, dict)}
            </span>
            <span className="text-ink-soft">{formatCurrency(active.revenue, "EUR", 2, locale)}</span>
            <span className="text-ink-soft">{formatPercent(active.revenueShare, 1, locale)}</span>
            <span className="text-ink-soft">{t("statistics.bookingCountSuffix", { count: active.bookingCount })}</span>
          </>
        ) : (
          <span className="text-ink-soft/60">{t("statistics.hoverForDetailsSegment")}</span>
        )}
      </div>
    </div>
  );
}
