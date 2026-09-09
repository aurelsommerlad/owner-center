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

interface OccupancyTimelineProps {
  days: TimelineDay[];
  rows: TimelineRow[];
  today: string;
  cellWidth?: number;
  rowHeight?: number;
  unitColumnWidth?: number;
  className?: string;
}

const STATUS_BAR_CLASS: Record<ReservationStatus, string> = {
  confirmed: "bg-status-occupied",
  blocked: "bg-status-blocked",
  "owner-use": "bg-status-owner",
};

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
}: OccupancyTimelineProps) {
  const gridWidth = days.length * cellWidth;
  const todayIndex = dateIndex(today, days);

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
                  className={`flex shrink-0 flex-col items-center justify-center gap-0.5 border-b border-line py-1.5 text-[11px] ${
                    weekend ? "bg-paper-dim/60" : ""
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
              className="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-b border-line bg-paper pr-3"
              style={{ width: unitColumnWidth, height: rowHeight }}
            >
              <p className="text-sm font-medium text-ink">{row.unit.name}</p>
              <p className="text-xs text-ink-soft">
                {row.unit.minOccupancy}–{row.unit.maxOccupancy} Personen
              </p>
            </div>
            <div
              className="relative shrink-0 border-b border-line"
              style={{ width: gridWidth, height: rowHeight }}
            >
              {/* day separators + weekend shading */}
              <div className="pointer-events-none absolute inset-0 flex">
                {days.map((day) => {
                  const weekend = weekdayLabel(day.date) === "Sa" || weekdayLabel(day.date) === "So";
                  return (
                    <div
                      key={day.date}
                      className={`shrink-0 border-r border-line/70 ${weekend ? "bg-paper-dim/40" : ""}`}
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
                return (
                  <div
                    key={reservation.id}
                    title={`${statusLabel(reservation.status)} · ${formatShortDate(reservation.checkIn)} – ${formatShortDate(reservation.checkOut)}`}
                    className={`absolute top-1/2 h-6 -translate-y-1/2 shadow-sm transition-[filter,transform] duration-150 hover:z-10 hover:brightness-110 ${
                      STATUS_BAR_CLASS[reservation.status]
                    } ${continuesBefore ? "rounded-l-none" : "rounded-l-full"} ${
                      continuesAfter ? "rounded-r-none" : "rounded-r-full"
                    }`}
                    style={{
                      left,
                      width: Math.max(width, 6),
                    }}
                  >
                    {labelFits && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center truncate px-4 text-[11px] font-medium text-ink">
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

export function TimelineLegend() {
  const entries: Array<{ status: ReservationStatus | "free"; className: string }> = [
    { status: "confirmed", className: "bg-status-occupied" },
    { status: "free", className: "border border-ink/25 bg-transparent" },
    { status: "owner-use", className: "bg-status-owner" },
    { status: "blocked", className: "bg-status-blocked" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-soft">
      {entries.map((entry) => (
        <span key={entry.status} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${entry.className}`} />
          {statusLabel(entry.status)}
        </span>
      ))}
    </div>
  );
}
