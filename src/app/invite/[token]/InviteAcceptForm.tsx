"use client";

import { useState } from "react";
import { acceptInvitationAction } from "./actions";

const INPUT_CLASS =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-ink";
const LABEL_CLASS = "text-[11px] uppercase tracking-[0.08em] text-ink-soft";

export function InviteAcceptForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    // On success acceptInvitationAction() redirects server-side (throws
    // internally) and this call never resolves with a value - only a
    // rejected submission (wrong password rules, expired link, ...) reaches
    // here, matching src/app/login/LoginForm.tsx's pattern.
    const result = await acceptInvitationAction(token, formData);
    setPending(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Neues Passwort</span>
        <input
          type="password"
          name="password"
          required
          minLength={10}
          autoComplete="new-password"
          autoFocus
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Passwort wiederholen</span>
        <input
          type="password"
          name="passwordConfirm"
          required
          minLength={10}
          autoComplete="new-password"
          className={INPUT_CLASS}
        />
      </label>

      {error && <p className="text-sm text-ink-soft">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Wird gespeichert…" : "Zugang aktivieren"}
      </button>
    </form>
  );
}
