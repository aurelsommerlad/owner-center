import type { HTMLAttributes } from "react";

/**
 * Admin's own card primitive - deliberately not the Owner Center's
 * `Card` component. It uses the same UNIQUE PLACES palette but as literal
 * hex values, so the admin area never depends on (or risks being changed
 * by) the Owner Center's design tokens, and stays visually a little more
 * compact/functional as specified.
 */
export function AdminCard({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-[#E4E0D8] bg-[#F1EDE4] ${className}`}
      {...props}
    />
  );
}
