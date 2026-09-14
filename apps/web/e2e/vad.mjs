// Does the voice check agree with reality on real recordings?
//
// Ported from opensubs (APP-54) and pointed at what a meeting app meets. Built
// the same way round, and for a sharper reason here: a voice check that says
// "nobody spoke" over a real meeting costs someone the notes from that meeting.
// So most of this suite is audio that must NOT be flagged, and the no-speech
// side is kept honest about what it is.
//
//   node e2e/vad.mjs
//
// onnxruntime-node and onnxruntime-web are deliberately not declared in
// package.json; both arrive through @huggingface/transformers, as in opensubs.
// Declaring onnxruntime-web at any other version installs a second copy, and
// src/lib/vad.ts would then load a second 23 MB WebAssembly runtime beside the
// one Whisper uses. Measured on a real run: one ORT wasm is downloaded, shared by
// the voice check and the speech model. If this import fails, transformers.js
// has stopped carrying the runtime and both need declaring, at its version.
//
// Runs the model through onnxruntime-node with the same frame contract as
// src/lib/vad.ts. It tests the model and the contract; the browser path through
// vad.ts itself is exercised end to end by importing a recording in the app.
import * as ort from "onnxruntime-node";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";

const MODEL = "public/vad/silero_vad.onnx";
if (!existsSync(MODEL)) { console.error(`cannot run: ${MODEL} is missing`); process.exit(1); }

// 512 new samples preceded by the previous frame's last 64. A bare 512 runs
// without error and returns 0.001 for everything, speech included.
const CONTEXT = 64, HOP = 512, WINDOW = CONTEXT + HOP, RATE = 16000, SPEECH_P = 0.5;
const ENOUGH = 1.5; // must match ENOUGH_SPEECH_S in src/lib/vad.ts
const session = await ort.InferenceSession.create(MODEL);

function decode(path, { from = 0, seconds = null } = {}) {
  const wav = join(tmpdir(), `vad-${Date.now()}-${basename(path).replace(/\W/g, "")}.wav`);
  const args = ["-v", "error", "-y", "-ss", String(from), "-i", path];
  if (seconds) args.push("-t", String(seconds));
  execFileSync("ffmpeg", [...args, "-ac", "1", "-ar", String(RATE), wav]);
  return pcm16(readFileSync(wav));
}
function pcm16(b) {
  let off = 12, dataOff = 0, dataLen = 0;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4), size = b.readUInt32LE(off + 4);
    if (id === "data") { dataOff = off + 8; dataLen = size; break; }
    off += 8 + size + (size & 1);
  }
  const n = Math.floor(dataLen / 2), a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = b.readInt16LE(dataOff + i * 2) / 32768;
  return a;
}

async function speechSeconds(samples) {
  let state = new ort.Tensor("float32", new Float32Array(2 * 128), [2, 1, 128]);
  const sr = new ort.Tensor("int64", BigInt64Array.from([BigInt(RATE)]), []);
  const frame = new Float32Array(WINDOW);
  let voiced = 0;
  for (let i = 0; i + HOP <= samples.length; i += HOP) {
    frame.set(samples.subarray(i, i + HOP), CONTEXT);
    const out = await session.run({ input: new ort.Tensor("float32", frame.slice(), [1, WINDOW]), state, sr });
    state = out.stateN;
    if (out.output.data[0] >= SPEECH_P) voiced += 1;
    frame.copyWithin(0, WINDOW - CONTEXT);
  }
  return voiced * (HOP / RATE);
}

const HOME = process.env.HOME;
const DOC = `${HOME}/Downloads/《盖茨堡之役》美国内战最血腥的战役，人海冲锋57000人战死.mp4`;
const FIX = "../../crates/note-diarize/tests/fixtures";

// `speech` is the ground truth. `kind` says honestly where the audio came from.
const CLIPS = [
  // --- must NOT be flagged: real people, really speaking ---
  { path: "e2e/fixtures/bilingual.wav", speech: true, kind: "real", why: "two people, English then Chinese" },
  { path: `${FIX}/one-speaker.wav`, speech: true, kind: "real", why: "one person" },
  { path: `${FIX}/two-speakers.wav`, speech: true, kind: "real", why: "two people" },
  { path: `${FIX}/three-speakers.wav`, speech: true, kind: "real", why: "three people" },
  { path: `${HOME}/Downloads/en.mp4`, speech: true, kind: "real", why: "English narration" },
  { path: `${HOME}/Downloads/zh.mp4`, speech: true, kind: "real", why: "Chinese narration" },
  { path: `${HOME}/Downloads/ja.mp4`, speech: true, kind: "real", why: "Japanese narration" },
  { path: DOC, opts: { from: 60, seconds: 180 }, speech: true, kind: "real",
    why: "Chinese documentary, 3 min: a voice over a music bed -- the hard case" },
  // --- must be flagged: nobody speaking ---
  { gen: "silence", speech: false, kind: "generated",
    why: "60 s of digital silence -- what a muted call actually records" },
  { gen: "roomtone", speech: false, kind: "generated",
    why: "60 s of quiet broadband noise at -45 dB -- an empty room, approximately" },
];

function generated(which) {
  const n = 60 * RATE, a = new Float32Array(n);
  if (which === "roomtone") { let s = 1; for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; a[i] = ((s / 2147483647) * 2 - 1) * 0.0056; } }
  return a;
}

let pass = 0, skipped = 0; const fails = [];
for (const c of CLIPS) {
  const name = c.gen ?? basename(c.path);
  if (!c.gen && !existsSync(c.path)) { skipped++; console.log(`  --    ${name.slice(0, 22).padEnd(22)} not present, skipped`); continue; }
  const samples = c.gen ? generated(c.gen) : decode(c.path, c.opts);
  const secs = await speechSeconds(samples);
  const total = samples.length / RATE;
  const heard = secs >= ENOUGH, ok = heard === c.speech;
  if (ok) pass++; else fails.push(`${name}: ${secs.toFixed(1)}s of speech, expected ${c.speech ? "speech" : "none"} -- ${c.why}`);
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name.slice(0, 22).padEnd(22)} ${secs.toFixed(1).padStart(6)}s of ${total.toFixed(0).padStart(3)}s  [${c.kind}] ${c.why}`);
}
console.log(`\n${pass} passed, ${fails.length} failed, ${skipped} skipped`);
console.log("\nNot covered here: a real recording of hold music. None was on this machine, and a generated\n" +
  "tone would pass without testing anything. opensubs measured the equivalent on a real clip --\n" +
  "music and a wok, nobody talking -- at 0.0 s of speech in 118 s.");
for (const f of fails) console.log(`  FAIL ${f}`);
process.exit(fails.length ? 1 : 0);
