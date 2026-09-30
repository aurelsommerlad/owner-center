"use client";

import { useState } from "react";
import type { Property } from "@/types";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import { PROFILE_LABEL_CLASS } from "@/components/profile/formStyles";

/**
 * The "alle Objekte" vs. "einzelne Objekte" choice shared by the invite
 * form and the "Berechtigung bearbeiten" edit form on the Abrechnungen
 * page's "Zugang für Buchhaltung" section - a plain uncontrolled form
 * fragment (radio `name="scope"` value "all"/"specific", checkboxes
 * `name="propertyIds"`) so both call sites' Server Actions can read it via
 * `formData.getAll(...)` without any client-side submit wiring here.
 */
export function PropertyScopePicker({
  properties,
  defaultAllProperties = true,
  defaultSelectedIds = [],
}: {
  properties: Property[];
  defaultAllProperties?: boolean;
  defaultSelectedIds?: string[];
}) {
  const { t } = useTranslations();
  const [allProperties, setAllProperties] = useState(defaultAllProperties);

  // A single-property owner has nothing to choose between - always "all"
  // (that one property), with no picker UI to show for it.
  if (properties.length <= 1) {
    return <input type="hidden" name="scope" value="all" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={PROFILE_LABEL_CLASS}>{t("accountingAccess.scope")}</span>
      <div className="flex gap-4 text-sm text-ink">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="scope"
            value="all"
            checked={allProperties}
            onChange={() => setAllProperties(true)}
          />
          {t("accountingAccess.scopeAll")}
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="scope"
            value="specific"
            checked={!allProperties}
            onChange={() => setAllProperties(false)}
          />
          {t("accountingAccess.scopeSpecific")}
        </label>
      </div>
      {!allProperties && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-line p-3">
          {properties.map((property) => (
            <label key={property.id} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="propertyIds"
                value={property.id}
                defaultChecked={defaultSelectedIds.includes(property.id)}
                className="h-4 w-4"
              />
              {property.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
