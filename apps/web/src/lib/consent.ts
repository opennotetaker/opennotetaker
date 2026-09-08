// The consent gate, which is the product's first claim rather than its fine
// print.
//
// §4 空白2 of the competitor research: four of the nine competitors with
// reviewable feedback are complained at over recording consent, one of them
// faced a class action over it, and *not one* markets consent as a feature.
// §9 切入点1 makes that the primary wedge, with a specific warning attached --
// that legal-sounding copy will read as complexity to the non-technical user
// this product is for, so it must be one step, plain language, and visual.
//
// That warning is the whole design brief for this file:
//
// - **One step, not a wall of text.** Three fields and a button.
// - **Unskippable, but not onerous.** The recorder will not start without it,
//   and it takes about six seconds to complete.
// - **Words a person would say**, and a script the user can read aloud, since
//   the hard part of consent is not agreeing to it -- it is remembering to
//   ask.
// - **A record that outlives the app.** What was agreed, when, by whom, and
//   the exact wording that was on screen, stored with the note and rendered
//   into every document export.
//
// The last point is what makes this more than a dialog. A checkbox somebody
// clicked is not evidence of anything a month later; a line in the exported
// minutes is.

import { t } from "./i18n";
import type { ConsentRecord } from "../types";

/// The wording shown above the confirm button, stored verbatim with each
/// record.
///
/// Copied into the record rather than referenced by version, so that changing
/// this string later cannot retroactively rewrite what somebody agreed to --
/// which is exactly the move this feature exists to distinguish itself from.
export function disclosure(): string {
  return t("consent.disclosure");
}

/// What the user reads out before pressing record.
///
/// Offered because the friction in consent is social, not legal: people do not
/// object to asking, they freeze on the wording. Twenty-two words removes that.
export function spokenScript(): string {
  return t("consent.script");
}

export type Method = ConsentRecord["method"];

/// The methods, in the reader's language.
///
/// A function rather than a constant: the labels have to be re-read after the
/// language changes, and a module-level array would freeze whichever locale
/// happened to be active when the module first loaded.
export function methods(): { value: Method; label: string; hint: string }[] {
  return [
    {
      value: "announced",
      label: t("consent.method.announced"),
      hint: t("consent.method.announcedHint"),
    },
    {
      value: "written",
      label: t("consent.method.written"),
      hint: t("consent.method.writtenHint"),
    },
    { value: "solo", label: t("consent.method.solo"), hint: t("consent.method.soloHint") },
  ];
}

export interface Draft {
  participants: string;
  method: Method;
  captured: string[];
}

/// Whether a draft is complete enough to start recording.
///
/// The only requirement is a method. Naming participants is offered and
/// encouraged, not demanded: a product that refuses to record until you have
/// typed five names is one people work around, and a consent step people work
/// around protects nobody.
export function isComplete(draft: Draft): boolean {
  return methods().some((method) => method.value === draft.method);
}

export function record(draft: Draft): ConsentRecord {
  return {
    at: localIso(new Date()),
    participants: draft.participants.trim(),
    disclosure: disclosure(),
    captured: [...draft.captured],
    method: draft.method,
  };
}

/// An ISO 8601 timestamp carrying the recorder's own offset.
///
/// `toISOString()` returns UTC, which is correct and useless: "was this
/// recorded during working hours" is a question about the recorder's clock,
/// and a consent record that cannot answer it is missing the part somebody
/// would actually check.
export function localIso(when: Date): string {
  const offset = -when.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const pad = (value: number) => String(Math.floor(Math.abs(value))).padStart(2, "0");
  const local = new Date(when.getTime() + offset * 60_000);
  return (
    `${local.toISOString().slice(0, 19)}` +
    `${sign}${pad(offset / 60)}:${pad(offset % 60)}`
  );
}

/// The record as a paragraph, for document exports.
///
/// Prose rather than a field list, because this is read by a person opening
/// the minutes six weeks later, not parsed.
export function describe(consent: ConsentRecord): string {
  const method = methods().find((m) => m.value === consent.method);
  const parts: string[] = [t("consent.record.at", { at: consent.at })];
  if (consent.method === "solo") {
    parts.push(t("consent.record.solo"));
  } else {
    parts.push(t("consent.record.method", { method: method?.label ?? consent.method }));
  }
  if (consent.participants) {
    parts.push(t("consent.record.present", { names: consent.participants }));
  }
  if (consent.captured.length) {
    parts.push(t("consent.record.captured", { sources: consent.captured.join(", ") }));
  }
  // The disclosure is quoted from the record, not from the current catalogue:
  // it is what this person actually agreed to, in the language they agreed to
  // it in, and re-rendering it from today's strings would be the exact move
  // this feature exists to distinguish itself from.
  parts.push(t("consent.record.told", { disclosure: consent.disclosure }));
  return parts.join(" ");
}
