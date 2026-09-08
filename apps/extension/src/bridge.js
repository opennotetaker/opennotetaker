// The two lines of glue between the extension and the app tab.
//
// A content script and the page it sits in share a DOM and nothing else -- no
// variables, no functions -- so `window.postMessage` is the whole interface.
// It carries two things: "an extension is installed" (the app says so on the
// record screen, and stops explaining how to pick a tab), and the handover
// itself, which is a tabCapture stream id plus the name of the meeting it came
// from.
//
// The stream id is not a secret worth guarding from the page: it is issued
// *for* this page's origin, and is useless anywhere else. It is still posted
// with an explicit origin rather than "*", because a wildcard target on a page
// that may later embed something is a habit worth not having.

const CHANNEL = "opennotetaker-extension";

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type === "opennotetaker:ping") {
    respond({ ok: true });
    return true;
  }
  if (message?.type === "opennotetaker:handoff") {
    window.postMessage(
      {
        channel: CHANNEL,
        type: "handoff",
        streamId: message.streamId ?? null,
        platform: message.platform ?? "",
        title: message.title ?? "",
        reason: message.reason ?? null,
      },
      location.origin,
    );
    respond({ ok: true });
    return true;
  }
  return false;
});

// Announce, and keep announcing on demand: the app boots asynchronously (the
// wasm engine loads first), so a single message at document_start would arrive
// before anything is listening.
function announce() {
  window.postMessage({ channel: CHANNEL, type: "present" }, location.origin);
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.channel !== "opennotetaker-page") return;
  if (event.data.type === "hello") {
    announce();
    // Proof, rather than assumption, that this tab is the app. The bridge is
    // injected into every page on the configured origin -- which for somebody
    // running it locally means every page on localhost -- and a meeting handed
    // to whatever else that developer had open on port 3000 would be a
    // memorable bug. Only OpenNoteTaker says hello.
    chrome.runtime.sendMessage({ type: "opennotetaker:app-here" }).catch(() => undefined);
  }
});

announce();
document.addEventListener("DOMContentLoaded", announce);

// Tell the service worker this tab can receive a handover now. It waits for
// this before asking Chrome for a stream id, because an id is bound to the
// consumer tab's origin and a tab that is still blank has the wrong one.
chrome.runtime.sendMessage({ type: "opennotetaker:bridge-ready" }).catch(() => undefined);
