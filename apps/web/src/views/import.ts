// Opening a file the user already has.
//
// Shared between the landing page and the library, and worth its own module
// for one reason: this is the path where a `File` becomes a `Note`, and it has
// to make the same decisions the recording path makes about consent, audio
// retention and diarization -- without asking the user the same questions
// twice for a file they recorded on a phone last week.
//
// The consent question is genuinely different here and is not asked. Consent
// is about the moment of recording, which for an imported file already
// happened somewhere this app was not. Presenting a consent gate over it would
// be theatre, and worse, it would train people to click through the one that
// matters.

import { el, newId } from "../lib/dom";
import { t } from "../lib/i18n";
import { decodeToPcm, durationMs } from "../lib/decode";
import type { App } from "../main";
import type { Note } from "../types";
import { runTranscription } from "./transcribe-flow";

const ACCEPT = "audio/*,video/*,.mp3,.m4a,.wav,.ogg,.opus,.webm,.mp4,.mov,.flac,.aac";

/// Show the picker, then take whatever comes back through the pipeline.
export async function pickAudioFile(app: App): Promise<void> {
  const input = el("input", { type: "file", accept: ACCEPT, multiple: false }) as HTMLInputElement;
  input.style.display = "none";
  document.body.append(input);
  const chosen = await new Promise<File | null>((resolve) => {
    // `cancel` is not fired by every browser, and `change` never fires when
    // the dialog is dismissed -- so the element is simply left to be garbage
    // collected in that case rather than the page waiting for ever.
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener("cancel", () => resolve(null), { once: true });
    input.click();
  });
  input.remove();
  if (!chosen) return;
  await importFile(app, chosen);
}

/// Decode, transcribe, diarize and store one file, then open it.
export async function importFile(app: App, file: File): Promise<void> {
  const note: Note = {
    id: newId(),
    title: titleFrom(file.name),
    created: Date.now(),
    updated: Date.now(),
    transcript: { language: null, segments: [], speakers: [], duration_ms: 0, source: "imported" },
    summary: null,
    aiSummary: null,
    consent: null,
    audio: app.settings.keepAudio ? file : null,
    audioType: app.settings.keepAudio ? file.type || "audio/mpeg" : null,
    durationMs: 0,
    language: null,
  };

  await runTranscription(app, note, async (report) => {
    const pcm = await decodeToPcm(file, (progress) =>
      report({ fraction: progress.fraction * 0.25, note: progress.note }),
    );
    note.durationMs = durationMs(pcm);
    return pcm;
  });
}

/// A title from a filename, which is usually better than "Untitled" and
/// occasionally exactly right.
function titleFrom(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (!stem) return t("common.importedTitle");
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}
