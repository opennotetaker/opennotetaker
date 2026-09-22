// The pipeline both entry points share: audio in, a stored note out.
//
// Recording and importing differ in how they get their PCM and in whether
// there is a consent record. Everything after that -- transcribe, diarize,
// summarise, store -- is identical, and lives here so the two paths cannot
// drift into producing subtly different notes.
//
// # Why the progress reporting is this detailed
//
// The first transcription on a new device downloads a model and then runs it,
// and on the WebAssembly backend that is minutes. A spinner over minutes is
// indistinguishable from a hang, and the user's next move is to reload -- which
// discards the download they were waiting for. So each stage says what it is
// doing and, where it can, how far along it is.

import * as engine from "../engine";
import { el, mount } from "../lib/dom";
import { t } from "../lib/i18n";
import { transcribe, NoSpeechError, type Progress } from "../lib/transcribe";
import type { App } from "../main";
import type { Note } from "../types";

export interface Report {
  fraction: number | null;
  note: string;
}

/// Run a note from raw audio to stored and open.
///
/// Where on the bar each transcription stage runs. The download is short on
/// a return visit and the pass itself is the long part, so that gets most of it.
const STAGE_SPAN: Record<Progress["stage"], [number, number]> = {
  listening: [0.25, 0.28],
  model: [0.28, 0.4],
  language: [0.4, 0.48],
  transcribing: [0.48, 0.74],
};

/// `getPcm` differs between the two callers; everything else does not.
export async function runTranscription(
  app: App,
  note: Note,
  getPcm: (report: (report: Report) => void) => Promise<Float32Array>,
  /// Set when the person has already been told nobody seemed to be speaking and
  /// chose to transcribe anyway, so the voice check does not ask them again.
  { skipVoiceCheck = false }: { skipVoiceCheck?: boolean } = {},
): Promise<void> {
  const root = document.getElementById("app");
  if (!root) return;

  const label = el("p", { style: "margin-bottom:.75rem" }, t("run.preparing"));
  const detail = el("p.small.muted", "");
  const bar = el("i", { style: "width:0%" });
  const track = el("div.progress.indeterminate", bar);
  const cancelled = new AbortController();

  // The furthest the bar has been. A stage that starts again from zero must
  // not drag it back: a bar that runs backwards reads as something having
  // gone wrong, which is how APP-126 was reported.
  let reached = 0;
  const report = ({ fraction, note: text }: Report) => {
    label.textContent = text;
    if (fraction === null) {
      track.classList.add("indeterminate");
      bar.style.width = "35%";
    } else {
      track.classList.remove("indeterminate");
      reached = Math.max(reached, Math.max(0, Math.min(1, fraction)));
      bar.style.width = `${Math.round(reached * 100)}%`;
    }
  };

  mount(
    root,
    el(
      "div.shell",
      el(
        "main",
        el(
          "div.card",
          el("h2", note.title),
          label,
          track,
          detail,
          el(
            "p.small.muted",
            { style: "margin-top:1.25rem" },
            t("run.localNote"),
          ),
          el(
            "button.quiet",
            { onclick: () => cancelled.abort() },
            t("run.cancel"),
          ),
        ),
      ),
    ),
  );

  try {
    const pcm = await getPcm(report);
    if (cancelled.signal.aborted) throw new DOMException("aborted", "AbortError");

    detail.textContent = t("run.modelNote");
    const { chunks, languages, dominant } = await transcribe({
      pcm,
      model: app.settings.model,
      language: app.settings.language,
      secondLanguage: app.settings.secondLanguage,
      translate: app.settings.translateToEnglish,
      signal: cancelled.signal,
      skipVoiceCheck,
      onProgress: ({ stage, fraction, note: text }) => {
        // Each stage its own stretch of the bar, in the order they run, after
        // reading the file (0-25%) and before working out who spoke (75%).
        const [from, to] = STAGE_SPAN[stage];
        report({ fraction: fraction === null ? null : from + fraction * (to - from), note: text });
      },
    });
    if (cancelled.signal.aborted) throw new DOMException("aborted", "AbortError");

    note.transcript = engine.fromChunks(
      chunks,
      // Whisper's translate task always produces English, whatever it heard,
      // so recording the source language here would mislabel the transcript.
      //
      // Otherwise: what was actually heard, in preference to what was asked
      // for. Those differ exactly when it matters -- "detect it" used to record
      // nothing at all, and a bilingual meeting is not the language it opened
      // in.
      app.settings.translateToEnglish ? "english" : dominant || app.settings.language || null,
      note.transcript.source === "recorded",
    );
    // Every language heard, kept beside the dominant one: a transcript has room
    // for a single language and a bilingual meeting is not misdescribed by
    // silently dropping the other.
    note.languages = app.settings.translateToEnglish ? ["en"] : languages;
    note.transcript.duration_ms = Math.max(note.transcript.duration_ms, note.durationMs);
    note.language = note.transcript.language;

    if (app.settings.diarize) {
      detail.textContent = "";
      report({ fraction: 0.75, note: t("run.diarizing") });
      // Yielded to the event loop first: diarization is a synchronous wasm
      // call over the whole recording, and without this the progress line the
      // user is reading never paints before the main thread blocks.
      await new Promise((resolve) => setTimeout(resolve, 30));
      const options = engine.diarizeDefaultOptions();
      const result = engine.diarize(note.transcript, pcm, options);
      note.transcript = result.transcript;
    }

    report({ fraction: 0.92, note: t("run.summarising") });
    await new Promise((resolve) => setTimeout(resolve, 20));
    note.summary = engine.summariseLocal(note.transcript);
    note.durationMs = note.durationMs || note.transcript.duration_ms;

    await app.save(note);
    app.go(`#/note/${note.id}`);
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      app.go("#/");
      return;
    }
    // Nobody seemed to be speaking. An offer, not a refusal: the check is a
    // model, and very quiet or muffled speech can fall under it, so the person
    // who was in the room gets the last word. Everything else below is a real
    // failure and gets no such button.
    if (error instanceof NoSpeechError) {
      mount(
        root,
        el(
          "div.shell",
          el(
            "main",
            el(
              "div.card",
              el("h2", t("run.noSpeechTitle")),
              el("p.muted", t("run.noSpeechBody")),
              el(
                "div.row",
                { style: "gap:.5rem;margin-top:1rem;flex-wrap:wrap" },
                el(
                  "button.primary",
                  { onclick: () => void runTranscription(app, note, getPcm, { skipVoiceCheck: true }) },
                  t("run.transcribeAnyway"),
                ),
                el("button", { onclick: () => app.go("#/") }, t("run.back")),
              ),
            ),
          ),
        ),
      );
      return;
    }
    mount(
      root,
      el(
        "div.shell",
        el(
          "main",
          el(
            "div.card",
            el("h2", t("run.failedTitle")),
            el("div.note.bad", (error as Error).message || t("shell.somethingWrong")),
            el("p.small.muted", { style: "margin-top:1rem" }, t("run.failedNote")),
            el("button", { onclick: () => app.go("#/") }, t("run.back")),
          ),
        ),
      ),
    );
  }
}
