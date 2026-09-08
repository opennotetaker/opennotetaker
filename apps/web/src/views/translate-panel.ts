// Translating a finished transcript into any language.
//
// §5.2 marks cross-language translation as an opportunity with an uncertain
// cost type -- "a local model or an external API". Both answers are true, and
// this app gives both:
//
// - **Into English, free**, done during transcription. That is Whisper's own
//   `translate` task, running in the tab, and it is offered on the Start
//   screen rather than here.
// - **Into anything else, paid**, on the vendor key the summariser uses. That
//   is this panel.
//
// Saying so out loud matters: a user whose target language is English should
// be told they can have it for nothing, not sold the paid route because it is
// the one with a button.
//
// # Why the reply is checked line by line
//
// Each line is pinned to a timestamp nobody recomputes. A model that returns
// 59 translations for 60 lines desynchronises everything after the mistake --
// so a miscount is refused by the gateway rather than padded, and the user is
// not charged.

import * as engine from "../engine";
import { el, mount } from "../lib/dom";
import { t } from "../lib/i18n";
import { jobKey, translateOnBackend } from "../lib/account";
import type { App } from "../main";
import type { Note } from "../types";
import { errorNote } from "./summary-panel";

/// A short list of language names, in the spelling models handle best.
///
/// Names rather than BCP-47 codes: a model given "Simplified Chinese" is more
/// reliable than one given "zh-Hans", and the interface has the name anyway.
const TARGETS = [
  "English",
  "Simplified Chinese",
  "Traditional Chinese",
  "Spanish",
  "Hindi",
  "Arabic",
  "Portuguese",
  "French",
  "German",
  "Japanese",
  "Korean",
  "Russian",
  "Indonesian",
  "Italian",
  "Vietnamese",
  "Thai",
];

export function renderTranslatePanel(app: App, note: Note, redraw: () => void): Node {
  const target = el("select", { style: "width:auto" }, ...TARGETS.map((name) => el("option", name))) as HTMLSelectElement;
  const status = el("div");
  const priceNote = el("span.small.muted");
  const go = el("button.primary", t("translate.go", { price: "" }));

  const lines = () => note.transcript.segments.map((segment) => segment.text);

  const reprice = () => {
    const quote = engine.quoteForTranslation(lines(), target.value);
    go.textContent = t("translate.go", { price: engine.priceLabel(quote.credits) });
    priceNote.textContent =
      target.value === "English"
        ? t("translate.englishIsFree")
        : t("translate.batches", {
            lines: note.transcript.segments.length,
            size: engine.translationBatch(),
          });
  };

  target.addEventListener("change", reprice);
  reprice();

  go.addEventListener("click", async () => {
    go.disabled = true;
    const all = lines();
    const size = engine.translationBatch();
    const translated: string[] = [];
    try {
      for (let start = 0; start < all.length; start += size) {
        const batch = all.slice(start, start + size);
        mount(
          status,
          el(
            "p.small.muted",
            t("translate.progress", {
              from: start + 1,
              to: Math.min(all.length, start + size),
              total: all.length,
            }),
          ),
        );
        const result = await translateOnBackend(
          batch,
          target.value,
          note.transcript.language,
          // Keyed on the batch itself, so a retry after a dropped response
          // replays that batch's charge rather than paying twice for it -- and
          // a resumed run does not re-bill the batches that already landed.
          jobKey("translate", note.id, target.value, String(start), String(batch.length)),
        );
        translated.push(...result.translations);
      }

      // Applied as a new note rather than over the original: a translation is
      // a different document, and overwriting the transcript would destroy the
      // thing the timestamps actually describe.
      const copy: Note = {
        ...note,
        id: `${note.id}-${target.value.toLowerCase().replace(/\s+/g, "-")}`,
        title: `${note.title} (${target.value})`,
        created: Date.now(),
        updated: Date.now(),
        audio: null,
        audioType: null,
        aiSummary: null,
        transcript: {
          ...note.transcript,
          language: target.value,
          segments: note.transcript.segments.map((segment, index) => ({
            ...segment,
            text: translated[index] ?? segment.text,
          })),
        },
      };
      copy.summary = engine.summariseLocal(copy.transcript);
      await app.save(copy);
      mount(
        status,
        el(
          "div.note.good",
          el("span", t("translate.done")),
          el("a", { href: `#/note/${copy.id}` }, t("translate.open", { title: copy.title })),
        ),
      );
      redraw();
    } catch (error) {
      mount(status, errorNote(app, error as Error));
    } finally {
      go.disabled = false;
    }
  });

  return el(
    "details.reveal",
    { style: "margin-top:1rem" },
    el("summary", t("translate.heading")),
    el("div.row", target, go, priceNote),
    status,
    el(
      "p.small.faint",
      { style: "margin:.75rem 0 0" },
      t("translate.note"),
    ),
  );
}
