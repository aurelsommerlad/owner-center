import type { Owner, Property } from "@/types";
import { Card } from "@/components/ui/Card";
import { PropertyVisual } from "@/components/ui/PropertyVisual";
import { MapPinIcon } from "@/components/ui/icons";

interface HeroSectionProps {
  property: Property;
  owner: Owner;
}

export function HeroSection({ property, owner }: HeroSectionProps) {
  return (
    <Card className="flex items-center gap-4 px-5 py-4 sm:gap-5 sm:px-7 sm:py-5">
      <div className="relative hidden h-14 w-14 shrink-0 overflow-hidden rounded-2xl sm:block">
        <PropertyVisual seed={property.imageSeed} tone="dark" className="absolute inset-0" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-xl italic text-ink sm:text-2xl">
          Hallo {owner.greetingName}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-ink-soft">
          <span className="font-medium text-ink">{property.name}</span>
          <span aria-hidden="true" className="text-ink-soft/50">
            ·
          </span>
          <span className="flex items-center gap-1">
            <MapPinIcon className="h-3.5 w-3.5" />
            {property.location.city}, {property.location.region}
          </span>
        </p>
      </div>
    </Card>
  );
}
