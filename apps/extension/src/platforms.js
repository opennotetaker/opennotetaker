// Which URLs are a meeting, and how sure we are.
//
// A page cannot see another tab, so the auto-detection this file drives is the
// one part of OpenNoteTaker that has to live in an extension (see
// ../README.md). Everything here is a pure function over a URL string: the
// service worker imports it, and test/platforms.test.mjs runs it against a
// table of real meeting URLs. No DOM, no chrome.* -- a detector that can only
// be tested by joining a call is a detector nobody re-tests after changing it.
//
// # Two confidence levels, because the URL is not always enough
//
// - **"room"** -- the URL names a specific meeting. Google Meet's
//   `/abc-defg-hij`, Zoom's `/j/<id>`, a Teams `meetup-join` link. Prompt.
// - **"maybe"** -- the tab is on a meeting host, but the URL is the product's
//   own shell and says nothing. Teams v2 is a single page application that
//   keeps `teams.microsoft.com/v2/` in the address bar through an entire call;
//   Zoom and VooV both have web clients whose URL shape has changed more than
//   once. Here the content script watches the page for a leave-the-call
//   control instead, and prompts when one appears.
//
// Nothing below is allowed to prompt on a marketing page: `zoom.us/pricing`
// and `meet.google.com` (the launcher) must both come back null, or the
// extension becomes the thing it is meant to replace.

/// A confidence level, or null for "not a meeting".
/// @typedef {"room" | "maybe" | null} Confidence

const PLATFORMS = [
  {
    id: "meet",
    name: "Google Meet",
    hosts: ["meet.google.com"],
    room(url) {
      // Meet codes are three-four-three lowercase letters. The launcher page
      // ("/"), the landing page and `/new` are not rooms.
      return (
        /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/.test(url.pathname) ||
        // A dial-in or nickname link resolves to a room without showing the
        // code, and `/lookup/` is what a calendar invite hands you.
        /^\/lookup\/[^/]+\/?$/.test(url.pathname)
      );
    },
    maybe: () => false,
  },
  {
    id: "zoom",
    name: "Zoom",
    // Zoom serves meetings from per-account subdomains (`acme.zoom.us`), from
    // `app.zoom.us` for the web client, and increasingly from zoom.com.
    hosts: [".zoom.us", ".zoom.com", "zoom.us", "zoom.com"],
    room(url) {
      return (
        // The browser client, in all the shapes it has shipped in:
        // /wc/join/<id>, /wc/<id>/join, /wc/<id>/start, /wc?confno=<id>
        /^\/wc(\/|$)/.test(url.pathname) ||
        // Join and start links out of an invitation.
        /^\/(j|s|w)\/\d+/.test(url.pathname) ||
        // A personal meeting room: zoom.us/my/<vanity>.
        /^\/my\/[^/]+/.test(url.pathname)
      );
    },
    maybe: () => false,
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    hosts: ["teams.microsoft.com", "teams.live.com", "teams.microsoft.us"],
    room(url) {
      const whole = url.href;
      return (
        // The link in the invitation, before joining.
        whole.includes("/l/meetup-join/") ||
        whole.includes("meetup-join") ||
        // What the address bar becomes on the way into a call.
        url.searchParams.get("meetingjoin") === "true" ||
        /(^|#)\/(pre-join-calling|calling|meet)(\/|$)/.test(url.hash) ||
        // A free Teams meeting link: teams.live.com/meet/<id>.
        /^\/(meet|_#\/meet)\/\d+/.test(url.pathname)
      );
    },
    // Everything else on a Teams host: chat, the activity feed, and -- because
    // the URL stops changing once you are in -- an entire meeting. The page
    // itself has to answer this one.
    maybe: () => true,
  },
  {
    id: "voov",
    name: "VooV Meeting",
    // 腾讯会议 internationally is VooV. The web client has lived on all of
    // these; wemeet.qq.com is what a mainland invitation link uses.
    hosts: [
      "meeting.tencent.com",
      ".voovmeeting.com",
      "voovmeeting.com",
      "wemeet.qq.com",
      "meeting.qq.com",
    ],
    room(url) {
      return (
        /^\/(wc|dm|dw|cw)(\/|$)/.test(url.pathname) ||
        url.searchParams.has("meeting_code") ||
        url.searchParams.has("meetingCode") ||
        // Short join links: meeting.tencent.com/p/<code>
        /^\/p\/\d+/.test(url.pathname)
      );
    },
    maybe: (url) => url.pathname !== "/" && !/^\/(download|about|price)/.test(url.pathname),
  },
];

function hostMatches(host, patterns) {
  return patterns.some((pattern) =>
    pattern.startsWith(".") ? host.endsWith(pattern) : host === pattern,
  );
}

/// What this URL is, as far as a URL can say.
///
/// @param {string} href
/// @returns {{ id: string, name: string, confidence: "room" | "maybe" } | null}
export function detect(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  // http is not in the list on purpose: a meeting is https everywhere, and
  // tabCapture's consumer tab has to be a secure origin regardless.
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  for (const platform of PLATFORMS) {
    if (!hostMatches(host, platform.hosts)) continue;
    if (platform.room(url)) {
      return { id: platform.id, name: platform.name, confidence: "room" };
    }
    if (platform.maybe(url)) {
      return { id: platform.id, name: platform.name, confidence: "maybe" };
    }
    return null;
  }
  return null;
}

/// Every host the content script has to be present on, as match patterns.
/// Kept next to the rules above so the manifest and the detector cannot drift
/// apart -- test/platforms.test.mjs asserts the manifest lists exactly these.
export const MATCH_PATTERNS = [
  "https://meet.google.com/*",
  "https://*.zoom.us/*",
  "https://*.zoom.com/*",
  "https://teams.microsoft.com/*",
  "https://teams.live.com/*",
  "https://teams.microsoft.us/*",
  "https://meeting.tencent.com/*",
  "https://*.voovmeeting.com/*",
  "https://wemeet.qq.com/*",
  "https://meeting.qq.com/*",
];
