// Photograph the built app, holding real content, for the test guide.
//
// Drives `dist/` — the shipped build, not the dev server and not the E2E
// build. That rules out `window.__test`, which only exists behind the
// OPENNOTETAKER_E2E flag, so the meeting is loaded the way a user would load
// one: through the library's own "Import an export" button, with a real export
// file. Everything downstream of that — the speaker legend, the timeline, the
// summary — is computed by the shipped wasm rather than written into the
// fixture.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const PORT = 4187;
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = process.argv[2];
if (!OUT) throw new Error("usage: node e2e/capture.mjs <output directory>");

/// A meeting worth showing: two speakers, a decision, an action item, a
/// deadline, and a switch into Chinese — every claim the guide makes, in one
/// transcript.
const LINES = [
  [0, 4200, "Right, let's look at the burn rate before anything else today.", "S0"],
  [4400, 9100, "Hosting is up about eleven percent, and most of that is the staging environment.", "S1"],
  [9300, 14200, "Nobody has turned staging off since March, so it has been running the whole time.", "S0"],
  [14400, 19000, "I can take that this afternoon. It should be an hour of work at the very most.", "S1"],
  [19200, 24600, "Good. The other thing is the region migration we promised by the end of the month.", "S0"],
  [24800, 29900, "That is tight. I would rather push it two weeks than rush it and break the queue.", "S1"],
  [30100, 35400, "Agreed, let's push it. I'll tell marketing they have until Friday week for the report.", "S0"],
  [35600, 41200, "我們下個星期開會討論預算的問題，市場部說他們需要更多的時間來準備報告。", "S1"],
  [41400, 46000, "That works. I'll write up the staging cleanup and send it round tomorrow morning.", "S0"],
];

const EXPORT = join(tmpdir(), "opennotetaker-guide-export.json");
writeFileSync(EXPORT, JSON.stringify({
  app: "opennotetaker",
  version: 1,
  exported: new Date().toISOString(),
  notes: [{
    id: "guide-1",
    title: "Weekly planning",
    created: Date.now() - 86_400_000,
    updated: Date.now() - 86_400_000,
    transcript: {
      language: "en",
      source: "recorded",
      duration_ms: 46_000,
      segments: LINES.map(([start_ms, end_ms, text, speaker]) => ({
        start_ms, end_ms, text, speaker, confidence: null, edited: false,
      })),
      speakers: [
        { id: "S0", label: "Ana", named: true },
        { id: "S1", label: "Marcus", named: true },
      ],
    },
    // Left null on purpose: the guide clicks the summariser so the panel in
    // the screenshot is the engine's output, not a fixture's.
    summary: null,
    aiSummary: null,
    consent: {
      at: new Date(Date.now() - 86_400_000).toISOString(),
      participants: "Ana, Marcus, me",
      disclosure: "I am recording this call and transcribing it on my own machine.",
      captured: ["tab", "microphone"],
      method: "announced",
    },
    audio: null, audioType: null, durationMs: 46_000,
    language: "en", languages: ["en", "zh"],
  }],
}, null, 2));

const server = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], {
  cwd: new URL("..", import.meta.url).pathname, stdio: "ignore",
});
process.on("exit", () => server.kill());

// Wait for the port rather than sleeping, so a slow machine does not
// photograph a blank page.
for (let i = 0; i < 60; i += 1) {
  try { if ((await fetch(BASE, { signal: AbortSignal.timeout(1000) })).ok) break; } catch { /* not up */ }
  await new Promise((done) => setTimeout(done, 500));
}

const browser = await chromium.launch();
const shots = [];

async function shoot(page, name, caption) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  shots.push(name);
  console.log(`  ${name}  ${caption}`);
}

for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme,
  });
  const page = await ctx.newPage();
  const dark = scheme === "dark";

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("h1");
  if (!dark) await shoot(page, "01-start", "the empty state, before anything is recorded");

  // Load the meeting through the product's own restore path.
  await page.goto(BASE + "#/library", { waitUntil: "networkidle" });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import an export" }).click();
  await (await chooser).setFiles(EXPORT);
  await page.waitForFunction(() => document.querySelectorAll("a[href^='#/note/']").length > 0, null, { timeout: 20_000 });
  if (!dark) await shoot(page, "03-library", "the library, searchable across every meeting");

  await page.goto(BASE + "#/record", { waitUntil: "networkidle" });
  await page.waitForSelector("h1");
  if (!dark) await shoot(page, "02-consent", "the consent screen, which cannot be skipped");

  await page.goto(BASE + "#/note/guide-1", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelectorAll(".speaker-chip").length >= 2, null, { timeout: 20_000 });
  // Scroll to the transcript. The first version of this shot framed the
  // panels above it and contained no transcript at all, under a caption
  // promising one — which is exactly what looking at the screenshots catches.
  await page.evaluate(() => {
    const line = document.querySelector("[href^='#/note/'] , .segment, .line") ?? null;
    const heading = [...document.querySelectorAll("h2, h3")]
      .find((h) => /transcript/i.test(h.textContent ?? ""));
    (heading ?? line)?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(400);
  await shoot(page, dark ? "04-note-dark" : "04-note", "a transcript with speakers, in both themes");

  // Run the free summariser, so the panel below is the engine's own output.
  const redo = page.getByRole("button", { name: "Redo", exact: true }).first();
  await redo.waitFor({ timeout: 15_000 });
  await redo.click();
  // Wait for the panel to hold something, not for a fixed delay: a timeout
  // photographs an empty summary on a slow machine.
  await page.waitForFunction(
    () => !/Nothing stood out/.test(document.body.innerText),
    null, { timeout: 20_000 },
  );
  await redo.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  if (!dark) await shoot(page, "05-summary", "topics, decisions and action items, extracted on the device");

  if (!dark) {
    for (const [route, name, caption, settle] of [
      ["#/privacy", "06-privacy", "every host the app can contact, listed in the app itself", 300],
      ["#/ask", "07-ask", "questions across the whole library", 300],
      ["#/account", "08-account", "the account, which unlocks three things and gates nothing else", 1500],
    ]) {
      await page.goto(BASE + route, { waitUntil: "networkidle" });
      await page.waitForSelector("h1");
      await page.waitForTimeout(settle);
      await shoot(page, name, caption);
    }
  }

  await ctx.close();
}

await browser.close();
server.kill();
console.log(`\n${shots.length} screenshots in ${OUT}`);
