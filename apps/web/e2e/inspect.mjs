// Run a real recording through the real pipeline and print what it made of it.
//
//   node apps/web/e2e/inspect.mjs ~/Downloads/meeting.webm [--language zh]
//
// Not a test and not shipped: this is the bench for looking at output
// adversarially, which is the stage that finds what green tests do not. It
// drives the built bundle in a real browser, through `transcribe()` and
// `diarize()` — the same calls the recorder makes — so what it prints is what
// a user would have got, not an approximation of it.
//
// Reads the numbers back as well as the text, because the failures worth
// finding are arithmetic: a language holding 0.5% of a recording, a segment
// spanning thirty seconds with four words in it, a speaker who says two words
// in twenty-eight minutes.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname, isAbsolute, resolve } from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("usage: node e2e/inspect.mjs <audio file> [--language zh] [--model NAME]");
  process.exit(2);
}
// npm runs this with cwd = apps/web, so a path the user typed at the repo root
// would not resolve. INIT_CWD is where they actually were.
const path = isAbsolute(file) ? file : resolve(process.env.INIT_CWD ?? process.cwd(), file);

const flag = (name, fallback = null) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};

const PORT = 4189;
const BASE = `http://127.0.0.1:${PORT}/`;
const server = spawn(
  "npx",
  ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
  { cwd: new URL("..", import.meta.url).pathname, stdio: "ignore" },
);
process.on("exit", () => server.kill());
for (let i = 0; i < 60; i += 1) {
  try {
    if ((await fetch(BASE, { signal: AbortSignal.timeout(1000) })).ok) break;
  } catch {
    /* not up yet */
  }
  await new Promise((done) => setTimeout(done, 500));
}

const bytes = readFileSync(path);
console.log(`\n${basename(path)} — ${(bytes.length / 1e6).toFixed(1)} MB`);

const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(3_600_000);
page.on("console", (m) => {
  const text = m.text();
  if (/warn|error|Error/i.test(text) && !/DevTools|favicon/.test(text)) {
    console.log(`  [page] ${text.slice(0, 160)}`);
  }
});
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__test?.transcribe));

console.log("  …decoding, then transcribing. Minutes, not seconds.\n");
const started = Date.now();

const out = await page.evaluate(
  async ({ base64, type, language, model }) => {
    const { transcribe } = window.__test.transcribe;
    const { decodeToPcm, durationMs } = window.__test.decode;
    const { engine } = window.__test;

    const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const pcm = await decodeToPcm(new Blob([raw], { type }), () => {});

    const result = await transcribe({
      pcm,
      model: model ?? "onnx-community/whisper-base",
      language: language ?? "",
      secondLanguage: "",
      translate: false,
      onProgress: () => {},
    });

    // Diarize through the same wasm the note view calls.
    const transcript = engine.fromChunks(result.chunks, result.dominant, true);
    const report = engine.diarize(transcript, pcm, engine.diarizeDefaultOptions());
    const summary = engine.summariseLocal(report.transcript);

    return {
      seconds: durationMs(pcm) / 1000,
      languages: result.languages,
      dominant: result.dominant,
      chunks: result.chunks,
      speakers: report.report.speakers,
      unassigned: report.report.unassigned,
      talk: report.transcript.speakers.map((s) => ({
        id: s.id,
        seconds: report.transcript.segments
          .filter((seg) => seg.speaker === s.id)
          .reduce((n, seg) => n + (seg.end_ms - seg.start_ms) / 1000, 0),
      })),
      topics: summary?.topics ?? [],
      actions: (summary?.actions ?? []).map((a) => a.text),
    };
  },
  {
    base64: bytes.toString("base64"),
    type: extname(path) === ".wav" ? "audio/wav" : "audio/webm",
    language: flag("language", ""),
    model: flag("model"),
  },
);

const mins = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// The union of what the lines cover, not the sum of their lengths. Passes read
// a few seconds past their own end so a sentence already under way is
// finished, so segments legitimately overlap — summing them reported 116%
// coverage of a file, which is not a thing.
const spoken = (() => {
  const spans = out.chunks
    .map((c) => [c.start_ms / 1000, c.end_ms / 1000])
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let from = null;
  let to = null;
  for (const [a, b] of spans) {
    if (from === null) [from, to] = [a, b];
    else if (a <= to) to = Math.max(to, b);
    else {
      total += to - from;
      [from, to] = [a, b];
    }
  }
  return Math.min(out.seconds, total + (from === null ? 0 : to - from));
})();

console.log(`  ${mins(out.seconds)} of audio, transcribed in ${mins((Date.now() - started) / 1000)}`);
console.log(`  ${out.chunks.length} lines covering ${mins(spoken)} — ${((spoken / out.seconds) * 100).toFixed(0)}% of the recording`);
console.log(`  languages: ${out.languages.join(", ")} (dominant ${out.dominant})`);
console.log(`  speakers: ${out.speakers}, ${out.unassigned} lines too short to attribute`);
for (const s of out.talk.sort((a, b) => b.seconds - a.seconds)) {
  console.log(`    ${s.id.padEnd(4)} ${mins(s.seconds).padStart(6)}  ${((s.seconds / spoken) * 100).toFixed(0)}%`);
}

// Coverage is the number that catches the pipeline dropping spans: a meeting
// with people talking through it does not have a third of its minutes empty.
const gaps = [];
let cursor = 0;
for (const c of out.chunks) {
  if (c.start_ms / 1000 - cursor >= 4) gaps.push([cursor, c.start_ms / 1000]);
  cursor = Math.max(cursor, c.end_ms / 1000);
}
if (out.seconds - cursor >= 4) gaps.push([cursor, out.seconds]);
console.log(`\n  gaps of 4s or more with no transcript: ${gaps.length}`);
for (const [a, b] of gaps.slice(0, 12)) console.log(`    ${mins(a)} – ${mins(b)}  (${Math.round(b - a)}s)`);
if (gaps.length > 12) console.log(`    …and ${gaps.length - 12} more`);

// Scripts, per line, so a file that flips between them is visible as a count
// rather than by reading it.
const trad = out.chunks.filter((c) => /[們個開會討論預問題場說時間報來備準]/.test(c.text)).length;
const han = out.chunks.filter((c) => /[一-鿿]/.test(c.text)).length;
const other = out.chunks.filter((c) => /[฀-๿぀-ヿ가-힯]/.test(c.text));
console.log(`\n  lines with Han characters: ${han}, of which Traditional forms: ${trad}`);
console.log(`  lines with Thai, kana or Hangul: ${other.length}`);
for (const c of other.slice(0, 5)) console.log(`    ${mins(c.start_ms / 1000)}  ${c.text.slice(0, 70)}`);

console.log(`\n  topics: ${out.topics.join(" · ") || "(none)"}`);
console.log(`  action items: ${out.actions.length}`);
for (const a of out.actions.slice(0, 6)) console.log(`    ${a.slice(0, 78)}`);

const dump = `${path.replace(/\.[^.]+$/, "")}-transcript.txt`;
writeFileSync(
  dump,
  out.chunks.map((c) => `[${mins(c.start_ms / 1000)}] ${c.text}`).join("\n"),
);
console.log(`\n  full transcript written to ${dump}\n`);

await browser.close();
server.kill();
