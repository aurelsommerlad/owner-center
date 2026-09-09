import type { CSSProperties } from "react";
import type { Reservation, ReservationStatus, Unit } from "@/types";
import { dayOfMonth, weekdayLabel } from "@/lib/dates";
import { formatShortDate } from "@/lib/format";
import { statusLabel } from "@/components/ui/StatusBadge";

export interface TimelineDay {
  date: string;
}

export interface TimelineRow {
  unit: Unit;
  reservations: Reservation[];
}

type TimelineTone = "default" | "subtle";

interface OccupancyTimelineProps {
  days: TimelineDay[];
  rows: TimelineRow[];
  today: string;
  cellWidth?: number;
  rowHeight?: number;
  unitColumnWidth?: number;
  className?: string;
  /**
   * "default" keeps the original bold styling (used by the full Kalender page).
   * "subtle" is the lighter, less dominant look for the Übersicht preview widget.
   */
  tone?: TimelineTone;
}

const STATUS_BAR_CLASS: Record<ReservationStatus, string> = {
  confirmed: "bg-status-occupied",
  blocked: "bg-status-blocked",
  "owner-use": "bg-status-owner",
};

const BLOCKED_HATCH_STYLE: CSSProperties = {
  backgroundColor: "#E4E0D8",
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(116,115,110,0.35) 3px, rgba(116,115,110,0.35) 4px)",
};

function barVisual(status: ReservationStatus, tone: TimelineTone): { className: string; style?: CSSProperties } {
  if (tone === "default") {
    return { className: STATUS_BAR_CLASS[status] };
  }
  if (status === "confirmed") return { className: "bg-[#87977E]" };
  if (status === "owner-use") return { className: "bg-[#52664E]" };
  return { className: "", style: BLOCKED_HATCH_STYLE };
}

function labelTextClass(status: ReservationStatus, tone: TimelineTone): string {
  if (tone === "default") return "text-ink";
  if (status === "owner-use") return "text-[#FAFAF7]";
  return "text-[#74736E]";
}

function dateIndex(iso: string, days: TimelineDay[]): number {
  const idx = days.findIndex((day) => day.date === iso);
  if (idx !== -1) return idx;
  return iso < days[0].date ? 0 : days.length;
}

/**
 * Which status kinds are actually visible in this grid, used to decide whether
 * the (optional) legend is worth showing at all.
 */
export function getPresentStatuses(
  days: TimelineDay[],
  rows: TimelineRow[]
): Array<ReservationStatus | "free"> {
  const present = new Set<ReservationStatus | "free">();
  for (const row of rows) {
    const covered = new Array(days.length).fill(false);
    for (const reservation of row.reservations) {
      const startIdx = dateIndex(reservation.checkIn, days);
      const endIdx = dateIndex(reservation.checkOut, days);
      if (endIdx <= startIdx) continue;
      present.add(reservation.status);
      for (let i = Math.max(startIdx, 0); i < Math.min(endIdx, days.length); i++) {
        covered[i] = true;
      }
    }
    if (covered.some((isCovered) => !isCovered)) present.add("free");
  }
  return Array.from(present);
}

export function OccupancyTimeline({
  days,
  rows,
  today,
  cellWidth = 44,
  rowHeight = 46,
  unitColumnWidth = 132,
  className = "",
  tone = "default",
}: OccupancyTimelineProps) {
  const gridWidth = days.length * cellWidth;
  const todayIndex = dateIndex(today, days);
  const isSubtle = tone === "subtle";

  const hLineClass = isSubtle ? "border-[#E4E0D8]" : "border-line";
  const vLineClass = isSubtle ? "border-[#E4E0D8]/45" : "border-line/70";
  const weekendHeaderClass = isSubtle ? "bg-[#F1EDE4]/45" : "bg-paper-dim/60";
  const weekendBodyClass = isSubtle ? "bg-[#F1EDE4]/30" : "bg-paper-dim/40";
  const barToneClass = isSubtle
    ? "shadow-[0_1px_2px_rgba(23,24,23,0.05)] hover:brightness-105"
    : "shadow-sm hover:brightness-110";

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div style={{ width: unitColumnWidth + gridWidth, minWidth: "100%" }}>
        {/* Header row */}
        <div className="flex">
          <div
            className="sticky left-0 z-10 shrink-0 bg-paper"
            style={{ width: unitColumnWidth }}
          />
          <div className="relative flex" style={{ width: gridWidth }}>
            {days.map((day) => {
              const isToday = day.date === today;
              const weekend = weekdayLabel(day.date) === "Sa" || weekdayLabel(day.date) === "So";
              return (
                <div
                  key={day.date}
                  className={`flex shrink-0 flex-col items-center justify-center gap-0.5 border-b ${hLineClass} py-1.5 text-[11px] ${
                    weekend ? weekendHeaderClass : ""
                  } ${isToday ? "text-ink" : "text-ink-soft"}`}
                  style={{ width: cellWidth }}
                >
                  <span className="uppercase tracking-wide">{weekdayLabel(day.date)}</span>
                  <span
                    className={
                      isToday
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-ink font-semibold text-paper"
                        : ""
                    }
                  >
                    {dayOfMonth(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows */}
        {rows.map((row) => (
          <div key={row.unit.id} className="flex">
            <div
              className={`sticky left-0 z-10 flex shrink-0 flex-col justify-center border-b ${hLineClass} bg-paper pr-3`}
              style={{ width: unitColumnWidth, height: rowHeight }}
            >
              <p className="text-sm font-medium text-ink">{row.unit.name}</p>
              <p className="text-xs text-ink-soft">
                {row.unit.minOccupancy}–{row.unit.maxOccupancy} Personen
              </p>
            </div>
            <div
              className={`relative shrink-0 border-b ${hLineClass}`}
              style={{ width: gridWidth, height: rowHeight }}
            >
              {/* day separators + weekend shading */}
              <div className="pointer-events-none absolute inset-0 flex">
                {days.map((day) => {
                  const weekend = weekdayLabel(day.date) === "Sa" || weekdayLabel(day.date) === "So";
                  return (
                    <div
                      key={day.date}
                      className={`shrink-0 border-r ${vLineClass} ${weekend ? weekendBodyClass : ""}`}
                      style={{ width: cellWidth }}
                    />
                  );
                })}
              </div>
              {todayIndex >= 0 && todayIndex < days.length && (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 bg-ink/[0.04]"
                  style={{ left: todayIndex * cellWidth, width: cellWidth }}
                />
              )}
              {row.reservations.map((reservation) => {
                const startIdx = dateIndex(reservation.checkIn, days);
                const endIdx = dateIndex(reservation.checkOut, days);
                if (endIdx <= startIdx) return null;
                const continuesBefore = reservation.checkIn < days[0].date;
                const continuesAfter = reservation.checkOut > days[days.length - 1].date;

                // A bar starts at the midpoint of the check-in day column and ends at the
                // midpoint of the check-out day column, so its length is always
                // nights * cellWidth and a same-day changeover (one stay's check-out, the
                // next stay's check-in) meets exactly at that day's midpoint. Only clamp to
                // the grid edge when the stay actually continues outside the visible range.
                const left = continuesBefore ? 0 : startIdx * cellWidth + cellWidth / 2;
                const right = continuesAfter ? days.length * cellWidth : endIdx * cellWidth + cellWidth / 2;
                const width = right - left;

                // Guest bookings stay unlabeled (colour + hover tooltip only) to keep the
                // timeline calm; owner-use and blocked stays are always labelled since an
                // owner needs to recognise them at a glance without hovering.
                const alwaysLabelled = reservation.status !== "confirmed";
                const labelFits = alwaysLabelled && width > 56;
                const visual = barVisual(reservation.status, tone);
                return (
                  <div
                    key={reservation.id}
                    title={`${statusLabel(reservation.status)} · ${formatShortDate(reservation.checkIn)} – ${formatShortDate(reservation.checkOut)}`}
                    className={`absolute top-1/2 h-6 -translate-y-1/2 transition-[filter,transform] duration-150 hover:z-10 ${barToneClass} ${
                      visual.className
                    } ${continuesBefore ? "rounded-l-none" : "rounded-l-full"} ${
                      continuesAfter ? "rounded-r-none" : "rounded-r-full"
                    }`}
                    style={{
                      left,
                      width: Math.max(width, 6),
                      ...visual.style,
                    }}
                  >
                    {labelFits && (
                      <span
                        className={`pointer-events-none absolute inset-0 flex items-center justify-center truncate px-4 text-[11px] font-medium ${labelTextClass(reservation.status, tone)}`}
                      >
                        {statusLabel(reservation.status)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimelineLegend({
  statuses,
  tone = "default",
}: {
  statuses?: Array<ReservationStatus | "free">;
  tone?: TimelineTone;
} = {}) {
  const entries: Array<{ status: ReservationStatus | "free"; className: string; style?: CSSProperties }> =
    tone === "subtle"
      ? [
          { status: "confirmed", className: "bg-[#87977E]" },
          { status: "owner-use", className: "bg-[#52664E]" },
          { status: "blocked", className: "", style: BLOCKED_HATCH_STYLE },
          { status: "free", className: "border border-[#74736E]/30 bg-transparent" },
        ]
      : [
          { status: "confirmed", className: "bg-status-occupied" },
          { status: "free", className: "border border-ink/25 bg-transparent" },
          { status: "owner-use", className: "bg-status-owner" },
          { status: "blocked", className: "bg-status-blocked" },
        ];

  const visible = statuses ? entries.filter((entry) => statuses.includes(entry.status)) : entries;
  if (statuses && visible.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-soft">
      {visible.map((entry) => (
        <span key={entry.status} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${entry.className}`} style={entry.style} />
          {statusLabel(entry.status)}
        </span>
      ))}
    </div>
  );
}
