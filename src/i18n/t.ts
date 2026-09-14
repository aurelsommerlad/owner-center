import type { Dictionary } from "./de";

/**
 * Typed dot-path over `Dictionary` (e.g. "navigation.dashboard" from the
 * spec, or "overview.occupancy" as it's actually named here) - built with
 * template literal types, no library. Every leaf in the dictionary is a
 * plain string, so this only ever recurses into nested objects and stops
 * at strings.
 */
type PathsOf<T> = {
  [K in Extract<keyof T, string>]: T[K] extends string ? K : `${K}.${PathsOf<T[K]>}`;
}[Extract<keyof T, string>];

export type TranslationKey = PathsOf<Dictionary>;

function resolve(dict: Dictionary, key: string): string {
  const value = key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object" && part in node) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : key;
}

/**
 * Binds a dictionary into a `t(key, vars?)` function - the
 * `t("navigation.dashboard")` call shape the spec asked for, without a
 * global/ambient dictionary (which would make server-rendering two
 * requests in different locales at once unsafe). `vars` does simple
 * `{name}` interpolation, e.g. t("overview.year", { year: 2026 }).
 */
export function createTranslator(dict: Dictionary) {
  return function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let text = resolve(dict, key);
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
      }
    }
    return text;
  };
}

export type Translator = ReturnType<typeof createTranslator>;
