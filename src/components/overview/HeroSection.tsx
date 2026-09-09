import type { Owner, Property } from "@/types";
import { Card } from "@/components/ui/Card";
import { PropertyVisual } from "@/components/ui/PropertyVisual";

interface HeroSectionProps {
  property: Property;
  owner: Owner;
}

export function HeroSection({ property, owner }: HeroSectionProps) {
  return (
    <Card className="flex items-center gap-4 px-5 py-3.5 shadow-none sm:gap-5 sm:px-7 sm:py-4">
      <div className="relative hidden h-11 w-11 shrink-0 overflow-hidden rounded-xl sm:block">
        <PropertyVisual seed={property.imageSeed} tone="dark" className="absolute inset-0" />
      </div>
      <p className="font-display text-xl italic text-ink sm:text-2xl">
        Hallo {owner.greetingName}
      </p>
    </Card>
  );
}
