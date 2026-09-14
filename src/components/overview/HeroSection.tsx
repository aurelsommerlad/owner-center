import type { Property } from "@/types";

interface HeroSectionProps {
  property: Property;
  periodLabel: string;
  subtitle: string;
  /** Time-of-day dashboard greeting, e.g. "Guten Morgen, Anna" (first name only) - already fully resolved (locale, time zone, name) by the caller. Omitted renders nothing, no reserved space. */
  greeting?: string;
}

export function HeroSection({ property, periodLabel, subtitle, greeting }: HeroSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      {greeting && <p className="text-xl font-normal text-[#74736E] sm:text-2xl">{greeting}</p>}
      <h1 className="font-display text-2xl italic text-ink sm:text-3xl">
        {property.name} <span className="text-ink-soft/50">·</span> {periodLabel}
      </h1>
      <p className="text-sm text-ink-soft">{subtitle}</p>
    </div>
  );
}
