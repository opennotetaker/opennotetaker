// The detector, in a real browser, against a page served from meet.google.com.
//
// The unit tests in platforms.test.mjs cover which URLs are meetings. This
// covers everything after that, which is the half that cannot be reasoned
// about: whether the service worker actually reaches the content script,
// whether the banner survives being injected into a hostile page, whether
// pressing Record opens the app, and whether the app understands what it was
// handed. Four moving parts across three JavaScript realms.
//
// The meeting page is intercepted rather than real -- Google will not serve a
// call to a robot, and would ask it to sign in first. The interception happens
// at the network layer, so the tab's origin really is meet.google.com and
// every matching rule in the manifest is exercised for real.
//
// What this cannot cover is the stream id itself. `chrome.tabCapture` refuses
// to mint one without an "active invocation" that a driven click does not
// count as, so the assertion here is the *fallback*: the app is opened, told
// which meeting it came from, and left showing the consent screen with the
// picker one press away. That is the path a user hits whenever the shortcut is
// unavailable, and it is the one that must never be broken.

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const extension = join(here, "..");
const web = join(here, "..", "..", "web");

const PORT = 4184;
const BASE = `http://127.0.0.1:${PORT}/`;
const MEETING = "https://meet.google.com/abc-defg-hij";

const failures = [];
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  ok  ${name}`);
  else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

// Built here rather than assumed: this test asserts things about the app's
// half of the handover (lib/ext-bridge.ts), and a stale dist would test the
// last version of it.
await run("npx", ["vite", "build"], web);

const server = spawn(
  "npx",
  ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
  { cwd: web, stdio: ["ignore", "pipe", "inherit"] },
);
process.on("exit", () => server.kill());
await waitFor(BASE, 20_000);

const profile = await mkdtemp(join(tmpdir(), "opennotetaker-ext-"));
const context = await launch(profile);

try {
  // The service worker's URL is where the extension's own id comes from, and
  // the popup is the only way to tell it where a self-hosted app lives.
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  check("the service worker started", Boolean(id), worker.url());

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/src/popup.html`);
  await popup.fill("#app-url", BASE);
  await popup.click("#save");
  await popup.waitForFunction(
    (saved) => document.getElementById("save").textContent === saved,
    "Saved",
  );
  check("the popup stores where the app is", true);

  const meeting = await context.newPage();
  await meeting.route("**/*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Standup — Google Meet</title><body><h1>A call</h1>",
    }),
  );
  await meeting.goto(MEETING);

  // The banner is drawn in an open shadow root, which Playwright's selectors
  // pierce; `#opennotetaker-prompt` is the host element in the page.
  const prompt = meeting.locator("#opennotetaker-prompt .card");
  await prompt.waitFor({ timeout: 15_000 });
  const heading = await prompt.locator(".title").textContent();
  check("the meeting is noticed and the prompt is drawn", true);
  check("the prompt names the platform", heading.includes("Google Meet"), heading);

  const opened = context.waitForEvent("page");
  await prompt.getByRole("button", { name: "Record this meeting" }).click();
  const app = await opened;
  await app.waitForLoadState("domcontentloaded");
  check("pressing record opens the app", app.url().startsWith(BASE), app.url());

  // The app boots the wasm engine before it draws anything, so the handover
  // has to survive a page that is not listening yet.
  const card = app.locator("main .card", { hasText: "Google Meet call" });
  await card.waitFor({ timeout: 30_000 });
  check("the app lands on the consent screen, knowing where it came from", true);
  check(
    "the meeting's name is carried over",
    (await card.textContent()).includes("Standup"),
    await card.textContent(),
  );

  // `main h1`, not `h1`: the page carries the landing copy's heading as well
  // now that the site and the app share one origin.
  const started = await app.locator("main h1").first().textContent();
  check("nothing is recording yet", started.includes("Before you record"), started);

  const ticked = await app
    .locator("label.check", { hasText: "Google Meet tab" })
    .locator("input")
    .isChecked();
  check("the meeting tab is already chosen as the source", ticked);

  // A second meeting must land in the app tab that is already open, not in a
  // third one. Somebody who records two calls in an afternoon should not end
  // the day with a window full of OpenNoteTaker.
  const before = context.pages().length;
  const again = await context.newPage();
  await again.route("**/*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Retro — Google Meet</title><body><h1>A call</h1>",
    }),
  );
  await again.goto("https://meet.google.com/xyz-mnop-qrs");
  const secondPrompt = again.locator("#opennotetaker-prompt .card");
  await secondPrompt.waitFor({ timeout: 15_000 });
  await secondPrompt.getByRole("button", { name: "Record this meeting" }).click();
  await app.locator("main .card", { hasText: "Retro" }).waitFor({ timeout: 30_000 });
  check(
    "a second meeting reuses the app tab that is open",
    context.pages().length === before + 1,
    `${context.pages().length} pages, expected ${before + 1}`,
  );

  // "Never ask here" has to actually silence the site, or the prompt becomes
  // the pop-up it replaces.
  const second = await context.newPage();
  await second.route("**/*", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Standup</title>" }),
  );
  await second.goto(MEETING);
  await second.locator("#opennotetaker-prompt .card").waitFor({ timeout: 15_000 });
  await second
    .locator("#opennotetaker-prompt")
    .getByRole("button", { name: /Never ask/ })
    .click();

  const third = await context.newPage();
  await third.route("**/*", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Standup</title>" }),
  );
  await third.goto(MEETING);
  await third.waitForTimeout(3_000);
  check(
    "“never ask here” is obeyed on the next meeting",
    (await third.locator("#opennotetaker-prompt").count()) === 0,
  );
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
  server.kill();
}

console.log("");
if (failures.length) {
  console.log(`${failures.length} failed:`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log("detector e2e: all checks passed");

/// Chromium only loads an unpacked extension from a persistent profile, and
/// only in a headed or new-headless browser. `channel: "chromium"` is the
/// build that supports the latter; without it the run falls back to a visible
/// window rather than silently testing nothing.
async function launch(profile) {
  const args = [
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
    "--no-first-run",
  ];
  try {
    return await chromium.launchPersistentContext(profile, { channel: "chromium", args });
  } catch {
    return await chromium.launchPersistentContext(profile, { headless: false, args });
  }
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "ignore", "inherit"] });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)),
    );
  });
}

async function waitFor(url, timeout) {
  const until = Date.now() + timeout;
  for (;;) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    if (Date.now() > until) throw new Error(`${url} never came up`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
