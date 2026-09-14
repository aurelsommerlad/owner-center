"use client";

import { useState } from "react";
import { changePasswordAction } from "@/app/[propertyId]/profil/actions";
import { PROFILE_INPUT_CLASS, PROFILE_LABEL_CLASS } from "./formStyles";
import { useTranslations } from "@/components/i18n/LocaleProvider";

export function PasswordChangeCard() {
  const { t } = useTranslations();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await changePasswordAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    setFormKey((key) => key + 1); // remounts the form below, clearing every field
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-ink">{t("profile.changePassword")}</p>
      <form key={formKey} action={handleSubmit} className="mt-3 flex flex-col gap-3 sm:max-w-sm">
        <label className="flex flex-col gap-1.5">
          <span className={PROFILE_LABEL_CLASS}>{t("profile.currentPassword")}</span>
          <input
            type="password"
            name="currentPassword"
            required
            autoComplete="current-password"
            className={PROFILE_INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={PROFILE_LABEL_CLASS}>{t("profile.newPassword")}</span>
          <input
            type="password"
            name="newPassword"
            required
            minLength={10}
            autoComplete="new-password"
            className={PROFILE_INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={PROFILE_LABEL_CLASS}>{t("profile.repeatNewPassword")}</span>
          <input
            type="password"
            name="newPasswordConfirm"
            required
            minLength={10}
            autoComplete="new-password"
            className={PROFILE_INPUT_CLASS}
          />
        </label>
        {error && <p className="text-sm text-ink-soft">{error}</p>}
        {message && <p className="text-sm text-ink-soft">{message}</p>}
        <div className="mt-1 flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t("common.saving") : t("profile.changePassword")}
          </button>
        </div>
      </form>
    </div>
  );
}
