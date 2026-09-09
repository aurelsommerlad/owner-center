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
    <Card className="overflow-hidden">
      <div className="relative h-52 sm:h-64 lg:h-72">
        <PropertyVisual seed={property.imageSeed} tone="dark" className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <p className="font-display text-3xl italic text-paper sm:text-4xl">{property.name}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-paper/85">
            <MapPinIcon className="h-4 w-4" />
            {property.location.city}, {property.location.region}
          </p>
        </div>
      </div>
      <div className="px-6 py-6 sm:px-8 sm:py-7">
        <p className="font-display text-2xl italic text-ink sm:text-[28px]">
          Hallo {owner.greetingName}
        </p>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Hier finden Sie alle wichtigen Informationen zu Ihrem Objekt auf einen Blick.
        </p>
      </div>
    </Card>
  );
}
