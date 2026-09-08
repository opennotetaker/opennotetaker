// One recording: the player, the transcript, the speakers, and everything you
// can do with them.
//
// This is where a user spends their time, so two decisions shape it:
//
// **Everything is editable, because the machine is sometimes wrong.** Whisper
// mishears names; the diarizer merges similar voices and splits one person who
// changed microphone. A transcript you cannot correct is one you stop trusting
// after the first mistake, so text, speakers and cue boundaries are all
// editable in place, and the corrections survive re-running anything.
//
// **The free panel comes first.** The summary picked out on this device is
// rendered above the paid one and is never replaced by it -- buying a written
// summary adds a panel rather than overwriting the one you already had.

import * as engine from "../engine";
import { decodeToPcm } from "../lib/decode";
import { languageName } from "../lib/transcribe";
import { runTranscription } from "./transcribe-flow";
import { describe as describeConsent } from "../lib/consent";
import { $, download, el, mount } from "../lib/dom";
import { formatDate, t } from "../lib/i18n";
import type { App } from "../main";
import type { Note, Segment } from "../types";
import { renderSummaryPanel } from "./summary-panel";
import { renderExportPanel } from "./export-panel";
import { renderTranslatePanel } from "./translate-panel";

export async function renderNote(app: App, id: string): Promise<Node> {
  const note = await app.store.get(id);
  if (!note) {
    return el(
      "main",
      el("h1", t("note.missingTitle")),
      el("p.muted", t("note.missingBody")),
      el("p", el("a", { href: "#/library" }, t("note.backToLibrary"))),
    );
  }

  const audioUrl = note.audio ? URL.createObjectURL(note.audio) : null;
  const player = audioUrl
    ? (el("audio", { src: audioUrl, controls: true, style: "width:100%" }) as HTMLAudioElement)
    : null;

  const body = el("div.transcript");
  const legend = el("div.speaker-legend");

  /// Redraw the parts that change together, without losing the player's
  /// position or the caret.
  const redrawTranscript = () => {
    mount(body, ...note.transcript.segments.map((segment, index) => line(segment, index)));
    mount(legend, ...speakerChips());
  };

  const seek = (ms: number) => {
    if (!player) return;
    player.currentTime = ms / 1000;
    void player.play();
  };

  const line = (segment: Segment, index: number): Node => {
    const said = el("div.said", {
      contentEditable: "true",
      spellcheck: false,
      "data-edited": String(segment.edited),
      text: segment.text,
      onblur: (event: Event) => {
        const text = (event.target as HTMLElement).textContent?.trim() ?? "";
        if (text === segment.text) return;
        if (!text) {
          // An emptied line would be dropped by the next normalise, silently
          // losing a cue the user may have only been re-typing.
          (event.target as HTMLElement).textContent = segment.text;
          return;
        }
        segment.text = text;
        segment.edited = true;
        (event.target as HTMLElement).dataset.edited = "true";
        void app.save(note);
      },
      onkeydown: (event: KeyboardEvent) => {
        // Enter commits rather than inserting a newline: a cue is one line by
        // definition, and a stray newline breaks every subtitle export.
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          (event.target as HTMLElement).blur();
        }
      },
    });

    const who = segment.speaker
      ? el("button.who", {
          style: `color:${speakerColour(segment.speaker)};background:none;border:none;height:auto;padding:0`,
          title: t("note.reassign"),
          text: `${note.transcript.speakers.find((s) => s.id === segment.speaker)?.label ?? segment.speaker}:`,
          onclick: () => cycleSpeaker(segment),
        })
      : null;

    return el(
      "div.line",
      { "data-playing": "false", "data-index": String(index) },
      el(
        "button.at.clock",
        { onclick: () => seek(segment.start_ms), title: t("note.playFromHere") },
        engine.clock(segment.start_ms),
      ),
      el(
        "div",
        who,
        said,
        el(
          "span.tools",
          el(
            "button.tiny.quiet",
            {
              title: t("note.splitHint"),
              onclick: () => {
                const at = Math.round((segment.start_ms + segment.end_ms) / 2);
                try {
                  note.transcript = engine.split(note.transcript, at).transcript;
                  void app.save(note).then(redrawTranscript);
                } catch {
                  // Too short to split. Not worth an alert.
                }
              },
            },
            t("note.split"),
          ),
        ),
      ),
    );
  };

  /// Move a line to the next speaker, wrapping round to unassigned.
  ///
  /// A cycle rather than a menu: with two or three speakers -- which is nearly
  /// always -- one click is the whole correction, and a dropdown for a
  /// two-valued choice is three interactions for the same result.
  const cycleSpeaker = (segment: Segment) => {
    const ids = note.transcript.speakers.map((s) => s.id);
    if (ids.length === 0) return;
    const at = segment.speaker ? ids.indexOf(segment.speaker) : -1;
    segment.speaker = at + 1 < ids.length ? ids[at + 1]! : ids[0]!;
    note.transcript = engine.normalise(note.transcript);
    void app.save(note).then(redrawTranscript);
  };

  const speakerChips = (): Node[] =>
    note.transcript.speakers.map((speaker) =>
      el(
        "span.speaker-chip",
        el("span.swatch", { style: `background:${speakerColour(speaker.id)}` }),
        el("input", {
          value: speaker.label,
          "aria-label": t("note.speakerNameFor", { name: speaker.label }),
          onchange: (event: Event) => {
            const label = (event.target as HTMLInputElement).value.trim();
            speaker.label = label || speaker.label;
            speaker.named = Boolean(label);
            void app.save(note).then(redrawTranscript);
          },
        }),
        el("span.small.faint.tabular", talkTimeFor(speaker.id)),
      ),
    );

  const talkTimeFor = (id: string): string => {
    const row = engine.talkTimes(note.transcript).find((r) => r.id === id);
    return row ? engine.clock(row.ms) : "";
  };

  redrawTranscript();

  // Follow along during playback. `timeupdate` fires about four times a
  // second, which is enough to keep the highlight honest and cheap enough that
  // it does not fight the transcript for the main thread.
  player?.addEventListener("timeupdate", () => {
    const index = engine.lineAt(note.transcript, player.currentTime * 1000);
    for (const node of body.querySelectorAll<HTMLElement>(".line")) {
      node.dataset.playing = String(Number(node.dataset.index) === index);
    }
  });

  const search = el("input", {
    type: "search",
    placeholder: t("note.findPlaceholder"),
    oninput: (event: Event) => {
      const query = (event.target as HTMLInputElement).value.trim().toLowerCase();
      for (const node of body.querySelectorAll<HTMLElement>(".line")) {
        const text = node.querySelector(".said")?.textContent?.toLowerCase() ?? "";
        node.style.display = !query || text.includes(query) ? "" : "none";
      }
    },
  });

  const title = el("input", {
    type: "text",
    value: note.title,
    "aria-label": t("note.titleLabel"),
    style: "font-size:var(--text-xl);font-weight:var(--weight-medium);border-color:transparent;padding-inline:0",
    onchange: (event: Event) => {
      note.title = (event.target as HTMLInputElement).value.trim() || note.title;
      void app.save(note);
    },
  });

  return el(
    "main",
    el("div.spread", title),
    el(
      "p.small.muted",
      { style: "margin-top:0" },
      [
        formatDate(note.created, { dateStyle: "medium", timeStyle: "short" }),
        engine.clock(note.durationMs || note.transcript.duration_ms),
        // Every language heard, not only the one the transcript is filed
        // under: a meeting held in two is misdescribed by naming one.
        note.languages && note.languages.length > 1
          ? t("note.metaDetected", {
              language: note.languages
                .map((code) => languageName(code) ?? code)
                .join(t("common.listJoin")),
            })
          : note.transcript.language
            ? t("note.metaDetected", { language: languageName(note.transcript.language) ?? "" })
            : null,
        t("note.metaLines", { count: note.transcript.segments.length }),
        t(note.transcript.source === "recorded" ? "note.metaRecorded" : "note.metaImported"),
      ]
        .filter(Boolean)
        .join(" · "),
    ),

    note.consent
      ? el(
          "details.reveal",
          el("summary", t("record.consentHeading")),
          el("p.small", { style: "margin:0" }, describeConsent(note.consent)),
        )
      : null,

    player
      ? el("div.card", player)
      : el(
          "div.note.info",
          t("note.noAudio"),
        ),

    el(
      "div.card",
      el("h3", t("note.whoHeading")),
      legend,
      speakerControls(app, note, redrawTranscript),
    ),

    renderSummaryPanel(app, note),

    el(
      "div.card",
      el(
        "div.spread",
        el("h3", { style: "margin:0" }, t("note.transcriptHeading")),
        el("div", { style: "max-width:16rem" }, search),
      ),
      body,
    ),

    renderTranslatePanel(app, note, redrawTranscript),
    renderExportPanel(app, note),

    el(
      "div.card",
      el("h3", t("note.recordingHeading")),
      el(
        "div.row",
        note.audio
          ? el(
              "button",
              {
                onclick: () =>
                  download(
                    `${filenameFor(note)}.${extensionFor(note.audioType)}`,
                    note.audio!,
                    note.audioType ?? "audio/webm",
                  ),
              },
              t("note.downloadAudio"),
            )
          : null,
        // Transcribing again is only possible while the audio is still here,
        // which is the argument for keeping it: a recogniser improves, a
        // setting was wrong, a meeting turns out to have been in two languages.
        // Without the audio the transcript is all there is, for good.
        note.audio
          ? el(
              "button",
              {
                onclick: () => {
                  if (!confirm(t("note.transcribeAgainConfirm"))) return;
                  const audio = note.audio!;
                  void runTranscription(app, note, async (report) => {
                    const pcm = await decodeToPcm(audio, (progress) =>
                      report({ fraction: progress.fraction * 0.25, note: progress.note }),
                    );
                    return pcm;
                  });
                },
              },
              t("note.transcribeAgain"),
            )
          : null,
        note.audio
          ? el(
              "button",
              {
                onclick: () => {
                  if (!confirm(t("note.deleteAudioConfirm"))) return;
                  note.audio = null;
                  note.audioType = null;
                  void app.save(note).then(() => app.render());
                },
              },
              t("note.deleteAudio"),
            )
          : null,
        el(
          "button.danger",
          {
            onclick: () => {
              if (!confirm(t("note.deleteAllConfirm", { title: note.title }))) return;
              void app.remove(note.id).then(() => app.go("#/library"));
            },
          },
          t("note.deleteAll"),
        ),
      ),
    ),
  );
}

/// Re-run diarization, optionally with a speaker count the user supplies.
///
/// Offered rather than hidden because the automatic guess is the part most
/// likely to be wrong, and "there were three of us" is a correction a user can
/// make instantly where "adjust the clustering threshold" is not.
function speakerControls(app: App, note: Note, redraw: () => void): Node {
  const count = el(
    "select",
    { style: "width:auto" },
    el("option", { value: "auto" }, t("note.speakerAuto")),
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
      el(
        "option",
        { value: String(n) },
        n === 1 ? t("note.speakerOne") : t("note.speakerCount", { count: n }),
      ),
    ),
  );

  const status = el("span.small.muted");

  const rerun = el(
    "button",
    {
      onclick: async () => {
        if (!note.audio) {
          status.textContent = t("note.rediarizeNoAudio");
          return;
        }
        status.textContent = t("note.rediarizeRunning");
        try {
          const pcm = await decodeToPcm(note.audio);
          const options = engine.diarizeDefaultOptions();
          if (count.value !== "auto") {
            options.speakers = { mode: "exactly", 0: Number(count.value) } as typeof options.speakers;
          }
          const result = engine.diarize(note.transcript, pcm, options);
          note.transcript = result.transcript;
          await app.save(note);
          redraw();
          status.textContent =
            t("note.rediarizeDone", { count: result.report.speakers }) +
            (result.report.unassigned
              ? t("note.rediarizeUnassigned", { count: result.report.unassigned })
              : "");
        } catch (error) {
          status.textContent = (error as Error).message;
        }
      },
    },
    t("note.rediarize"),
  );

  return el(
    "div",
    { style: "margin-top:1rem" },
    el("div.row", count, rerun, status),
    el(
      "p.small.muted",
      { style: "margin:.75rem 0 0" },
      t("note.speakerNote"),
    ),
  );
}

const SPEAKER_COLOURS = 8;

export function speakerColour(id: string): string {
  const index = Number.parseInt(id.replace(/\D/g, ""), 10);
  return `var(--speaker-${Number.isNaN(index) ? 0 : index % SPEAKER_COLOURS})`;
}

export function filenameFor(note: Note): string {
  return (
    note.title
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "transcript"
  );
}

function extensionFor(type: string | null): string {
  if (!type) return "webm";
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mpeg")) return "mp3";
  return "webm";
}

export { $ as findElement };
