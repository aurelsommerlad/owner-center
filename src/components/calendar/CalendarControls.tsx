"use client";

import { useRouter } from "next/navigation";
import type { Unit } from "@/types";
import { MOCK_TODAY } from "@/lib/config";
import { shiftAnchor, type CalendarViewType } from "@/lib/calendarView";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

interface CalendarControlsProps {
  propertyId: string;
  view: CalendarViewType;
  anchor: string;
  label: string;
  units: Unit[];
  selectedUnitId?: string;
}

const VIEW_OPTIONS: Array<{ value: CalendarViewType; label: string }> = [
  { value: "month", label: "Monat" },
  { value: "twoWeeks", label: "14 Tage" },
  { value: "week", label: "Woche" },
];

function buildQuery(view: CalendarViewType, anchor: string, unitId?: string): string {
  const params = new URLSearchParams({ view, anchor });
  if (unitId) params.set("unit", unitId);
  return params.toString();
}

export function CalendarControls({
  propertyId,
  view,
  anchor,
  label,
  units,
  selectedUnitId,
}: CalendarControlsProps) {
  const router = useRouter();

  function go(nextView: CalendarViewType, nextAnchor: string) {
    router.push(`/${propertyId}/kalender?${buildQuery(nextView, nextAnchor, selectedUnitId)}`);
  }

  function goToPrevious() {
    go(view, shiftAnchor(view, anchor, -1));
  }

  function goToNext() {
    go(view, shiftAnchor(view, anchor, 1));
  }

  function goToToday() {
    go(view, MOCK_TODAY);
  }

  function onViewChange(nextView: CalendarViewType) {
    go(nextView, anchor);
  }

  function onUnitChange(nextUnitId: string) {
    router.push(
      `/${propertyId}/kalender?${buildQuery(view, anchor, nextUnitId === "all" ? undefined : nextUnitId)}`
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goToPrevious}
          aria-label="Vorheriger Zeitraum"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <p className="min-w-[150px] text-center font-display text-xl italic text-ink">{label}</p>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Nächster Zeitraum"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={goToToday}
          className="ml-1 rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          Heute
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-0.5 rounded-full border border-line bg-paper p-1">
          {VIEW_OPTIONS.map((option) => {
            const active = option.value === view;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onViewChange(option.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  active ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <select
          value={selectedUnitId ?? "all"}
          onChange={(event) => onUnitChange(event.target.value)}
          className="rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-medium text-ink-soft outline-none transition-colors hover:border-ink focus:border-ink"
        >
          <option value="all">Alle Einheiten</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
