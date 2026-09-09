// Recording: the consent gate, then the recorder.
//
// The gate is the product's opening argument (see lib/consent.ts), so it is
// the whole screen rather than a modal over a recorder that is visibly ready
// to go.
//
// It is also where a handover from the detector extension lands. The extension
// knows which tab the meeting is in and can open it without the share picker
// (lib/ext-bridge.ts), and the temptation is to let it start recording on the
// spot -- one click from a banner in the call to a running recorder. That is
// exactly the product being built against. The handover fills the screen in
// as far as it honestly can (which platform, which tab, the source already
// chosen) and then stops, because the sentence about telling the other people
// is the point of the screen and skipping it for a "faster" path would leave
// nothing here but a bot with better manners. What it is not is a wall of legal text -- §9 切入点1 is explicit that
// the wedge fails if it reads as compliance ceremony to a non-technical user.
// Three controls and a sentence.

import { el, mount, newId } from "../lib/dom";
import { decodeToPcm, durationMs } from "../lib/decode";
import * as consent from "../lib/consent";
import { detectorInstalled, type Handoff } from "../lib/ext-bridge";
import { type Input, inputsAreNamed, listInputs, nameInputs } from "../lib/inputs";
import { formatDate, t } from "../lib/i18n";
import { canCaptureTab, Recorder, type SourceKind } from "../lib/recorder";
import { saveSettings } from "../lib/store";
import type { App } from "../main";
import type { Note } from "../types";
import { runTranscription } from "./transcribe-flow";

export function renderRecord(app: App): Node {
  return app.recorder?.active ? recording(app) : gate(app);
}

// ------------------------------------------------------------------- the gate

function gate(app: App): Node {
  // Read, not consumed. This screen is redrawn for reasons that have nothing
  // to do with the handover -- a language change, the router drawing the route
  // it was just sent to -- and an offer that cleared itself on first read
  // vanished between two renders of the same screen, taking the card and the
  // chosen source with it. The shell drops it when the user navigates away
  // (see `draw` in main.ts) and `begin` drops it once it has been spent.
  const handoff = app.handoff;

  const draft: consent.Draft = {
    participants: "",
    method: "announced",
    captured: [],
  };
  let microphone = true;
  let tab = canCaptureTab() || handoff !== null;
  // Null is "whatever the system calls the default", which is right for almost
  // everybody. The list exists for the two people in the room who are routing
  // a desktop meeting through a loopback device, and for the one whose default
  // input is a webcam on the other side of the desk.
  let microphoneId: string | null = null;
  let processMicrophone = true;

  const status = el("div");
  const startButton = el("button.primary.big", { disabled: false }, t("record.start"));

  const inputPicker = el("div", { style: "margin:.25rem 0 1rem 1.9rem" });

  function drawInputs(): void {
    mount(
      inputPicker,
      microphone
        ? inputControls({
            live: false,
            selected: microphoneId,
            process: processMicrophone,
            onChange: (id, process) => {
              microphoneId = id;
              processMicrophone = process;
            },
          })
        : null,
    );
  }
  drawInputs();

  const sourceBoxes = el(
    "div",
    checkbox(t("record.source.mic"), t("record.source.micHint"), microphone, (on) => {
      microphone = on;
      drawInputs();
      revalidate();
    }),
    inputPicker,
    checkbox(
      handoff ? t("record.source.handedTab", { platform: handoff.platform }) : t("record.source.tab"),
      handoff
        ? t("record.source.handedTabHint")
        : canCaptureTab()
          ? t("record.source.tabHint")
          : t("record.source.tabUnsupported"),
      tab,
      (on) => {
        tab = on;
        revalidate();
      },
      !canCaptureTab() && handoff === null,
    ),
    detectorInstalled() && !handoff
      ? el("p.small.muted", { style: "margin:.5rem 0 0" }, t("record.detectorOn"))
      : null,
  );

  const methodBoxes = el(
    "div",
    ...consent.methods().map((method) =>
      el(
        "label.check",
        el("input", {
          type: "radio",
          name: "consent-method",
          checked: draft.method === method.value,
          onchange: () => {
            draft.method = method.value;
            revalidate();
          },
        }),
        el("span", el("span", method.label), el("span.hint", method.hint)),
      ),
    ),
  );

  const participants = el("input", {
    type: "text",
    placeholder: t("record.whoPlaceholder"),
    oninput: (event: Event) => {
      draft.participants = (event.target as HTMLInputElement).value;
    },
  }) as HTMLInputElement;

  function revalidate(): void {
    startButton.disabled = !consent.isComplete(draft) || (!microphone && !tab);
    mount(
      status,
      !microphone && !tab ? el("div.note.warn", t("record.pickOne")) : null,
      // The one combination that produces a recording nobody can use. It is
      // not blocked -- an in-person meeting is exactly this -- but it is said
      // out loud, because the failure is silent until playback: the browser's
      // echo canceller treats everything coming out of the speakers as echo,
      // so the far side of a call is not merely quiet, it is removed.
      microphone && !tab && canCaptureTab()
        ? el("div.note", t("record.micOnlyOnACall"))
        : null,
    );
  }

  startButton.addEventListener("click", () => {
    draft.captured = [
      ...(microphone ? [t("record.mic")] : []),
      ...(tab ? [t("record.tab")] : []),
    ];
    app.handoff = null;
    void begin(app, draft, {
      microphone,
      tab,
      tabStreamId: handoff?.streamId ?? null,
      microphoneId,
      processMicrophone,
    });
  });

  revalidate();

  return el(
    "main",
    el("h1", t("record.title")),
    el("p.lede", { style: "font-size:var(--text-md)" }, t("record.lede")),

    handoff ? fromMeeting(handoff) : null,

    el(
      "div.card",
      el("h3", t("record.scriptHeading")),
      el(
        "blockquote",
        {
          style:
            "margin:0;padding-inline-start:1rem;border-inline-start:3px solid var(--brand-soft);color:var(--text-strong)",
        },
        consent.spokenScript(),
      ),
      el("p.small.muted", { style: "margin:.75rem 0 0" }, t("record.scriptNote")),
    ),

    el(
      "div.card",
      el("h3", t("record.whoHeading")),
      el("label.field", el("span", t("record.whoHint")), participants),
      methodBoxes,
    ),

    el("div.card", el("h3", t("record.sourcesHeading")), sourceBoxes),

    // What happens to the recording afterwards, decided before it is made.
    //
    // This lived only in the privacy centre, off by default, and the
    // consequence arrived weeks later: a 28-minute meeting transcribed badly,
    // and no audio left to run again. The moment that choice matters is this
    // one, so it is offered here -- and the warning is written as what is lost
    // rather than as what is stored, because "the audio is discarded" reads
    // like a feature and "you cannot fix a bad transcript" reads like the
    // trade it actually is.
    el(
      "div.card",
      el("h3", t("record.afterHeading")),
      checkbox(
        t("record.keepAudio"),
        t("record.keepAudioHint"),
        app.settings.keepAudio,
        (on) => {
          app.settings.keepAudio = on;
          saveSettings(app.settings);
          app.render();
        },
      ),
      app.settings.keepAudio
        ? null
        : el("p.note.warn", { style: "margin:.75rem 0 0" }, t("record.keepAudioWarning")),
    ),

    el(
      "div.card",
      el("h3", t("record.agreeHeading")),
      el("p", { style: "color:var(--text-strong)" }, consent.disclosure()),
      el("p.small.muted", { style: "margin-bottom:0" }, t("record.agreeNote")),
    ),

    status,
    el(
      "div.row",
      { style: "margin-top:1.5rem" },
      startButton,
      el("button.quiet", { onclick: () => app.go("#/") }, t("record.cancel")),
    ),
  );
}

// --------------------------------------------------------------- the inputs

/// What the running recording is listening to. Module state rather than view
/// state: the recorder screen is redrawn on every pause, every tick of the
/// consent record and every language change, and the chosen input has to
/// survive all of them. There is exactly one recorder in the application, so
/// there is exactly one answer.
let liveInput: string | null = null;
let liveProcess = true;

/// The audio inputs, once the browser will name them.
///
/// Cached for the life of the page rather than per screen: the names cost a
/// permission prompt to learn, and a user who revealed them on the consent
/// screen should not be asked again by the recorder thirty seconds later.
let namedInputs: Input[] | null = null;

/// The "which input" control, used twice: on the consent screen, where it
/// chooses what the recording will open, and on the recorder, where choosing
/// swaps the live microphone underneath a running recording.
///
/// It is the same control in both places on purpose. The reason to change
/// input is usually discovered *after* pressing start -- the wrong microphone
/// is the one you cannot hear yourself on, and a loopback device is the one you
/// remember when the other person has already started talking.
function inputControls(options: {
  live: boolean;
  /// Live only: whether a microphone is part of the recording at all. When it
  /// is not, choosing an input adds one rather than replacing one.
  capturing?: boolean;
  selected: string | null;
  process: boolean;
  onChange: (id: string | null, process: boolean) => void;
}): Node {
  // Classed, so that a test -- and anything else looking for it -- can tell
  // this select from the language switcher in the shell, which is the only
  // other one in the application.
  const container = el("div.inputs");

  function draw(): void {
    if (namedInputs === null) {
      mount(
        container,
        el(
          "button.quiet.small",
          {
            onclick: () => {
              void nameInputs().then(
                (found) => {
                  namedInputs = found;
                  draw();
                },
                () => {
                  // Denied. An empty list says so without a second dialog: the
                  // default input still records, it just has no name.
                  namedInputs = [];
                  draw();
                },
              );
            },
          },
          t("record.inputs.reveal"),
        ),
      );
      return;
    }

    if (namedInputs.length === 0) {
      mount(container, el("p.small.muted", { style: "margin:0" }, t("record.inputs.none")));
      return;
    }

    const select = el(
      "select",
      {
        onchange: (event: Event) => {
          const value = (event.target as HTMLSelectElement).value;
          options.selected = value || null;
          options.onChange(options.selected, options.process);
        },
      },
      el("option", { value: "", selected: options.selected === null }, t("record.inputs.default")),
      ...namedInputs.map((input) =>
        el("option", { value: input.id, selected: input.id === options.selected }, input.label),
      ),
    );

    mount(
      container,
      el("label.field", el("span.small", t("record.inputs.label")), select),
      // Adding a microphone to a recording that has none cannot be done by
      // picking the option that is already picked, so it gets its own button.
      options.live && options.capturing === false
        ? el(
            "button.small",
            { onclick: () => options.onChange(options.selected, options.process) },
            t("record.inputs.add"),
          )
        : null,
      checkbox(
        t("record.inputs.clean"),
        t("record.inputs.cleanHint"),
        options.process,
        (on) => {
          options.process = on;
          // Live, this reopens the input: the processing chain is a property
          // of the stream, not a knob on it. On the consent screen it is
          // simply remembered until start.
          options.onChange(options.selected, on);
        },
      ),
    );
  }

  // Ask the device list first and the Permissions API only if it comes back
  // nameless. The list is the direct answer -- during a recording the page
  // already holds a microphone, so the names are simply there -- and the
  // permission query is a fallback for deciding between "you have not let us
  // see them" and "there are none", in a browser that may not implement it.
  // Neither call prompts, so opening either screen still asks for nothing.
  if (namedInputs === null) {
    void listInputs().then(async (found) => {
      if (found.length > 0) {
        namedInputs = found;
      } else {
        namedInputs = (await inputsAreNamed()) ? [] : null;
      }
      draw();
    });
  }
  draw();

  return container;
}

function checkbox(
  label: string,
  hint: string,
  checked: boolean,
  onchange: (on: boolean) => void,
  disabled = false,
): Node {
  return el(
    "label.check",
    el("input", {
      type: "checkbox",
      checked,
      disabled,
      onchange: (event: Event) => onchange((event.target as HTMLInputElement).checked),
    }),
    el("span", el("span", label), el("span.hint", hint)),
  );
}

// -------------------------------------------------------------- the recorder

/// What the detector handed over, said back to the user.
///
/// Naming the tab matters more than it looks: this screen was opened by
/// something the user clicked in another window, and a recorder that appears
/// by itself has to account for where it came from before it asks for
/// anything.
function fromMeeting(handoff: Handoff): Node {
  return el(
    "div.card",
    el("h3", t("record.handoffHeading", { platform: handoff.platform })),
    el("p", { style: "margin-bottom:0;color:var(--text-strong)" }, handoff.title || handoff.platform),
    el(
      "p.small.muted",
      { style: "margin:.5rem 0 0" },
      handoff.streamId ? t("record.handoffDirect") : t("record.handoffPicker"),
    ),
  );
}

async function begin(
  app: App,
  draft: consent.Draft,
  sources: {
    microphone: boolean;
    tab: boolean;
    tabStreamId?: string | null;
    microphoneId?: string | null;
    processMicrophone?: boolean;
  },
): Promise<void> {
  const recorder = new Recorder({
    onLevel: ({ peak }) => {
      const meter = document.getElementById("level");
      if (meter) meter.style.width = `${Math.round(Math.min(1, peak * 1.4) * 100)}%`;
    },
    onElapsed: (ms) => {
      for (const id of ["elapsed", "bar-elapsed"]) {
        const node = document.getElementById(id);
        if (node) node.textContent = clock(ms);
      }
    },
    onSourceEnded: () => {
      // Chrome's own "stop sharing" bar. The recording has to end rather than
      // carry on capturing a dead track, and the user has to be told why.
      const notice = document.getElementById("recorder-notice");
      if (notice) {
        notice.className = "note warn";
        notice.textContent = t("record.tabEnded");
      }
    },
    onError: (error) => {
      const notice = document.getElementById("recorder-notice");
      if (notice) {
        notice.className = "note bad";
        notice.textContent = error.message;
      }
    },
  });

  liveInput = sources.microphoneId ?? null;
  liveProcess = sources.processMicrophone !== false;

  try {
    const started = await recorder.start(sources);
    // Recorded, not requested: the user can decline the tab picker or forget
    // to tick "share audio", and the consent record must say what actually
    // happened.
    draft.captured = started.captured.map((kind) => describeSource(kind));
    app.recorder = recorder;
    (app as App & { pendingConsent?: consent.Draft }).pendingConsent = draft;
    (app as App & { pendingWarning?: string | null }).pendingWarning = started.warning;
    app.render();
  } catch (error) {
    const notice = document.getElementById("recorder-notice") ?? document.createElement("div");
    notice.className = "note bad";
    notice.textContent = (error as Error).message;
    document.querySelector("main")?.prepend(notice);
  }
}

/// What to call the input that was just chosen, in a sentence.
function inputName(id: string | null): string {
  if (id === null) return t("record.inputs.default");
  return namedInputs?.find((input) => input.id === id)?.label ?? t("record.inputs.label");
}

function describeSource(kind: SourceKind): string {
  return kind === "microphone" ? t("record.mic") : t("record.tab");
}

function recording(app: App): Node {
  const recorder = app.recorder!;
  const draft = (app as App & { pendingConsent?: consent.Draft }).pendingConsent;
  const warning = (app as App & { pendingWarning?: string | null }).pendingWarning ?? null;

  const title = el("input", {
    type: "text",
    placeholder: t("record.namePlaceholder"),
    value: "",
  }) as HTMLInputElement;

  const notice = el("div", { id: "recorder-notice" });
  if (warning) {
    notice.className = "note warn";
    notice.textContent = warning;
  }

  const pauseButton = el(
    "button",
    {
      onclick: () => {
        if (recorder.paused) recorder.resume();
        else recorder.pause();
        app.render();
      },
    },
    recorder.paused ? t("record.resume") : t("record.pause"),
  );

  return el(
    "main",
    el("h1", recorder.paused ? t("shell.paused") : t("shell.recording")),
    notice,
    el(
      "div.card",
      el(
        "div.spread",
        el(
          "div",
          el("span.clock", { id: "elapsed", style: "font-size:var(--text-3xl);font-weight:var(--weight-medium)" }, clock(recorder.elapsedMs)),
          el(
            "div.small.muted",
            { id: "capturing" },
            draft?.captured.length
              ? t("record.capturing", { sources: draft.captured.join(", ") })
              : "",
          ),
        ),
        el("div.row", pauseButton, el(
            "button.primary",
            { onclick: () => void finish(app, title.value, draft) },
            t("record.finish"),
          ),
        ),
      ),
      el(
        "div.meter",
        { style: "margin-top:1rem" },
        el("i", { id: "level", style: "width:0%" }),
      ),
      el(
        "p.small.muted",
        { style: "margin:.5rem 0 0" },
        t("record.levelHint"),
      ),
    ),

    el(
      "div.card",
      el("h3", t("record.inputs.heading")),
      inputControls({
        live: true,
        capturing: recorder.sources.includes("microphone"),
        selected: liveInput,
        process: liveProcess,
        onChange: (id, process) => {
          const had = recorder.sources.includes("microphone");
          liveInput = id;
          liveProcess = process;
          void recorder.useMicrophone(id, process).then(
            () => {
              const notice = document.getElementById("recorder-notice");
              if (notice) {
                notice.className = "note";
                notice.textContent = t("record.inputs.switched", { input: inputName(id) });
              }
              // A microphone that was not part of the recording a moment ago
              // is now on it, and the consent record says what was *captured*,
              // so it has to be told. The line is updated in place rather than
              // by redrawing the screen: a redraw would replace the notice
              // element this handler has just written the confirmation into.
              if (!had && draft) {
                draft.captured = recorder.sources.map((kind) => describeSource(kind));
                const capturing = document.getElementById("capturing");
                if (capturing) {
                  capturing.textContent = t("record.capturing", {
                    sources: draft.captured.join(", "),
                  });
                }
              }
            },
            (error: Error) => {
              const notice = document.getElementById("recorder-notice");
              if (notice) {
                notice.className = "note bad";
                notice.textContent = error.message;
              }
            },
          );
        },
      }),
      el("p.small.muted", { style: "margin:.5rem 0 0" }, t("record.inputs.liveHint")),
    ),

    el(
      "div.card",
      el("label.field", el("span", t("record.nameLabel")), title),
      el(
        "p.small.muted",
        { style: "margin-bottom:0" },
        t("record.nameNote"),
      ),
    ),

    el(
      "div.row",
      el(
        "button.danger.quiet",
        {
          onclick: () => {
            if (!confirm(t("record.discardConfirm"))) return;
            void recorder.discard().then(() => {
              app.recorder = null;
              app.go("#/");
            });
          },
        },
        t("record.discard"),
      ),
    ),
  );
}

async function finish(app: App, title: string, draft: consent.Draft | undefined): Promise<void> {
  const recorder = app.recorder;
  if (!recorder) return;
  const { blob, type, durationMs: recordedMs } = await recorder.stop();
  app.recorder = null;

  const note: Note = {
    id: newId(),
    title: title.trim() || defaultTitle(),
    created: Date.now(),
    updated: Date.now(),
    transcript: { language: null, segments: [], speakers: [], duration_ms: 0, source: "recorded" },
    summary: null,
    aiSummary: null,
    consent: draft ? consent.record(draft) : null,
    audio: app.settings.keepAudio ? blob : null,
    audioType: app.settings.keepAudio ? type : null,
    durationMs: recordedMs,
    language: null,
  };

  await runTranscription(app, note, async (report) => {
    const pcm = await decodeToPcm(blob, (progress) =>
      report({ fraction: progress.fraction * 0.25, note: progress.note }),
    );
    // The decoded length is authoritative: the wall clock can drift from the
    // recording when a track is paused or a source drops.
    note.durationMs = durationMs(pcm);
    return pcm;
  });
}

function defaultTitle(): string {
  return t("record.defaultTitle", {
    when: formatDate(Date.now(), {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
}

function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
