import type { Property } from "@/types";

interface HeroSectionProps {
  property: Property;
  periodLabel: string;
  subtitle: string;
  /** Time-of-day dashboard greeting, e.g. "Guten Morgen, Anna" (first name only) - already fully resolved (locale, time zone, name) by the caller. Omitted renders nothing, no reserved space. */
  greeting?: string;
}

/**
 * Some Property.name values carry a trailing "by UNIQUE PLACES" (e.g.
 * "LÆKE by UNIQUE PLACES") - redundant on this specific header since the
 * brand is already shown in the sidebar. Stripped for display here only;
 * every other page/component (admin, sidebar, property switcher, ...)
 * keeps showing the real stored name unchanged.
 */
function displayPropertyName(name: string): string {
  return name.replace(/\s*by\s+unique\s+places\s*/gi, " ").trim();
}

export function HeroSection({ property, periodLabel, subtitle, greeting }: HeroSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      {greeting && <p className="text-xl font-normal text-[#74736E]">{greeting}</p>}
      <h1 className="font-display text-3xl italic text-ink">
        {displayPropertyName(property.name)} <span className="text-ink-soft/50">·</span> {periodLabel}
      </h1>
      <p className="text-sm text-ink-soft">{subtitle}</p>
    </div>
  );
}
