// Shared classNames for Admin form fields - rounded-xl/border-line/bg-paper
// matches the radius Owner Center already uses for nav items and dropdown
// panels, so text inputs (which Owner Center itself never needed before)
// still read as the same design language rather than a new one.
export const ADMIN_INPUT_CLASS =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-ink";

export const ADMIN_SELECT_CLASS = ADMIN_INPUT_CLASS;

export const ADMIN_LABEL_CLASS = "text-[11px] uppercase tracking-[0.08em] text-ink-soft";
