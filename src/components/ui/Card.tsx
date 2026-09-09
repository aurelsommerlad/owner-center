import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`min-w-0 rounded-3xl border border-line bg-paper shadow-soft ${className}`}
      {...props}
    />
  );
}
