"use client";

import { useState } from "react";
import { updateProfileAction } from "@/app/[propertyId]/profil/actions";
import { PROFILE_INPUT_CLASS, PROFILE_LABEL_CLASS } from "./formStyles";
import { useTranslations } from "@/components/i18n/LocaleProvider";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

/**
 * "Persönliche Daten" -> Anzeigen/Bearbeiten. Owner-/Firmenname is always
 * read-only here - it lives on Owner, not on this user, and stays
 * admin-managed (see the master-data edit in /admin/owners/[id]).
 */
export function PersonalDataCard({
  propertyId,
  self,
  ownerName,
  ownerCompanyName,
}: {
  propertyId: string;
  self: { firstName: string; lastName: string; email: string };
  ownerName: string;
  ownerCompanyName?: string;
}) {
  const { t } = useTranslations();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [current, setCurrent] = useState(self);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await updateProfileAction(propertyId, formData);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCurrent({
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
    });
    setEditing(false);
    setMessage(result.message);
    setTimeout(() => setMessage(null), 4000);
  }

  if (!editing) {
    return (
      <div className="mt-4">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label={t("profile.name")} value={`${current.firstName} ${current.lastName}`} />
          <Field label={t("profile.email")} value={current.email} />
          <Field label={t("profile.ownerCompany")} value={ownerCompanyName ?? ownerName} />
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            {t("common.edit")}
          </button>
          {message && <span className="text-xs text-ink-soft">{message}</span>}
        </div>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="mt-4 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={PROFILE_LABEL_CLASS}>{t("profile.firstName")}</span>
          <input name="firstName" required defaultValue={current.firstName} className={PROFILE_INPUT_CLASS} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={PROFILE_LABEL_CLASS}>{t("profile.lastName")}</span>
          <input name="lastName" required defaultValue={current.lastName} className={PROFILE_INPUT_CLASS} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={PROFILE_LABEL_CLASS}>{t("profile.email")}</span>
          <input type="email" name="email" required defaultValue={current.email} className={PROFILE_INPUT_CLASS} />
        </label>
      </div>
      {error && <p className="text-sm text-ink-soft">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </form>
  );
}
