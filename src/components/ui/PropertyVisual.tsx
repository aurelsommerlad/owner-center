/**
 * Deterministic, art-directed placeholder visual standing in for real
 * property/unit photography in V1. Renders a quiet abstract duotone motif
 * (soft glow + fine hairlines) from a seed string so the same unit always
 * looks the same. Swap for next/image with real photo URLs once available —
 * call sites only pass `seed`, so this is the single place that changes.
 */
function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

interface PropertyVisualProps {
  seed: string;
  tone?: "dark" | "light";
  className?: string;
}

export function PropertyVisual({ seed, tone = "dark", className = "" }: PropertyVisualProps) {
  const hash = hashSeed(seed);
  const glowX = 20 + (hash % 61);
  const glowY = 10 + ((hash >> 4) % 40);
  const angle = 100 + ((hash >> 8) % 40);
  const spacing = 22 + ((hash >> 12) % 14);

  const isDark = tone === "dark";
  const base = isDark
    ? "linear-gradient(160deg, #23221a 0%, #17160f 55%, #0f0e0a 100%)"
    : "linear-gradient(160deg, #f1efe8 0%, #e7e0d2 100%)";
  const glowColor = isDark ? "rgba(250,248,244,0.16)" : "rgba(23,22,15,0.09)";
  const lineColor = isDark ? "rgba(250,248,244,0.07)" : "rgba(23,22,15,0.06)";

  const backgroundImage = [
    `radial-gradient(circle at ${glowX}% ${glowY}%, ${glowColor}, transparent 55%)`,
    `repeating-linear-gradient(${angle}deg, ${lineColor} 0px, ${lineColor} 1px, transparent 1px, transparent ${spacing}px)`,
    base,
  ].join(", ");

  return (
    <div
      className={className}
      style={{ backgroundImage }}
      aria-hidden="true"
    />
  );
}
