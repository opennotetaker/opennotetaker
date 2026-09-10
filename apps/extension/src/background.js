// The part that watches tabs, and the handover into the app.
//
// # What this is allowed to know
//
// Everything here runs on URLs and tab ids. It never reads a page's contents,
// never sees audio, and talks to no server -- the extension exists to notice a
// meeting and to point the user at a tab, and a privacy product cannot ship a
// component that quietly does more than that. The only stored state is which
// sites the user has told us to stop asking about, and where their copy of the
// app lives.
//
// # The handover, and why it has a fallback
//
// Pressing "Record" opens OpenNoteTaker and hands it a `chrome.tabCapture`
// stream id for the meeting tab. That id lets the *page* -- not the extension
// -- open the audio directly (`getMediaStreamId` names the app tab as the
// consumer), which skips the share-a-tab picker and removes the two ways that
// picker goes wrong: choosing the wrong tab, and missing the "share audio"
// tick box.
//
// tabCapture also requires the extension to have been "actively invoked" for
// that tab, and a click inside a page we injected does not always count. When
// it does not, `getMediaStreamId` throws, and the handover degrades to the
// flow the app has always had: the consent screen, with the tab source ticked
// and the picker one press away. A failed shortcut must never be a failed
// recording.

import { detect, normaliseAppUrl, recordRoute } from "./platforms.js";

const DEFAULT_APP_URL = "https://opennotetaker.app/";
const HANDOFF = "opennotetaker:handoff";

/// Tabs we have already prompted for, keyed by tab id, valued by the URL the
/// prompt was for. A meeting that ends and a new one that starts in the same
/// tab should prompt again; a re-render of the same meeting should not.
const prompted = new Map();

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }).then(({ appUrl }) =>
    chrome.storage.sync.set({ appUrl }),
  );
});

// ------------------------------------------------------------------ settings

async function appUrl() {
  const { appUrl } = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  return normaliseAppUrl(appUrl) || DEFAULT_APP_URL;
}


async function silenced(host) {
  const { silenced = [] } = await chrome.storage.sync.get({ silenced: [] });
  return silenced.includes(host);
}

// ------------------------------------------------------------------ watching

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.url) {
    prompted.delete(tabId);
    // A tab that navigated away is no longer an app tab, whatever it was a
    // moment ago. It says hello again if it still is.
    announced.delete(tabId);
    apps.delete(tabId);
  }
  if (change.status !== "complete" && !change.url) return;
  void consider(tabId, tab.url ?? "");
});

chrome.tabs.onRemoved.addListener((tabId) => {
  prompted.delete(tabId);
  announced.delete(tabId);
  apps.delete(tabId);
});

/// Decide whether this tab should be asked about, and tell its content script.
///
/// The content script is the one that draws anything, and for a "maybe" it
/// waits for the page to grow a leave-the-call button first. This function
/// only ever says "you are on Zoom, watch for a call" or nothing at all.
async function consider(tabId, url) {
  const found = detect(url);
  if (!found) return;
  if (prompted.get(tabId) === url) return;
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return;
  }
  if (await silenced(host)) return;
  prompted.set(tabId, url);
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "opennotetaker:detected",
      platform: found.name,
      confidence: found.confidence,
      host,
    });
  } catch {
    // No content script yet (the tab is still loading, or it is a page our
    // matches do not cover). The content script says hello when it starts, and
    // that path asks again.
  }
}

// ------------------------------------------------------------------ messages

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === "opennotetaker:hello" && sender.tab?.id != null) {
    // The content script started after we looked, which is the common case on
    // a single page application that navigates without a load.
    prompted.delete(sender.tab.id);
    void consider(sender.tab.id, sender.tab.url ?? message.url ?? "");
    respond({ ok: true });
    return true;
  }

  if (message?.type === "opennotetaker:record") {
    const tabId = message.tabId ?? sender.tab?.id;
    if (tabId == null) {
      respond({ ok: false });
      return true;
    }
    void record(tabId, message.platform ?? "", message.title ?? "").then(respond);
    return true;
  }

  if (message?.type === "opennotetaker:silence") {
    void chrome.storage.sync.get({ silenced: [] }).then(({ silenced }) => {
      if (!silenced.includes(message.host)) silenced.push(message.host);
      return chrome.storage.sync.set({ silenced });
    }).then(() => respond({ ok: true }));
    return true;
  }

  if (message?.type === "opennotetaker:meetings") {
    void meetings().then(respond);
    return true;
  }

  if (message?.type === "opennotetaker:app-here" && sender.tab?.id != null) {
    apps.add(sender.tab.id);
    announced.add(sender.tab.id);
    ready.get(sender.tab.id)?.();
    respond({ ok: true });
    return true;
  }

  if (message?.type === "opennotetaker:bridge-ready" && sender.tab?.id != null) {
    // Remembered, not just signalled. The app tab announces itself the moment
    // its content script runs, which is regularly *before* anything here is
    // waiting to hear it, and a resolver that was not registered yet used to
    // mean a fifteen second stall followed by a handover into a tab nobody was
    // watching.
    announced.add(sender.tab.id);
    ready.get(sender.tab.id)?.();
    respond({ ok: true });
    return true;
  }

  return false;
});

/// Every open tab that currently looks like a meeting. The popup's list, and
/// the reason the popup exists: a click on the toolbar icon is an invocation
/// Chrome always accepts, so the fast path is available even when the in-page
/// button's is not.
async function meetings() {
  const tabs = await chrome.tabs.query({});
  return tabs
    .map((tab) => ({ tab, found: detect(tab.url ?? "") }))
    .filter((row) => row.found)
    .map(({ tab, found }) => ({
      tabId: tab.id,
      title: tab.title ?? "",
      platform: found.name,
      confidence: found.confidence,
      audible: tab.audible === true,
    }));
}

// ----------------------------------------------------------------- handover

/// Resolvers waiting for a bridge on a given tab to announce itself, and the
/// tabs that have already done so.
const ready = new Map();
const announced = new Set();
/// Tabs where the app itself -- not merely a page on its origin -- has said
/// hello. Preferred over opening a new one, so that somebody running their own
/// copy on a port we were never told about still gets their meeting handed to
/// the tab they already have open.
const apps = new Set();

async function record(meetingTabId, platform, title) {
  const target = await chrome.tabs.get(meetingTabId).catch(() => null);
  if (!target) return { ok: false };

  const app = await openApp();
  if (!app) return { ok: false };

  let streamId = null;
  let reason = null;
  try {
    streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: meetingTabId,
      consumerTabId: app.id,
    });
  } catch (error) {
    reason = error instanceof Error ? error.message : String(error);
  }

  await handOver(app.id, {
    type: HANDOFF,
    streamId,
    reason,
    platform: platform || detect(target.url ?? "")?.name || "",
    title: title || target.title || "",
    meetingTabId,
  });

  await chrome.tabs.update(app.id, { active: true });
  await chrome.windows.update(app.windowId, { focused: true }).catch(() => undefined);
  return { ok: true, direct: streamId !== null };
}

/// Deliver the handover, retrying while the app tab is still coming up.
///
/// One `sendMessage` is not enough: an app tab that has just been created can
/// be between documents when the message is sent, and the failure mode of
/// losing it is the worst one this extension has -- a tab that opens, says
/// nothing about why, and leaves the user looking at a home page.
async function handOver(tabId, payload) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await chrome.tabs.sendMessage(tabId, payload);
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return false;
}

/// Find the app tab or open one, and do not return until its bridge answers.
///
/// A stream id issued for a tab that is still on about:blank is useless: the
/// id is bound to the consumer tab's origin, and the origin at that moment is
/// not the app's.
async function openApp() {
  // The consent screen, not the front door. A handoff exists to fill that
  // screen in, and since the app and the product page moved to one origin the
  // front door shows the marketing copy with the app hidden behind it — so
  // opening the bare address delivered the handoff to a page nobody could see.
  const url = recordRoute(await appUrl());
  const origin = new URL(url).origin;
  const all = await chrome.tabs.query({});
  const open =
    all.find((tab) => tab.id != null && apps.has(tab.id)) ??
    all.find((tab) => tab.url && tab.url.startsWith(origin));
  if (open?.id != null) {
    // An app tab that is already loaded has a bridge; one that is mid-load
    // will announce itself in a moment. Either way the wait below is short.
    const wait = readyOn(open.id);
    await chrome.tabs.sendMessage(open.id, { type: "opennotetaker:ping" }).then(
      () => ready.get(open.id)?.(),
      () => undefined,
    );
    await wait;
    return open;
  }
  const created = await chrome.tabs.create({ url, active: true });
  if (created.id == null) return null;
  await readyOn(created.id);
  return created;
}

function readyOn(tabId) {
  if (announced.has(tabId)) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      ready.delete(tabId);
      resolve();
    };
    // A timeout rather than a hang: if the bridge never answers -- an old
    // build, a blocked script -- the handover still happens and the app falls
    // back to the picker.
    const timer = setTimeout(done, 15_000);
    ready.set(tabId, done);
  });
}
