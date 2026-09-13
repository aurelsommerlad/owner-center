import type { CSSProperties } from "react";
import type { Reservation, ReservationStatus, Unit } from "@/types";
import { dayOfMonth, formatDateRange, nightsBetween, weekdayLabel } from "@/lib/dates";

export interface TimelineDay {
  date: string;
}

export interface TimelineRow {
  unit: Unit;
  reservations: Reservation[];
}

interface OccupancyTimelineProps {
  days: TimelineDay[];
  rows: TimelineRow[];
  today: string;
  cellWidth?: number;
  rowHeight?: number;
  unitColumnWidth?: number;
  className?: string;
  /** Shortens the reservation-nights label to "4 N." instead of "4 Nächte" for the compact Übersicht widget. */
  compactLabels?: boolean;
}

/** Calendar-local labels - independent of the shared statusLabel() used elsewhere in the app. */
const CALENDAR_STATUS_LABEL: Record<ReservationStatus | "free", string> = {
  confirmed: "Reservierung",
  blocked: "Blockiert",
  "owner-use": "Eigennutzung",
  free: "Frei",
};

const BLOCKED_HATCH_STYLE: CSSProperties = {
  backgroundColor: "#E4E0D8",
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(116,115,110,0.35) 3px, rgba(116,115,110,0.35) 4px)",
};

const RESERVATION_BAR_STYLE: CSSProperties = { backgroundColor: "rgba(116, 115, 110, 0.55)" };

function barVisual(status: ReservationStatus): { className: string; style?: CSSProperties } {
  if (status === "owner-use") return { className: "bg-[#52664E]" };
  if (status === "blocked") return { className: "", style: BLOCKED_HATCH_STYLE };
  return { className: "", style: RESERVATION_BAR_STYLE };
}

/** Bar label text - nights for a normal stay, the fixed status label for owner-use, nothing for blocked (kept quiet). */
function barLabel(reservation: Reservation, compactLabels: boolean): string | null {
  if (reservation.status === "owner-use") return CALENDAR_STATUS_LABEL["owner-use"];
  if (reservation.status === "blocked") return null;
  const nights = nightsBetween(reservation.checkIn, reservation.checkOut);
  return compactLabels ? `${nights} N.` : `${nights} ${nights === 1 ? "Nacht" : "Nächte"}`;
}

function dateIndex(iso: string, days: TimelineDay[]): number {
  const idx = days.findIndex((day) => day.date === iso);
  if (idx !== -1) return idx;
  return iso < days[0].date ? 0 : days.length;
}

export function OccupancyTimeline({
  days,
  rows,
  today,
  cellWidth = 44,
  rowHeight = 46,
  unitColumnWidth = 132,
  className = "",
  compactLabels = false,
}: OccupancyTimelineProps) {
  const gridWidth = days.length * cellWidth;
  const todayIndex = dateIndex(today, days);

  // Small fixed inset shaved off both ends of every bar so two stays that
  // meet at the same day's midpoint (one check-out, the next check-in)
  // read as two distinct bars instead of visually merging into one -
  // purely a rendering adjustment, the underlying midpoint math is untouched.
  const BAR_GAP = 1.5;

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div style={{ width: unitColumnWidth + gridWidth, minWidth: "100%" }}>
        {/* Header row */}
        <div className="flex">
          <div className="sticky left-0 z-10 shrink-0 bg-paper" style={{ width: unitColumnWidth }} />
          <div className="relative flex" style={{ width: gridWidth }}>
            {days.map((day) => {
              const isToday = day.date === today;
              const weekend = weekdayLabel(day.date) === "Sa" || weekdayLabel(day.date) === "So";
              return (
                <div
                  key={day.date}
                  className={`flex shrink-0 flex-col items-center justify-center gap-0.5 border-b border-[#E4E0D8] py-1.5 text-[11px] ${
                    weekend ? "bg-[#F1EDE4]/45" : ""
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
        {rows.map((row, rowIndex) => (
          <div key={row.unit.id} className="flex">
            <div
              className="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-b border-[#E4E0D8] bg-paper pr-3"
              style={{ width: unitColumnWidth, height: rowHeight }}
            >
              <p className="text-sm font-medium text-ink">{row.unit.name}</p>
              <p className="text-xs text-ink-soft">
                {row.unit.minOccupancy}–{row.unit.maxOccupancy} Personen
              </p>
            </div>
            <div className="relative shrink-0 border-b border-[#E4E0D8]" style={{ width: gridWidth, height: rowHeight }}>
              {/* day separators + weekend shading */}
              <div className="pointer-events-none absolute inset-0 flex">
                {days.map((day) => {
                  const weekend = weekdayLabel(day.date) === "Sa" || weekdayLabel(day.date) === "So";
                  return (
                    <div
                      key={day.date}
                      className={`shrink-0 border-r border-[#E4E0D8]/50 ${weekend ? "bg-[#F1EDE4]/30" : ""}`}
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
                const rawWidth = right - left;

                const visualLeft = left + BAR_GAP;
                const visualWidth = Math.max(rawWidth - BAR_GAP * 2, 4);

                const label = barLabel(reservation, compactLabels);
                const labelFits = label !== null && rawWidth > 56;
                const visual = barVisual(reservation.status);
                const nights = nightsBetween(reservation.checkIn, reservation.checkOut);
                const tooltipHeading =
                  reservation.status === "blocked" ? null : CALENDAR_STATUS_LABEL[reservation.status];
                // The grid's horizontal scroll container clips vertical overflow too (a CSS
                // side effect of overflow-x: auto), so a tooltip popping up above the very
                // first row would be cut off - render it below the bar there instead.
                const tooltipBelow = rowIndex === 0;

                return (
                  <div
                    key={reservation.id}
                    className="group absolute top-1/2 h-5 -translate-y-1/2 hover:z-20"
                    style={{ left: visualLeft, width: visualWidth }}
                  >
                    <div
                      className={`h-full w-full transition-[filter] duration-150 group-hover:brightness-105 ${
                        visual.className
                      } ${continuesBefore ? "rounded-l-none" : "rounded-l-md"} ${
                        continuesAfter ? "rounded-r-none" : "rounded-r-md"
                      }`}
                      style={visual.style}
                    >
                      {labelFits && (
                        <span className="pointer-events-none flex h-full items-center justify-center truncate px-3 text-[11px] font-medium text-[#FAFAF7]">
                          {label}
                        </span>
                      )}
                    </div>

                    {tooltipHeading && (
                      <div
                        className={`pointer-events-none absolute left-1/2 z-30 hidden w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-line bg-paper px-3 py-2 text-left opacity-0 shadow-soft-lg transition-opacity duration-150 group-hover:opacity-100 sm:block ${
                          tooltipBelow ? "top-full mt-2" : "bottom-full mb-2"
                        }`}
                      >
                        <p className="text-xs font-semibold text-ink">{tooltipHeading}</p>
                        <p className="mt-0.5 text-xs text-ink-soft">
                          {formatDateRange(reservation.checkIn, reservation.checkOut)}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {nights} {nights === 1 ? "Nacht" : "Nächte"}
                        </p>
                        {reservation.occupancy && (
                          <p className="mt-0.5 text-xs text-ink-soft">{reservation.occupancy}</p>
                        )}
                      </div>
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

export function TimelineLegend() {
  const entries: Array<{ status: ReservationStatus | "free"; className: string; style?: CSSProperties }> = [
    { status: "confirmed", className: "", style: RESERVATION_BAR_STYLE },
    { status: "owner-use", className: "bg-[#52664E]" },
    { status: "blocked", className: "", style: BLOCKED_HATCH_STYLE },
    { status: "free", className: "border border-[#74736E]/30 bg-transparent" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-soft">
      {entries.map((entry) => (
        <span key={entry.status} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${entry.className}`} style={entry.style} />
          {CALENDAR_STATUS_LABEL[entry.status]}
        </span>
      ))}
    </div>
  );
}
