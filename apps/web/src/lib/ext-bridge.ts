// The app's half of the meeting detector.
//
// The browser extension (apps/extension) is the only thing that can see a
// Google Meet, Zoom, Teams or VooV tab, because a page cannot look at another
// page. When the user accepts its prompt it opens this app and posts two
// things through a content script:
//
// - **that it is installed**, which the record screen uses to stop explaining
//   how to find a tab in the share picker; and
// - **a handover** -- a `chrome.tabCapture` stream id for the meeting tab,
//   plus the platform's name for the consent record.
//
// Everything here is optional. Without the extension installed not one line of
// this runs, and the app behaves exactly as it did before: the user presses
// record and picks the tab themselves. That is deliberate. The extension is an
// accelerator for a flow that has to keep working without it -- Firefox and
// Safari have no build of it, and a privacy product should never require
// somebody to install more code to use the thing they came for.
//
// # Trust
//
// The message arrives as a `window.postMessage` from a content script, which
// is indistinguishable from one the page sent itself. That is fine: a stream
// id is issued *for this origin* and is useless anywhere else, and the only
// thing a forged message could do is offer to record a tab -- behind the same
// consent screen as every other recording.

/// A meeting the extension is offering to record.
export interface Handoff {
  /// A tabCapture stream id, or null when the extension could not get one and
  /// the share picker has to be used after all.
  streamId: string | null;
  /// "Google Meet", "Zoom", "Microsoft Teams", "VooV Meeting".
  platform: string;
  /// The meeting tab's title, which is usually the meeting's name.
  title: string;
  /// Why there is no stream id, for the console rather than the interface.
  reason: string | null;
}

const CHANNEL = "opennotetaker-extension";

let installed = false;
let waiting: Handoff | null = null;
const listeners = new Set<(handoff: Handoff) => void>();

/// Start listening. Called once, from the shell, before the first view.
export function connect(): void {
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data as { channel?: string; type?: string } | null;
    if (!data || data.channel !== CHANNEL) return;

    if (data.type === "present") {
      installed = true;
      return;
    }
    if (data.type === "handoff") {
      installed = true;
      const handoff = data as unknown as Handoff;
      waiting = {
        streamId: typeof handoff.streamId === "string" ? handoff.streamId : null,
        platform: String(handoff.platform ?? ""),
        title: String(handoff.title ?? ""),
        reason: handoff.reason ?? null,
      };
      deliver();
    }
  });

  // The extension announces itself at document_start, which is before this
  // module exists -- the wasm engine loads first. Asking is how a late
  // listener finds out.
  window.postMessage({ channel: "opennotetaker-page", type: "hello" }, location.origin);
}

/// Whether the detector is installed. False until it says otherwise, so the
/// interface never promises a feature that is not there.
export function detectorInstalled(): boolean {
  return installed;
}

/// Run something when an offer arrives, whatever view is on screen.
///
/// An offer that arrived *before* this was called is delivered immediately,
/// and that is the ordinary case rather than an edge one: the extension opens
/// this tab and posts the handover as soon as the content script runs, while
/// the app is still instantiating a WebAssembly module. The first version of
/// this file dropped exactly those handovers -- the app opened, and sat on the
/// home page as though nothing had been asked of it.
export function onHandoff(listener: (handoff: Handoff) => void): void {
  listeners.add(listener);
  deliver();
}

/// Hand the waiting offer to the listeners, once. Nothing is kept afterwards:
/// a handover is answered a single time, and a stale one must not re-arm the
/// record screen every time the user navigates back to it.
function deliver(): void {
  const handoff = waiting;
  if (!handoff || listeners.size === 0) return;
  waiting = null;
  for (const listener of listeners) listener(handoff);
}
