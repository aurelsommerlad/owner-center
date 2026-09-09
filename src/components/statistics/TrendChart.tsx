"use client";

import { useState, type PointerEvent } from "react";
import { formatCurrency } from "@/lib/format";

const MONTH_SHORT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/**
 * What a value on this chart represents. Kept as a plain, serializable
 * discriminator (rather than a formatter function prop) because this is a
 * Client Component rendered from an async Server Component page, which
 * cannot pass functions across that boundary.
 */
export type TrendValueKind = "currency" | "percent";

interface TrendChartProps {
  title: string;
  currentYear: number;
  previousYear: number;
  currentSeries: number[];
  previousSeries: number[];
  valueKind: TrendValueKind;
  /** Fix the y-axis ceiling (e.g. 100 for a percentage chart) instead of auto-scaling. */
  fixedMax?: number;
}

const WIDTH = 760;
const HEIGHT = 260;
const PADDING_LEFT = 56;
const PADDING_RIGHT = 12;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;
const PLOT_WIDTH = WIDTH - PADDING_LEFT - PADDING_RIGHT;
const PLOT_HEIGHT = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const exponent = Math.floor(Math.log10(rough));
  const base = 10 ** exponent;
  const fraction = rough / base;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * base;
}

function xFor(index: number) {
  return PADDING_LEFT + (index / (MONTH_SHORT.length - 1)) * PLOT_WIDTH;
}

export function TrendChart({
  title,
  currentYear,
  previousYear,
  currentSeries,
  previousSeries,
  valueKind,
  fixedMax,
}: TrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const formatValue = (value: number) =>
    valueKind === "currency" ? formatCurrency(value, "EUR", 0) : `${Math.round(value)} %`;

  const dataMax = Math.max(...currentSeries, ...previousSeries, 1);
  const axisMax = fixedMax ?? niceStep(dataMax / 4) * 4;
  const step = axisMax / 4;
  const yFor = (value: number) => PADDING_TOP + PLOT_HEIGHT - (value / axisMax) * PLOT_HEIGHT;

  const linePath = (series: number[]) =>
    series.map((value, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(value).toFixed(1)}`).join(" ");

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    setHoverIndex(Math.round(ratio * (MONTH_SHORT.length - 1)));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg italic text-ink">{title}</h3>
        <div className="flex items-center gap-4 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <svg width="16" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="16" y2="4" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            {currentYear}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="8" aria-hidden="true">
              <line
                x1="0"
                y1="4"
                x2="16"
                y2="4"
                stroke="var(--color-ink)"
                strokeOpacity="0.4"
                strokeWidth="2"
                strokeDasharray="3 3"
                strokeLinecap="round"
              />
            </svg>
            {previousYear}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`${title}: Vergleich ${currentYear} zu ${previousYear}, je Monat Januar bis Dezember`}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const y = PADDING_TOP + PLOT_HEIGHT * (1 - i / 4);
          return (
            <g key={i}>
              <line
                x1={PADDING_LEFT}
                x2={WIDTH - PADDING_RIGHT}
                y1={y}
                y2={y}
                stroke="var(--color-line)"
                strokeWidth={1}
              />
              <text x={PADDING_LEFT - 8} y={y} textAnchor="end" dominantBaseline="middle" className="fill-ink-soft" fontSize={10}>
                {formatValue(step * i)}
              </text>
            </g>
          );
        })}

        {MONTH_SHORT.map((label, i) => (
          <text key={label} x={xFor(i)} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-soft" fontSize={10}>
            {label}
          </text>
        ))}

        <path
          d={linePath(previousSeries)}
          fill="none"
          stroke="var(--color-ink)"
          strokeOpacity={0.4}
          strokeWidth={2}
          strokeDasharray="3 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={linePath(currentSeries)}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hoverIndex !== null && (
          <g className="pointer-events-none">
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={PADDING_TOP}
              y2={PADDING_TOP + PLOT_HEIGHT}
              stroke="var(--color-ink)"
              strokeOpacity={0.15}
            />
            <circle cx={xFor(hoverIndex)} cy={yFor(currentSeries[hoverIndex])} r={3.5} fill="var(--color-ink)" />
            <circle
              cx={xFor(hoverIndex)}
              cy={yFor(previousSeries[hoverIndex])}
              r={3.5}
              fill="var(--color-paper)"
              stroke="var(--color-ink)"
              strokeOpacity={0.5}
              strokeWidth={1.5}
            />
          </g>
        )}

        <rect
          x={PADDING_LEFT}
          y={PADDING_TOP}
          width={PLOT_WIDTH}
          height={PLOT_HEIGHT}
          fill="transparent"
          className="touch-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>

      <div className="mt-2 flex h-8 items-center justify-center gap-4 rounded-xl border border-line bg-paper-dim/50 px-3 text-xs">
        {hoverIndex !== null ? (
          <>
            <span className="font-medium text-ink">{MONTH_SHORT[hoverIndex]}</span>
            <span className="text-ink-soft">
              {currentYear}: <span className="text-ink">{formatValue(currentSeries[hoverIndex])}</span>
            </span>
            <span className="text-ink-soft">
              {previousYear}: <span className="text-ink">{formatValue(previousSeries[hoverIndex])}</span>
            </span>
          </>
        ) : (
          <span className="text-ink-soft/60">Punkt berühren oder überfahren für Details</span>
        )}
      </div>
    </div>
  );
}
