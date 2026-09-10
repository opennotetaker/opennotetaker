// Which language the interface speaks.
//
// # Why a flat catalogue of dotted keys
//
// Nested objects read better in the file and worse everywhere else: a nested
// lookup is either stringly-typed (`t("home.hero.title")` with no checking) or
// needs a path type that TypeScript reports badly when it fails. A flat object
// keyed by dotted strings gives the best of both — the keys still read as a
// hierarchy, and `keyof Catalogue` makes a typo a compile error naming the
// exact key.
//
// # Why translations are complete or absent, never partial
//
// Every locale is typed as the full `Catalogue`, so `npm run typecheck` fails
// on a missing string rather than the interface silently falling back to
// English mid-sentence. A half-translated screen is worse than an English one:
// it reads as neglect, and in this product specifically it undermines the
// consent copy, which is the one place a reader has to trust the words exactly.
//
// A locale that genuinely cannot be finished belongs on a branch, not shipped
// at 80%.

import { de } from "../locales/de";
import { en } from "../locales/en";
import { es } from "../locales/es";
import { ja } from "../locales/ja";
import { ko } from "../locales/ko";
import { pt } from "../locales/pt";
import { zhHans } from "../locales/zh-Hans";
import { zhHant } from "../locales/zh-Hant";

/// Every key English has, mapped to any string.
///
/// `typeof en` on its own would not do: the English catalogue is `as const`, so
/// each of its values is a *literal* type, and a translation would have to
/// equal the English text to type-check. `Record<keyof …, string>` keeps the
/// half that matters -- a locale must supply every key -- and drops the half
/// that does not.
export type Catalogue = Record<keyof typeof en, string>;
export type Key = keyof Catalogue;
export type LocaleCode = "en" | "zh-Hans" | "zh-Hant" | "ja" | "ko" | "de" | "es" | "pt";

export interface Locale {
  code: LocaleCode;
  /// The endonym. Somebody looking for their own language looks for the word
  /// they call it, not for what English calls it.
  label: string;
  catalogue: Catalogue;
  /// Passed to `toLocaleString` for dates and times, so the whole interface
  /// agrees rather than the prose being Chinese and the timestamps American.
  intl: string;
}

/// The eight the suite ships, in the order the picker shows them.
///
/// A ninth is a permanent commitment: every string added to the product from
/// then on needs a translation in all of them, and a locale that falls behind
/// is a build error rather than a quiet gap. Do not add one casually.
///
/// Labels are endonyms and are never translated — somebody looking for their
/// own language looks for the word they call it, so 日本語 stays 日本語 in the
/// German picker.
export const LOCALES: Locale[] = [
  { code: "en", label: "English", catalogue: en, intl: "en" },
  { code: "zh-Hans", label: "简体中文", catalogue: zhHans, intl: "zh-Hans" },
  { code: "zh-Hant", label: "繁體中文", catalogue: zhHant, intl: "zh-Hant" },
  { code: "ja", label: "日本語", catalogue: ja, intl: "ja" },
  { code: "ko", label: "한국어", catalogue: ko, intl: "ko" },
  { code: "de", label: "Deutsch", catalogue: de, intl: "de" },
  { code: "es", label: "Español", catalogue: es, intl: "es" },
  { code: "pt", label: "Português", catalogue: pt, intl: "pt" },
];

const STORAGE_KEY = "opennotetaker.locale";

let active: Locale = LOCALES[0]!;

/// Pick a locale from what the browser says, before any stored preference.
///
/// Script matters more than region here. `zh-TW`, `zh-HK` and `zh-MO` are
/// Traditional; `zh-CN`, `zh-SG` and a bare `zh` are Simplified. Matching on
/// the region alone would hand a Taipei reader Simplified characters, which
/// reads as carelessness to exactly the audience the distinction is for.
export function detect(): LocaleCode {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const lower = (tag ?? "").toLowerCase();
    if (!lower) continue;

    // Chinese first, because it is the one where the region is the wrong
    // thing to match on. `zh-TW`, `zh-HK` and `zh-MO` are Traditional; `zh-CN`,
    // `zh-SG` and a bare `zh` are Simplified. Falling through to the base
    // language would hand a Taipei reader Simplified characters, which reads
    // as carelessness to exactly the audience the distinction is for.
    if (lower.startsWith("zh")) {
      return lower.includes("hant") || /-(tw|hk|mo)\b/.test(lower) ? "zh-Hant" : "zh-Hans";
    }

    // Then widen: the exact tag, then the base language. A browser asking for
    // `pt-BR`, `es-419` or `de-AT` gets Portuguese, Spanish and German rather
    // than falling all the way to English — matching on equality alone is why
    // this used to answer English for every language but two.
    const exact = LOCALES.find((locale) => locale.code.toLowerCase() === lower);
    if (exact) return exact.code;
    const base = lower.split("-")[0];
    const wider = LOCALES.find((locale) => locale.code.toLowerCase() === base);
    if (wider) return wider.code;
  }
  return "en";
}

export function localeOf(code: string): Locale {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0]!;
}

export function current(): Locale {
  return active;
}

export function setLocale(code: LocaleCode): void {
  active = localeOf(code);
  document.documentElement.lang = active.intl;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // A private window or storage the browser refuses. The choice holds for
    // this session and is simply not remembered, which is a smaller failure
    // than refusing to switch language at all.
  }
}

/// The stored choice, else what the browser asks for.
export function initialLocale(): LocaleCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LOCALES.some((l) => l.code === stored)) return stored as LocaleCode;
  } catch {
    // Fall through to detection.
  }
  return detect();
}

/// One string, with `{name}` placeholders substituted.
///
/// Placeholders are named rather than positional because word order is exactly
/// what changes between languages: "3 of 8 checked" and "共 8 项，已完成 3 项"
/// carry the same two numbers in the opposite order, and a positional
/// substitution would silently swap them.
export function t(key: Key, vars?: Record<string, string | number>): string {
  const template = active.catalogue[key] ?? en[key] ?? String(key);
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/// A date in the reader's language and their own timezone.
export function formatDate(ms: number, options: Intl.DateTimeFormatOptions): string {
  return new Date(ms).toLocaleString(active.intl, options);
}

/// The label set the Rust exporters need, so a document exported from a
/// Chinese interface is a Chinese document rather than Chinese text under
/// English headings.
///
/// Assembled here rather than in the export panel because `note-export`
/// requires every field, and a missing one would surface at the wasm boundary
/// as an opaque parse error rather than as a missing translation.
export function exportLabels(): Record<string, string> {
  return {
    summary: t("export.label.summary"),
    key_points: t("export.label.keyPoints"),
    decisions: t("export.label.decisions"),
    action_items: t("export.label.actionItems"),
    questions_asked: t("export.label.questionsAsked"),
    questions_open: t("export.label.questionsOpen"),
    topics: t("export.label.topics"),
    who_spoke: t("export.label.whoSpoke"),
    transcript: t("export.label.transcript"),
    consent: t("export.label.consent"),
    unknown_speaker: t("export.label.unknown"),
    due: t("export.label.due"),
    stats: t("export.label.stats"),
  };
}
