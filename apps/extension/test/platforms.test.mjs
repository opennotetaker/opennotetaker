// The detector, against the URLs it will actually see.
//
// Every entry below is a URL shape these four products have shipped. The
// negative half matters more than the positive half: an extension that offers
// to record somebody's Zoom pricing page, or their Teams chat with their
// manager, is uninstalled the same afternoon.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import { detect, MATCH_PATTERNS, normaliseAppUrl, recordRoute } from "../src/platforms.js";

const here = dirname(fileURLToPath(import.meta.url));

const ROOMS = [
  ["https://meet.google.com/abc-defg-hij", "meet", "Google Meet"],
  ["https://meet.google.com/abc-defg-hij?authuser=1", "meet", "Google Meet"],
  ["https://meet.google.com/lookup/standup-daily", "meet", "Google Meet"],
  ["https://zoom.us/j/91234567890", "zoom", "Zoom"],
  ["https://zoom.us/j/91234567890?pwd=abc123", "zoom", "Zoom"],
  ["https://acme.zoom.us/j/91234567890", "zoom", "Zoom"],
  ["https://app.zoom.us/wc/91234567890/start", "zoom", "Zoom"],
  ["https://us02web.zoom.us/wc/join/91234567890", "zoom", "Zoom"],
  ["https://acme.zoom.us/my/darius", "zoom", "Zoom"],
  ["https://app.zoom.com/wc/91234567890/join", "zoom", "Zoom"],
  [
    "https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc%40thread.v2/0?context=%7b%7d",
    "teams",
    "Microsoft Teams",
  ],
  ["https://teams.live.com/meet/9312345678901", "teams", "Microsoft Teams"],
  ["https://teams.microsoft.com/v2/?meetingjoin=true", "teams", "Microsoft Teams"],
  ["https://teams.microsoft.com/v2/#/pre-join-calling/19:meeting_abc", "teams", "Microsoft Teams"],
  ["https://meeting.tencent.com/wc/?meeting_code=123456789", "voov", "VooV Meeting"],
  ["https://meeting.tencent.com/dm/AbCdEf123456", "voov", "VooV Meeting"],
  ["https://w.voovmeeting.com/wc/?meeting_code=123456789", "voov", "VooV Meeting"],
  ["https://wemeet.qq.com/p/123456789", "voov", "VooV Meeting"],
];

const SHELLS = [
  // Teams keeps the same URL through an entire call, so its shell has to stay
  // a "maybe" and let the page decide -- see content.js.
  ["https://teams.microsoft.com/v2/", "teams"],
  ["https://teams.microsoft.com/v2/#/conversations/General", "teams"],
  ["https://meeting.tencent.com/user-center", "voov"],
];

const NOT_MEETINGS = [
  "https://zoom.us/",
  "https://zoom.us/pricing",
  "https://zoom.us/signin",
  "https://explore.zoom.us/en/products/meetings/",
  "https://meet.google.com/",
  "https://meet.google.com/landing",
  "https://meet.google.com/new",
  "https://meeting.tencent.com/",
  "https://meeting.tencent.com/download",
  "https://www.google.com/search?q=zoom",
  "https://example.com/zoom.us/j/9123",
  // http, never: a meeting is https, and tabCapture's consumer must be a
  // secure origin anyway.
  "http://meet.google.com/abc-defg-hij",
  "not a url at all",
  "",
];

test("a meeting room URL is recognised, with its platform", () => {
  for (const [url, id, name] of ROOMS) {
    const found = detect(url);
    assert.ok(found, `expected a match for ${url}`);
    assert.equal(found.id, id, url);
    assert.equal(found.name, name, url);
    assert.equal(found.confidence, "room", url);
  }
});

test("a meeting product's own shell is a maybe, not a prompt", () => {
  for (const [url, id] of SHELLS) {
    const found = detect(url);
    assert.ok(found, `expected a match for ${url}`);
    assert.equal(found.id, id, url);
    assert.equal(found.confidence, "maybe", url);
  }
});

test("nothing else is a meeting", () => {
  for (const url of NOT_MEETINGS) {
    assert.equal(detect(url), null, `${url} should not be a meeting`);
  }
});

test("the manifest injects on exactly the hosts the detector knows", () => {
  const manifest = JSON.parse(readFileSync(join(here, "..", "manifest.json"), "utf8"));
  const injected = manifest.content_scripts.find((entry) =>
    entry.js.includes("src/content.js"),
  ).matches;
  assert.deepEqual([...injected].sort(), [...MATCH_PATTERNS].sort());
});

test("every message the code asks for exists in every locale", () => {
  const locales = ["en", "zh_CN", "zh_TW"].map((code) => [
    code,
    JSON.parse(readFileSync(join(here, "..", "_locales", code, "messages.json"), "utf8")),
  ]);
  const used = new Set();
  for (const file of ["content.js", "popup.js"]) {
    const source = readFileSync(join(here, "..", "src", file), "utf8");
    for (const match of source.matchAll(/getMessage\(\s*"([^"]+)"/g)) used.add(match[1]);
    for (const match of source.matchAll(/\btext\("([^"]+)"/g)) used.add(match[1]);
  }
  // The manifest asks for two of its own, by __MSG_…__ substitution.
  used.add("name");
  used.add("description");
  for (const [code, catalogue] of locales) {
    for (const key of used) {
      assert.ok(catalogue[key]?.message, `${code} is missing "${key}"`);
    }
    assert.equal(
      Object.keys(catalogue).length,
      Object.keys(locales[0][1]).length,
      `${code} has a different number of messages from en`,
    );
  }
});

test("an address stored before the app moved is rewritten, not followed", () => {
  // The old host is retired -- no DNS at all -- so a stored value pointing at
  // it opens a page that cannot resolve. This is the only thing preventing it.
  assert.equal(
    normaliseAppUrl("https://app.opennotetaker.app/"),
    "https://opennotetaker.app/",
  );
  // Only that one host, and only that label. A self-hosted install is not ours
  // to rewrite.
  assert.equal(normaliseAppUrl("https://notes.example.com/"), "https://notes.example.com/");
  assert.equal(normaliseAppUrl("http://localhost:5173/"), "http://localhost:5173/");
  assert.equal(normaliseAppUrl("https://opennotetaker.app/"), "https://opennotetaker.app/");
  // Nonsense falls through to the default rather than throwing on every prompt.
  assert.equal(normaliseAppUrl("not a url"), null);
});

test("a handoff opens the consent screen, not the front door", () => {
  // The app and the product page share one origin now, so the bare address
  // shows the marketing copy with the app hidden behind it.
  assert.equal(recordRoute("https://opennotetaker.app/"), "https://opennotetaker.app/#/record");
  assert.equal(recordRoute("http://localhost:5173/"), "http://localhost:5173/#/record");
  // An address that already carries a route is replaced, not appended to.
  assert.equal(recordRoute("https://opennotetaker.app/#/library"), "https://opennotetaker.app/#/record");
  assert.equal(recordRoute("nonsense"), "nonsense");
});
