import type { Property } from "@/types";

interface HeroSectionProps {
  property: Property;
  periodLabel: string;
  subtitle: string;
}

export function HeroSection({ property, periodLabel, subtitle }: HeroSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-2xl italic text-ink sm:text-3xl">
        {property.name} <span className="text-ink-soft/50">·</span> {periodLabel}
      </h1>
      <p className="text-sm text-ink-soft">{subtitle}</p>
    </div>
  );
}
