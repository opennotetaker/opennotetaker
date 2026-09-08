// Getting the transcript out, in eight formats and one clip.
//
// §5.2 puts export in the free tier, and the reason is worth stating where the
// code is: this is string formatting over data the browser already holds, so
// there is nothing to meter. Sonix charges for SRT export; that is a charge
// for the account, not for the work.
//
// The clip range is the other half of §5.2's "剪辑分享" opportunity. Both halves
// are local -- the transcript excerpt comes from the Rust core, the audio slice
// is re-encoded here -- so both are free.

import * as engine from "../engine";
import { describe as describeConsent } from "../lib/consent";
import { download, el, mount } from "../lib/dom";
import { exportLabels, formatDate, t } from "../lib/i18n";
import type { App } from "../main";
import type { Note } from "../types";
import { filenameFor } from "./note";

export function renderExportPanel(app: App, note: Note): Node {
  const formats = engine.formats();
  const chosen = el("select", { style: "width:auto" },
    ...formats.map((format) => el("option", { value: format.format }, format.label)),
  ) as HTMLSelectElement;
  chosen.value = "markdown";

  let withSpeakers = true;
  let withSummary = true;
  let withConsent = true;

  const preview = el("pre", {
    style:
      "max-height:16rem;overflow:auto;background:var(--bg-subtle);padding:var(--space-3);border-radius:var(--radius-md);font-family:var(--font-mono);font-size:var(--text-xs);white-space:pre-wrap;word-break:break-word;margin:0",
  });

  const options = () => ({
    labels: exportLabels(),
    title: note.title,
    speakers: withSpeakers,
    // The paid summary where there is one, else the free one. A user who
    // bought minutes expects them in the export; a user who did not still gets
    // the extracted ones.
    summary: withSummary ? note.aiSummary ?? note.summary : null,
    recorded_at: formatDate(note.created, { dateStyle: "long", timeStyle: "short" }),
    consent: withConsent && note.consent ? describeConsent(note.consent) : null,
  });

  const refresh = () => {
    const text = engine.render(note.transcript, chosen.value, options());
    preview.textContent = text.length > 4_000 ? `${text.slice(0, 4_000)}\n…` : text;
  };

  chosen.addEventListener("change", refresh);
  refresh();

  const toggle = (label: string, initial: boolean, set: (on: boolean) => void) =>
    el(
      "label.check",
      el("input", {
        type: "checkbox",
        checked: initial,
        onchange: (event: Event) => {
          set((event.target as HTMLInputElement).checked);
          refresh();
        },
      }),
      el("span", label),
    );

  return el(
    "div.card",
    el("h3", t("export.heading")),
    el(
      "div.row",
      chosen,
      el(
        "button.primary",
        {
          onclick: () => {
            const format = formats.find((f) => f.format === chosen.value)!;
            download(
              `${filenameFor(note)}.${format.extension}`,
              engine.render(note.transcript, format.format, options()),
              format.mime,
            );
          },
        },
        t("export.download"),
      ),
      el(
        "button",
        {
          onclick: async () => {
            const format = formats.find((f) => f.format === chosen.value)!;
            await navigator.clipboard
              .writeText(engine.render(note.transcript, format.format, options()))
              .catch(() => undefined);
          },
        },
        t("export.copy"),
      ),
    ),

    el(
      "div",
      { style: "margin-top:.5rem" },
      toggle(t("export.withSpeakers"), true, (on) => (withSpeakers = on)),
      toggle(t("export.withSummary"), true, (on) => (withSummary = on)),
      note.consent
        ? toggle(t("export.withConsent"), true, (on) => (withConsent = on))
        : null,
    ),

    el("div", { style: "margin-top:1rem" }, preview),

    clipTool(app, note),

    el(
      "p.small.faint",
      { style: "margin:1rem 0 0" },
      t("export.note"),
    ),
  );
}

/// Cut a piece out: its transcript, and its audio where the audio was kept.
function clipTool(app: App, note: Note): Node {
  const from = el("input", { type: "text", placeholder: "0:00", style: "width:6rem" }) as HTMLInputElement;
  const to = el("input", { type: "text", placeholder: engine.clock(note.durationMs), style: "width:6rem" }) as HTMLInputElement;
  const status = el("div");

  const range = (): [number, number] | null => {
    const start = engine.parseTime(from.value) ?? 0;
    const end = engine.parseTime(to.value) ?? (note.durationMs || note.transcript.duration_ms);
    if (end <= start) return null;
    return [start, end];
  };

  return el(
    "details.reveal",
    { style: "margin-top:1rem" },
    el("summary", t("export.clip")),
    el(
      "div.row",
      el("span.small.muted", t("export.clipFrom")),
      from,
      el("span.small.muted", t("export.clipTo")),
      to,
      el(
        "button",
        {
          onclick: () => {
            const span = range();
            if (!span) {
              mount(status, el("div.note.warn", t("export.clipBadRange")));
              return;
            }
            const clip = engine.excerpt(note.transcript, span[0], span[1]);
            download(
              `${filenameFor(note)}-${engine.clock(span[0]).replace(":", "m")}.txt`,
              engine.render(clip, "text_timestamped", {
                labels: exportLabels(),
                title: t("export.excerptTitle", { title: note.title }),
              }),
              "text/plain;charset=utf-8",
            );
          },
        },
        t("export.clipWords"),
      ),
      note.audio
        ? el(
            "button",
            {
              onclick: async () => {
                const span = range();
                if (!span) {
                  mount(status, el("div.note.warn", t("export.clipBadRange")));
                  return;
                }
                mount(status, el("p.small.muted", t("export.clipCutting")));
                try {
                  const blob = await sliceAudio(note.audio!, span[0], span[1]);
                  download(`${filenameFor(note)}-clip.wav`, blob, "audio/wav");
                  mount(status, el("p.small.muted", t("export.clipDone")));
                } catch (error) {
                  mount(status, el("div.note.bad", (error as Error).message));
                }
              },
            },
            t("export.clipSound"),
          )
        : null,
    ),
    status,
    el(
      "p.small.muted",
      { style: "margin:.75rem 0 0" },
      t("export.clipNote"),
    ),
    (() => {
      void app;
      return null;
    })(),
  );
}

/// Slice a range out of the recording and write it as a WAV.
///
/// WAV rather than re-encoding to Opus or AAC: a browser has no audio encoder
/// a page can call except `MediaRecorder`, which encodes in real time -- a
/// ten-minute clip would take ten minutes. Writing a WAV header over the
/// decoded samples is instant, and a clip is something you send to one person
/// rather than archive.
async function sliceAudio(audio: Blob, fromMs: number, toMs: number): Promise<Blob> {
  const context = new OfflineAudioContext(1, 1, 48_000);
  const decoded = await context.decodeAudioData(await audio.arrayBuffer());
  const rate = decoded.sampleRate;
  const first = Math.max(0, Math.floor((fromMs / 1000) * rate));
  const last = Math.min(decoded.length, Math.ceil((toMs / 1000) * rate));
  if (last <= first) throw new Error(t("error.emptyRange"));

  const channels = Math.min(2, decoded.numberOfChannels);
  const frames = last - first;
  const samples: Float32Array[] = [];
  for (let channel = 0; channel < channels; channel += 1) {
    samples.push(decoded.getChannelData(channel).subarray(first, last));
  }

  const bytes = new ArrayBuffer(44 + frames * channels * 2);
  const view = new DataView(bytes);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + frames * channels * 2, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, frames * channels * 2, true);

  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      // Clamped before scaling: a sample above 1.0 (which decoding can
      // produce) would wrap to a loud click rather than clipping.
      const value = Math.max(-1, Math.min(1, samples[channel]![frame] ?? 0));
      view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([bytes], { type: "audio/wav" });
}
