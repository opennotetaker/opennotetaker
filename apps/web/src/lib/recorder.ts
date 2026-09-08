// Recording a meeting without sending a robot to it.
//
// §5.2 lists "bot-free local audio capture" as a differentiator, and §8②
// explains why nobody has done it in a browser: of the six competitors with
// this feature, all six ship a desktop application, because a browser cannot
// reach the system mixer.
//
// It can reach two things, which together cover the case that matters:
//
// - **The microphone**, via `getUserMedia`. That is you and the room.
// - **A tab or window's audio**, via `getDisplayMedia({ audio: true })`. That
//   is everyone on the call.
//
// Mixed into one stream by a `WebAudio` graph and recorded with
// `MediaRecorder`. No extension, no installer, no bot in the participant list.
//
// # What this genuinely cannot do, and where the interface says so
//
// - **Firefox and Safari do not give a page tab audio.** Chrome and Edge do,
//   and only when the user picks a tab and ticks "share audio". Elsewhere this
//   degrades to microphone-only, which still records an in-person meeting or a
//   call on speaker -- and the interface says which of the two you are getting
//   rather than silently recording half the conversation.
// - **Whole-system audio is not available to any browser.** Sharing a tab is
//   the closest thing, and it is the honest ceiling of the web platform here.
//   §8③ of the research reaches the same conclusion from the other direction:
//   this is the point where a competitor reaches for a desktop app, and it is
//   a deliberate choice not to.
//
// # The picker, and the one way past it
//
// The share picker is the worst moment in the flow: it is browser UI we cannot
// style, it asks a question ("which tab?") the user has already answered by
// being in the meeting, and its "share audio" tick box is off by default and
// easy to miss -- an unticked box is a recording of silence discovered an hour
// later.
//
// The optional detector extension (apps/extension) removes it. It hands the
// page a `chrome.tabCapture` stream id for the meeting tab, which
// `getUserMedia` opens directly: the right tab, audio only, no picker, no tick
// box. Two things follow from that and are handled below.
//
// - **Tab capture silences the tab it captures**, unlike `getDisplayMedia`.
//   The audio has to be played back out of this page or the user stops hearing
//   their own meeting -- see `monitor` in `attach`.
// - **A stream id goes stale.** It is minted when the user accepts the prompt,
//   and spent when they finish the consent screen, which is a minute later. If
//   it has expired the picker is still there, and the code falls back to it
//   rather than failing.

import { t } from "./i18n";

export type SourceKind = "microphone" | "tab";

export interface StartOptions {
  microphone: boolean;
  tab: boolean;
  /// A `chrome.tabCapture` stream id from the detector extension, naming the
  /// meeting tab. When present it is tried before the share picker; when it
  /// fails, the picker takes over.
  tabStreamId?: string | null;
  /// Which input to record, from `lib/inputs.ts`. Null is the system default.
  microphoneId?: string | null;
  /// Run the conference-call processing chain on the input. True for an actual
  /// microphone; false for a loopback device or a mixer, where echo
  /// cancellation and noise suppression have nothing to cancel and audibly
  /// damage what they are given.
  processMicrophone?: boolean;
}

export interface Started {
  /// What was actually captured, which is not always what was asked for -- the
  /// user can decline the tab picker, or tick the wrong box in it.
  captured: SourceKind[];
  /// The tab was opened straight from the extension's handover, without the
  /// share picker. False when the picker was used, including after a stale
  /// handover fell back to it.
  direct: boolean;
  /// Set when tab audio was requested and the browser or the user did not
  /// provide it. Shown, not swallowed.
  warning: string | null;
}

export interface Level {
  /// 0..1, for a meter that proves something is being heard. A recorder with
  /// no visible level is one you discover was muted an hour later.
  peak: number;
}

/// Whether the browser can share a tab's audio at all.
export function canCaptureTab(): boolean {
  return typeof navigator.mediaDevices?.getDisplayMedia === "function";
}

export interface RecorderEvents {
  onLevel?: (level: Level) => void;
  onElapsed?: (ms: number) => void;
  /// The user ended the screen share from the browser's own bar rather than
  /// from our button. It is not an error, but the recording must stop cleanly
  /// rather than continue with a dead track.
  onSourceEnded?: (kind: SourceKind) => void;
  onError?: (error: Error) => void;
}

export class Recorder {
  private context: AudioContext | null = null;
  private recorder: MediaRecorder | null = null;
  private streams: MediaStream[] = [];
  private analyser: AnalyserNode | null = null;
  /// The node everything is mixed into. Held because the microphone can be
  /// changed while the recording runs, and a new source has to be connected to
  /// the same mix.
  private destination: MediaStreamAudioDestinationNode | null = null;
  /// The microphone's own source and stream, so that exactly those can be
  /// replaced without touching anything else in the graph.
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private kinds = new Set<SourceKind>();
  private chunks: BlobPart[] = [];
  private startedAt = 0;
  private pausedFor = 0;
  private pausedAt = 0;
  private ticker: number | null = null;
  private mime = "";

  constructor(private readonly events: RecorderEvents = {}) {}

  get active(): boolean {
    return this.recorder !== null && this.recorder.state !== "inactive";
  }

  get paused(): boolean {
    return this.recorder?.state === "paused";
  }

  /// What is being recorded right now. Not what was asked for at the start:
  /// the microphone can be added or swapped mid-recording, and the consent
  /// record has to say what actually happened.
  get sources(): SourceKind[] {
    return [...this.kinds];
  }

  get elapsedMs(): number {
    if (!this.startedAt) return 0;
    const until = this.pausedAt || Date.now();
    return until - this.startedAt - this.pausedFor;
  }

  /// Ask for the sources, mix them, and start.
  ///
  /// Permission is requested here and nowhere earlier: a page that asks for a
  /// microphone on load is one people deny out of reflex, and this one has no
  /// reason to until the moment somebody presses record.
  async start(options: StartOptions): Promise<Started> {
    if (this.active) throw new Error(t("error.alreadyRecording"));
    if (!options.microphone && !options.tab) {
      throw new Error(t("record.pickOne"));
    }

    const context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    const captured: SourceKind[] = [];
    let warning: string | null = null;
    let direct = false;

    try {
      if (options.microphone) {
        const stream = await openMicrophone(
          options.microphoneId ?? null,
          options.processMicrophone !== false,
        );
        this.attach(context, destination, analyser, stream, "microphone");
        captured.push("microphone");
      }

      if (options.tab && options.tabStreamId) {
        try {
          const stream = await captureHandedTab(options.tabStreamId);
          // Played back as well as recorded: tab capture mutes the meeting for
          // the person in it, and a recorder that deafens you is not one you
          // use twice.
          this.attach(context, destination, analyser, stream, "tab", true);
          captured.push("tab");
          direct = true;
        } catch {
          // Expired, or a build of Chrome that will not take the id. Not
          // surfaced as an error: the picker below is the same recording, one
          // extra press away.
          warning = t("error.handoffExpired");
        }
      }

      if (options.tab && !direct) {
        if (!canCaptureTab()) {
          warning = t("error.noTabAudio");
        } else {
          try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
              audio: true,
              // A video track is requested because Chrome will not offer the
              // "share audio" tick box without one, then stopped immediately
              // below -- we want the sound, never the picture, and holding a
              // video track would keep a screen capture alive for the whole
              // meeting.
              video: true,
            });
            for (const track of stream.getVideoTracks()) track.stop();
            if (stream.getAudioTracks().length === 0) {
              warning = t("error.tabAudioUnticked");
            } else {
              this.attach(context, destination, analyser, stream, "tab");
              captured.push("tab");
            }
          } catch (error) {
            if ((error as Error).name === "NotAllowedError" && captured.length > 0) {
              warning = t("error.tabAudioDeclined");
            } else {
              throw error;
            }
          }
        }
      }

      if (captured.length === 0) {
        throw new Error(t("error.nothingRecorded"));
      }

      this.context = context;
      this.destination = destination;
      this.mime = pickMime();
      this.chunks = [];
      const recorder = new MediaRecorder(destination.stream, {
        ...(this.mime ? { mimeType: this.mime } : {}),
        audioBitsPerSecond: 96_000,
      });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.chunks.push(event.data);
      };
      recorder.onerror = () => this.events.onError?.(new Error(t("error.recorderStopped")));
      // A timeslice, so a crashed or closed tab loses seconds rather than the
      // whole meeting: without one, `MediaRecorder` holds everything until
      // stop and a lost tab loses all of it.
      recorder.start(5_000);
      this.recorder = recorder;
      this.analyser = analyser;
      this.startedAt = Date.now();
      this.pausedFor = 0;
      this.pausedAt = 0;
      this.tick();
      return { captured, direct, warning };
    } catch (error) {
      await context.close().catch(() => undefined);
      this.releaseStreams();
      throw humanise(error);
    }
  }

  /// Change -- or add -- the microphone without interrupting the recording.
  ///
  /// Nothing downstream notices. `MediaRecorder` is recording the *output* of
  /// the mixing node, and that node's track is never replaced; only what feeds
  /// into it changes. So the file has no gap, no second header and no shift in
  /// the timeline, which is what makes this safe to offer while somebody is
  /// mid-sentence.
  ///
  /// The new input is opened before the old one is let go. A device that is
  /// unplugged, busy, or refused therefore leaves the recording exactly as it
  /// was, rather than trading a working microphone for an error message.
  async useMicrophone(id: string | null, process: boolean): Promise<void> {
    const context = this.context;
    const destination = this.destination;
    const analyser = this.analyser;
    if (!context || !destination || !analyser || !this.active) {
      throw new Error(t("error.notRecording"));
    }

    let stream: MediaStream;
    try {
      stream = await openMicrophone(id, process);
    } catch (error) {
      throw humanise(error);
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      for (const track of this.micStream.getTracks()) track.stop();
      this.streams = this.streams.filter((held) => held !== this.micStream);
      this.micStream = null;
    }

    this.attach(context, destination, analyser, stream, "microphone");
  }

  pause(): void {
    if (this.recorder?.state !== "recording") return;
    this.recorder.pause();
    this.pausedAt = Date.now();
  }

  resume(): void {
    if (this.recorder?.state !== "paused") return;
    this.pausedFor += Date.now() - this.pausedAt;
    this.pausedAt = 0;
    this.recorder.resume();
  }

  /// Stop, and hand back what was recorded.
  async stop(): Promise<{ blob: Blob; type: string; durationMs: number }> {
    const recorder = this.recorder;
    if (!recorder) throw new Error(t("error.notRecording"));
    const durationMs = this.elapsedMs;

    const finished = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    await finished;

    if (this.ticker !== null) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
    this.releaseStreams();
    await this.context?.close().catch(() => undefined);
    this.context = null;
    this.analyser = null;
    this.recorder = null;

    const type = this.mime || "audio/webm";
    const blob = new Blob(this.chunks, { type });
    this.chunks = [];
    this.startedAt = 0;
    return { blob, type, durationMs };
  }

  /// Stop and discard, for the cancel path. Nothing is kept.
  async discard(): Promise<void> {
    if (!this.recorder) return;
    try {
      await this.stop();
    } finally {
      this.chunks = [];
    }
  }

  private attach(
    context: AudioContext,
    destination: MediaStreamAudioDestinationNode,
    analyser: AnalyserNode,
    stream: MediaStream,
    kind: SourceKind,
    /// Play this source out of the speakers as well as recording it. True for
    /// a handed-over tab, which Chrome mutes at the source; never true for the
    /// microphone, which would be a feedback loop.
    monitor = false,
  ): void {
    this.streams.push(stream);
    const source = context.createMediaStreamSource(stream);
    source.connect(destination);
    source.connect(analyser);
    if (monitor) source.connect(context.destination);
    this.kinds.add(kind);
    if (kind === "microphone") {
      this.micSource = source;
      this.micStream = stream;
    }
    for (const track of stream.getAudioTracks()) {
      // Chrome's own "stop sharing" bar ends the track without telling the
      // page anything else. Without this the recording continues, silently,
      // capturing nothing.
      track.addEventListener("ended", () => this.events.onSourceEnded?.(kind));
    }
  }

  private releaseStreams(): void {
    for (const stream of this.streams) {
      for (const track of stream.getTracks()) track.stop();
    }
    this.streams = [];
    this.micSource = null;
    this.micStream = null;
    this.destination = null;
    this.kinds.clear();
  }

  private tick(): void {
    const buffer = new Uint8Array(this.analyser?.frequencyBinCount ?? 0);
    this.ticker = window.setInterval(() => {
      if (this.analyser) {
        this.analyser.getByteTimeDomainData(buffer);
        let peak = 0;
        for (const sample of buffer) {
          const value = Math.abs(sample - 128) / 128;
          if (value > peak) peak = value;
        }
        this.events.onLevel?.({ peak });
      }
      this.events.onElapsed?.(this.elapsedMs);
    }, 100);
  }
}

/// The first container this browser will actually record.
///
/// Chrome and Firefox produce WebM/Opus; Safari produces MP4/AAC and rejects
/// the WebM types outright. Passing an unsupported `mimeType` throws, so the
/// list is probed rather than assumed.
function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported?.(candidate)) return candidate;
  }
  return "";
}

/// Open an input, with or without the conference-call processing chain.
///
/// On: echo cancellation, noise suppression and automatic gain -- what a
/// conference call would apply anyway, and Whisper is markedly better on their
/// output. Off: how a loopback device carrying the computer's own output is
/// recorded honestly, since there is no echo to cancel and the processing
/// audibly damages what it is given. See lib/inputs.ts.
async function openMicrophone(id: string | null, process: boolean): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      ...(id ? { deviceId: { exact: id } } : {}),
      echoCancellation: process,
      noiseSuppression: process,
      autoGainControl: process,
    },
  });
}

/// Open a tab the extension has already chosen.
///
/// The legacy `mandatory` constraint form is not a mistake and has no modern
/// equivalent: `chromeMediaSource: "tab"` is how Chrome accepts an id minted
/// by `chrome.tabCapture.getMediaStreamId`, and the standard constraints have
/// nothing that names a tab. TypeScript's `MediaTrackConstraints` does not
/// describe it either, hence the cast.
async function captureHandedTab(streamId: string): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
  } as unknown as MediaStreamConstraints);
  if (stream.getAudioTracks().length === 0) {
    for (const track of stream.getTracks()) track.stop();
    throw new Error("no audio track");
  }
  return stream;
}

/// Turn a media error into a sentence with a next step in it.
function humanise(error: unknown): Error {
  const name = (error as Error)?.name;
  if (name === "NotAllowedError") return new Error(t("error.micDenied"));
  // The chosen input was unplugged, or belongs to a profile the browser has
  // since forgotten. Naming it is the difference between a dead end and a
  // one-click fix.
  if (name === "OverconstrainedError") return new Error(t("error.inputGone"));
  if (name === "NotFoundError") return new Error(t("error.micMissing"));
  if (name === "NotReadableError") return new Error(t("error.micBusy"));
  return error instanceof Error ? error : new Error(String(error));
}
