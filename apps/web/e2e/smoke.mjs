// A smoke test that drives the real built bundle in a real browser.
//
// It exercises the whole free tier end to end -- decode, transcribe, diarize,
// summarise, export, store, search -- because that is the half of the product
// that has to work with no account, no network and no server, and the half
// where a regression is invisible until a user hits it.
//
// Two things it deliberately does *not* do:
//
// - **It does not download a Whisper model.** That is hundreds of megabytes on
//   every CI run to test somebody else's inference engine. Transcription is
//   stubbed at the one seam where the model output enters the app, and
//   everything downstream of that seam is exercised for real.
// - **It does not click the file picker or grant a microphone.** Both are
//   browser chrome that a page cannot drive. The `__test` hook (compiled out
//   of shipped builds) reaches the engine and the store directly instead.

import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 4183;
const BASE = `http://127.0.0.1:${PORT}/`;

// `--host 127.0.0.1` is load-bearing: vite preview otherwise binds to
// `localhost`, which on a machine with IPv6 resolves to ::1 only -- and then
// this script's fetch to 127.0.0.1 is refused by a server that is running
// perfectly well.
const server = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], {
  stdio: ["ignore", "pipe", "inherit"],
});
process.on("exit", () => server.kill());

await waitFor(BASE, 20_000);

const browser = await chromium.launch();
const page = await browser.newPage();

// Every request the page makes is recorded, per screen, because the central
// privacy claim is per screen and not global. The Account page legitimately
// asks the accounts server which sign-in methods exist; nothing else may
// contact anything. Asserting one blanket "no requests ever" would either be
// false or would force the account page to lie about itself.
let contacted = new Set();
page.on("request", (request) => {
  const url = new URL(request.url());
  if (url.origin !== new URL(BASE).origin) contacted.add(url.host);
});
const watchRequests = () => {
  contacted = new Set();
  return () => [...contacted];
};

const failures = [];
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  ok  ${name}`);
  else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

await page.goto(BASE, { waitUntil: "networkidle" });

check("the app boots", await page.locator("h1").first().isVisible());
check(
  "the landing page leads with the promise",
  (await page.locator("h1").first().textContent())?.includes("Nothing leaves"),
);

// --- the engine, through the same boundary the app uses ---------------------

const engineResult = await page.evaluate(async () => {
  const { engine } = window.__test;
  const chunks = [
    { start_ms: 0, end_ms: 4000, text: "Right, let's look at the burn rate." },
    { start_ms: 4000, end_ms: 9000, text: "The burn rate is up eleven percent on hosting." },
    { start_ms: 9000, end_ms: 14000, text: "We agreed to move hosting to the cheaper region." },
    { start_ms: 14000, end_ms: 19000, text: "I'll send the burn rate forecast by Friday." },
  ];
  const transcript = engine.fromChunks(chunks, "en", true);
  const summary = engine.summariseLocal(transcript);
  const srt = engine.render(transcript, "srt", { title: "Test" });
  const markdown = engine.render(transcript, "markdown", { title: "Test", summary });
  const quote = engine.quoteForSummary(engine.renderForRequest(transcript));

  const index = new engine.SearchIndex();
  index.add("n1", transcript);
  const hits = index.search("burn rate", 5);

  const redacted = engine.redact(
    engine.fromChunks([{ start_ms: 0, end_ms: 1000, text: "mail me at ana@example.com" }], "en", false),
    null,
  );

  return {
    lines: transcript.segments.length,
    keywords: summary.keywords,
    origin: summary.origin,
    actions: summary.action_items.length,
    decisions: summary.decisions.length,
    srtCues: (srt.match(/-->/g) ?? []).length,
    markdownHasSummary: markdown.includes("## Summary"),
    credits: quote.credits,
    topHit: hits[0]?.passage.text ?? "",
    redactedText: redacted.transcript.segments[0].text,
    formats: engine.formats().length,
  };
});

check("Whisper chunks become a transcript", engineResult.lines === 4, `got ${engineResult.lines}`);
check(
  "the free summary finds the topic",
  engineResult.keywords.some((k) => k.includes("burn")),
  JSON.stringify(engineResult.keywords),
);
check("the free summary is labelled as extracted", engineResult.origin === "extracted");
check("it finds the action item", engineResult.actions >= 1);
check("it finds the decision", engineResult.decisions >= 1);
check("SRT keeps one cue per line", engineResult.srtCues === 4, `got ${engineResult.srtCues}`);
check("Markdown carries the summary", engineResult.markdownHasSummary);
check("every export format is reachable", engineResult.formats === 8);
check("search finds the right line", engineResult.topHit.includes("burn rate"));
check("redaction removes an email address", !engineResult.redactedText.includes("@"));
check("a paid summary is priced above zero", engineResult.credits >= 1);

// --- which language, and when ------------------------------------------------

// transformers.js does not implement Whisper's language detection: asked for
// none it takes English, silently, so "detect it" meant every recording was
// decoded as English and anything else came back as romanised syllables or as
// invented English sentences. The app now reads the language itself, per
// four-second cell. These are the pure parts of that path.
const languageResult = await page.evaluate(() => {
  const {
    smoothLabels,
    runsFromLabels,
    quietestNear,
    whisperWindows,
    readable,
    whisperCode,
    languageName,
  } = window.__test.transcribe;

  // A silence at 2 s in otherwise steady speech, at 16 kHz.
  const audio = new Float32Array(16000 * 4);
  for (let i = 0; i < audio.length; i += 1) audio[i] = Math.sin(i / 8) * 0.5;
  for (let i = 16000 * 2; i < 16000 * 2 + 3200; i += 1) audio[i] = 0;

  return {
    // One cell disagreeing with both neighbours is noise; two in a row is a
    // real stretch and must survive -- that rule, set too strongly, is what
    // erased an eight-second return to the other language.
    smoothedOne: smoothLabels(["en", "en", "zh", "en", "en"]).join(","),
    smoothedTwo: smoothLabels(["en", "en", "zh", "zh", "en", "en"]).join(","),
    runs: runsFromLabels(["en", "en", "zh", "zh"], 100, 400)
      .map((run) => `${run.language}:${run.from}-${run.to}`)
      .join(" "),
    // The cut goes in the silence, not in the middle of a word.
    cutNearSilence: quietestNear(audio, 16000 * 2 + 6000, 16000),
    // …and stays where it was told when there is no real pause nearby.
    cutWithoutSilence: quietestNear(audio, 16000 * 3.5, 1600),
    // A multi-byte character split by the decoder arrives as U+FFFD, which is
    // most of what a mixed-language recording produces at every seam.
    cleaned: readable("你好\uFFFD  世界 \uFFFD"),
    code: whisperCode("chinese"),
    named: languageName("zh"),
    windows: whisperWindows(16000 * 30, 30, 5),
  };
});

check(
  "one odd cell is smoothed away",
  languageResult.smoothedOne === "en,en,en,en,en",
  languageResult.smoothedOne,
);
check(
  "two cells of another language survive",
  languageResult.smoothedTwo === "en,en,zh,zh,en,en",
  languageResult.smoothedTwo,
);
check(
  "cells merge into one run per language",
  languageResult.runs === "en:0-200 zh:200-400",
  languageResult.runs,
);
check(
  "the cut lands in the pause",
  Math.abs(languageResult.cutNearSilence - 16000 * 2) < 16000 * 0.35,
  `at ${languageResult.cutNearSilence}, silence at ${16000 * 2}`,
);
check(
  "and stays put when there is no pause to find",
  Math.abs(languageResult.cutWithoutSilence - 16000 * 3.5) < 1,
  String(languageResult.cutWithoutSilence),
);
check("decoder debris never reaches the transcript", languageResult.cleaned === "你好 世界", languageResult.cleaned);
check("a language name becomes the code Whisper knows", languageResult.code === "zh");
check("and the code is shown back in the reader's script", languageResult.named === "中文");
check("window counting matches the pipeline's own loop", languageResult.windows === 1, String(languageResult.windows));

// --- the store, and retention ----------------------------------------------

const storeResult = await page.evaluate(async () => {
  const { app } = window.__test;
  const { engine } = window.__test;
  const transcript = engine.fromChunks(
    [{ start_ms: 0, end_ms: 2000, text: "a stored line about hosting" }],
    "en",
    true,
  );
  const note = {
    id: "smoke-1",
    title: "Smoke test",
    created: Date.now(),
    updated: Date.now(),
    transcript,
    summary: engine.summariseLocal(transcript),
    aiSummary: null,
    consent: null,
    audio: null,
    audioType: null,
    durationMs: 2000,
    language: "en",
  };
  await app.save(note);
  const back = await app.store.get("smoke-1");
  await app.remove("smoke-1");
  const gone = await app.store.get("smoke-1");
  return { saved: back?.title ?? null, gone: gone === null };
});

check("a note round-trips through storage", storeResult.saved === "Smoke test");
check("a note can be deleted", storeResult.gone);

// --- navigation -------------------------------------------------------------

for (const [route, expect, mayContact] of [
  ["#/library", "Library", []],
  ["#/ask", "Ask across your meetings", []],
  ["#/privacy", "What leaves this device", []],
  ["#/record", "Before you record", []],
  // The only screen allowed to reach the network, and only for this.
  ["#/account", "Account", ["auth.opennotetaker.app"]],
]) {
  const seen = watchRequests();
  await page.goto(BASE + route);
  await page.waitForTimeout(400);
  const heading = await page.locator("h1").first().textContent();
  check(`${route} renders`, heading?.trim() === expect, `got ${JSON.stringify(heading)}`);

  const unexpected = seen().filter((host) => !mayContact.includes(host));
  check(
    `${route} contacts nothing it should not`,
    unexpected.length === 0,
    unexpected.join(", "),
  );
}

// The filters that stop a language nobody spoke reaching the transcript.
//
// A 28-minute Chinese meeting came back with a wall of invented Thai in it.
// The cause is that language detection is an argmax over ninety-nine
// candidates with no "none of these" among them, so every pause votes.
{
  const langGuards = await page.evaluate(() => {
    const { transcribe } = window.__test;
    const out = {};

    // A pause between two Chinese stretches must not vote for itself.
    const loud = 1, quiet = 0.0000001;
    out.silenceInherits = transcribe
      .silenceInherits(["zh", "th", "zh"], [loud, quiet, loud])
      .join(",");
    // …and a quiet cell at the very start takes the first loud answer.
    out.leading = transcribe.silenceInherits(["ja", "zh", "zh"], [quiet, loud, loud]).join(",");
    // Silence throughout has no neighbour to inherit from; leave it be.
    out.allQuiet = transcribe
      .silenceInherits(["th", "th"], [0, 0])
      .join(",");

    // Eight seconds of Thai in a 28-minute Chinese meeting: 0.5% of it.
    const S = 16000;
    const meeting = 1680 * S;
    out.absorbed = transcribe
      .absorbStrayLanguages(
        [
          { from: 0, to: 800 * S, language: "zh" },
          { from: 800 * S, to: 808 * S, language: "th" },
          { from: 808 * S, to: meeting, language: "zh" },
        ],
        meeting,
      )
      .map((r) => r.language)
      .join(",");
    // The bilingual fixture: 4.4s of English in a 29-second file is 15%, and
    // is the half that a length threshold wrongly swallowed.
    out.kept = transcribe
      .absorbStrayLanguages(
        [
          { from: 0, to: 4.4 * S, language: "en" },
          { from: 4.4 * S, to: 29 * S, language: "zh" },
        ],
        29 * S,
      )
      .map((r) => r.language)
      .join(",");
    // A brief but real switch inside a long meeting survives on the absolute
    // floor even though its share is small: 30s of 1680 is 1.8%.
    out.briefButReal = transcribe
      .absorbStrayLanguages(
        [
          { from: 0, to: 800 * S, language: "zh" },
          { from: 800 * S, to: 830 * S, language: "en" },
          { from: 830 * S, to: meeting, language: "zh" },
        ],
        meeting,
      )
      .map((r) => r.language)
      .join(",");

    // Thirty seconds holding four words is a smear, not a slow speaker.
    out.invented = transcribe.looksInvented("OK ที่นี่ ที่นี่", 30);
    out.realSpeech = transcribe.looksInvented(
      "Hosting is up about eleven percent, and most of that is staging.",
      6,
    );

    return out;
  });

  check("a pause between two Chinese stretches does not vote for Thai",
    langGuards.silenceInherits === "zh,zh,zh", langGuards.silenceInherits);
  check("a quiet opening cell takes the first language actually spoken",
    langGuards.leading === "zh,zh,zh", langGuards.leading);
  check("silence throughout is left alone rather than given a language",
    langGuards.allQuiet === "th,th", langGuards.allQuiet);
  check("eight seconds of Thai in a 28-minute meeting is absorbed",
    langGuards.absorbed === "zh", langGuards.absorbed);
  check("…while 4.4s of English in a 29s file — 15% of it — survives",
    langGuards.kept === "en,zh", langGuards.kept);
  check("…and so does a brief but real switch, on the absolute floor",
    langGuards.briefButReal === "zh,en,zh", langGuards.briefButReal);
  check("a long span holding four words is refused as invented", langGuards.invented === true);
  check("…and ordinary speech is not", langGuards.realSpeech === false);
}

// One script, whichever was asked for. Whisper's single <|zh|> writes either.
{
  const script = await page.evaluate(async () => {
    const { script } = window.__test;
    return {
      converted: await script.toSimplified("我們下個星期開會討論預算的問題"),
      alreadySimplified: await script.toSimplified("我们下个星期开会"),
      japaneseLeftAlone: await script.toSimplified("時間がある"),
      latinUntouched: await script.toSimplified("Hosting is up 11%"),
      traditionalWanted: script.wantsTraditional("zh-Hant"),
      simplifiedNotWanted: script.wantsTraditional("zh-Hans"),
    };
  });
  check("Traditional output is normalised to Simplified",
    script.converted === "我们下个星期开会讨论预算的问题", script.converted);
  check("…and Simplified is already itself",
    script.alreadySimplified === "我们下个星期开会", script.alreadySimplified);
  // Kana proves the text is not Chinese: 時 in Japanese must not become 时.
  check("Japanese is left alone, kana being the proof it is not Chinese",
    script.japaneseLeftAlone === "時間がある", script.japaneseLeftAlone);
  check("Latin text is untouched", script.latinUntouched === "Hosting is up 11%");
  check("asking for Traditional is honoured", script.traditionalWanted === true);
  check("…and asking for Simplified is not mistaken for it", script.simplifiedNotWanted === false);
}

// Speaker separation, on the same recorded speech the Rust tests use, through
// the wasm the app actually calls. One person talking for sixteen seconds came
// back as four speakers before the divergence replaced the cosine, and that is
// the kind of failure a user reports as "it thinks I am five people".
{
  const wav = readFileSync(
    new URL("../../../crates/note-diarize/tests/fixtures/one-speaker.wav", import.meta.url),
  ).toString("base64");
  const diarized = await page.evaluate(async (base64) => {
    const { engine, decode } = window.__test;
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const pcm = await decode.decodeToPcm(new File([bytes], "one.wav", { type: "audio/wav" }));

    // Lines the length a transcriber produces, so the clusterer sees a
    // sequence of one person's turns rather than one long block.
    const seconds = pcm.length / 16000;
    const segments = [];
    for (let at = 0; at + 2 <= seconds; at += 3) {
      segments.push({
        start_ms: Math.round(at * 1000),
        end_ms: Math.round(Math.min(at + 3, seconds) * 1000),
        text: `line ${segments.length}`,
        speaker: null,
      });
    }
    const { report } = engine.diarize(
      { source: "recorded", segments, speakers: [] },
      pcm,
      engine.diarizeDefaultOptions(),
    );
    return { speakers: report.speakers, lines: segments.length };
  }, wav);
  check("one person talking is one speaker", diarized.speakers === 1, `got ${diarized.speakers}`);
  check("…over a transcript of several lines", diarized.lines >= 5, `${diarized.lines} lines`);
}

// Nothing a reader can see may name the shared platform. Grepping the source
// is not the test: the string that has bitten other apps in this suite lives
// inside the vendored element bundle, in a shadow root, in a default nobody
// set. So read what is actually painted, shadow DOM included.
await page.goto(BASE + "#/account");
await page.waitForTimeout(600);
const masking = await page.evaluate(() => {
  const roots = [document.body];
  for (const element of document.querySelectorAll("*")) {
    if (element.shadowRoot) roots.push(element.shadowRoot);
  }
  const visible = roots.map((root) => root.textContent ?? "").join(" ");
  const panel = document.querySelector("openapps-login");
  const mark = panel?.shadowRoot?.querySelector(".mark");
  const width = (text) => {
    const probe = document.createElement("span");
    probe.textContent = text;
    probe.style.cssText = "position:absolute;visibility:hidden;font-size:100px";
    probe.style.fontFamily = mark ? getComputedStyle(mark).fontFamily : "inherit";
    document.body.append(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    return w;
  };
  return {
    platform: (visible.match(/OpenApps/g) ?? []).length,
    heading: panel?.shadowRoot?.querySelector(".title")?.textContent?.trim() ?? "",
    markGlyph: mark?.textContent?.trim() ?? "",
    markWidth: mark ? width(mark.textContent ?? "") : 0,
    tofuWidth: width("\uFFFF"),
  };
});
check(
  "no visible text names the shared platform, shadow DOM included",
  masking.platform === 0,
  `${masking.platform} occurrence(s)`,
);
check(
  "the sign-in panel is headed with this product's name",
  masking.heading === "Sign in to OpenNoteTaker",
  JSON.stringify(masking.heading),
);
check(
  "the panel's mark is the glyph the app icon is drawn from",
  masking.markGlyph === "\u2980",
  JSON.stringify(masking.markGlyph),
);
// A mark that fell back to tofu is worse than the letter it replaced.
check(
  "and that glyph actually renders in the app's font",
  masking.markWidth > 0 && Math.abs(masking.markWidth - masking.tofuWidth) > 0.5,
  `${masking.markWidth} vs tofu ${masking.tofuWidth}`,
);

// The consent gate is the product's opening argument; it must be on the screen
// before a recording can start, not behind a disclosure.
await page.goto(BASE + "#/record");
await page.waitForTimeout(150);
check(
  "recording is gated on consent",
  await page.getByText("Before you record").first().isVisible(),
);
check(
  "the consent screen offers words to say",
  (await page.locator("blockquote").first().textContent())?.includes("recording this"),
);

// Microphone-only on a video call is the one combination that silently
// produces a useless recording: the browser's echo canceller treats the far
// side, arriving through the speakers, as echo and removes it. Both sources
// are therefore ticked to begin with, and unticking the tab has to say so.
{
  const tabSource = page.locator("label.check", { hasText: "A tab or window" }).locator("input");
  const micSource = page.locator("label.check", { hasText: "Your microphone" }).locator("input");
  check("both sources are on to begin with", (await tabSource.isChecked()) && (await micSource.isChecked()));

  await tabSource.uncheck();
  await page.waitForTimeout(150);
  const warned = (await page.locator("main .note").allInnerTexts()).join(" ");
  check(
    "microphone-only on a call is warned about",
    warned.includes("cancelled out"),
    warned,
  );

  await tabSource.check();
  await page.waitForTimeout(150);
  check(
    "the warning goes away when the tab is recorded too",
    (await page.locator("main .note").count()) === 0,
  );

  // The input chooser is how a desktop-app meeting gets recorded, through a
  // loopback device. It must not ask for the microphone merely by existing.
  check(
    "an input chooser is offered without asking for permission first",
    (await page.getByRole("button", { name: "Choose which input" }).count()) === 1,
  );
  await micSource.uncheck();
  await page.waitForTimeout(150);
  check(
    "the input chooser goes away with the microphone",
    (await page.getByRole("button", { name: "Choose which input" }).count()) === 0,
  );
  await micSource.check();
}

// --- recording, with a fake microphone ---------------------------------------

// The one part of the product that needs a granted microphone, driven in a
// second browser started with Chrome's fake capture device. Not the default
// for this file -- the rest of the suite deliberately runs without any media
// permission, which is how it proves the app asks for nothing on load -- but
// changing the input *while recording* cannot be checked any other way, and it
// is the control most likely to be reached for mid-meeting.
{
  const recording = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  const mic = await recording.newPage();
  await mic.goto(BASE + "#/record", { waitUntil: "networkidle" });
  await mic.waitForSelector("h1");

  // Tab audio cannot be granted to a driven browser -- the share picker is
  // browser chrome -- so this records the microphone alone, which is exactly
  // the case the input picker exists for.
  await mic.locator("label.check", { hasText: "A tab or window" }).locator("input").uncheck();
  await mic.getByRole("button", { name: "Start recording" }).click();

  await mic.waitForSelector("h1:has-text('Recording')", { timeout: 15_000 });
  check("a recording starts and the clock appears", await mic.locator("#elapsed").isVisible());
  check(
    "the input control is on the recorder, not only the consent screen",
    (await mic.getByRole("heading", { name: "Which input" }).count()) === 1,
  );

  // The fake device gives the browser a named input, so the list is available
  // without a prompt and the select is drawn rather than the reveal button.
  // Scoped to the picker: the shell has a language switcher, and an unscoped
  // `select` in this application is that one.
  await mic.waitForSelector(".inputs select", { timeout: 10_000 });
  const inputs = await mic.locator(".inputs select option").allInnerTexts();
  check("the inputs are listed while recording", inputs.length >= 2, inputs.join(" | "));

  const elapsedBefore = await mic.locator("#elapsed").textContent();
  await mic.locator(".inputs select").selectOption({ index: inputs.length - 1 });
  await mic.waitForSelector("#recorder-notice:has-text('Now recording from')", { timeout: 10_000 });
  check("switching input while recording is confirmed", true);
  check(
    "the recording is still running afterwards",
    (await mic.locator("h1").first().textContent())?.includes("Recording"),
    `clock was ${elapsedBefore}`,
  );

  // Discarded rather than finished: finishing would start a transcription,
  // which means downloading a Whisper model.
  mic.on("dialog", (dialog) => dialog.accept());
  await mic.getByRole("button", { name: "Discard the recording" }).click();
  await mic.waitForTimeout(500);
  check(
    "discarding returns to the start",
    !(await mic.locator("h1").first().textContent())?.includes("Recording"),
  );

  await recording.close();
}

// --- languages ---------------------------------------------------------------

// The interface has to actually switch, and the switch has to survive a reload
// — a language chosen once and forgotten on the next visit is worse than none.
{
  await page.goto(BASE);
  await page.waitForTimeout(300);
  await page.selectOption("select.lang", "zh-Hans");
  await page.waitForTimeout(300);
  const heading = (await page.locator("h1").first().textContent()) ?? "";
  check("the interface switches to Simplified Chinese", heading.includes("没有机器人"), heading);
  check(
    "the document language attribute follows",
    (await page.getAttribute("html", "lang")) === "zh-Hans",
  );

  await page.reload();
  await page.waitForTimeout(400);
  const after = (await page.locator("h1").first().textContent()) ?? "";
  check("the choice survives a reload", after.includes("没有机器人"), after);

  await page.selectOption("select.lang", "zh-Hant");
  await page.waitForTimeout(300);
  const hant = (await page.locator("h1").first().textContent()) ?? "";
  check("Traditional is a different translation, not a converted one", hant.includes("沒有機器人"), hant);

  // The consent screen is the one place the words have to be right, so it is
  // checked in the translated locale rather than only in English.
  await page.goto(BASE + "#/record");
  await page.waitForTimeout(300);
  const consent = (await page.locator("blockquote").first().textContent()) ?? "";
  check("the consent script is translated too", consent.includes("錄下來"), consent);

  await page.goto(BASE);
  await page.waitForTimeout(300);
  await page.selectOption("select.lang", "en");
  await page.waitForTimeout(300);
}

// The engine's own language coverage, which the summary panel names on screen.
{
  const languages = await page.evaluate(() => window.__test.engine.cueLanguages());
  check("the free summariser reports its languages", languages.includes("简体中文"), String(languages));
  check("…including Traditional Chinese", languages.includes("繁體中文"));
  check("…and Japanese", languages.includes("日本語"));
}

// A Chinese transcript must find its actions, and export under Chinese headings.
{
  const result = await page.evaluate(async () => {
    const { engine } = window.__test;
    const chunks = [
      { start_ms: 0, end_ms: 4000, text: "我们先看一下预算情况。" },
      { start_ms: 4000, end_ms: 9000, text: "我们决定把预算控制在原来的水平。" },
      { start_ms: 9000, end_ms: 14000, text: "我会在下周之前把报告发给你。" },
      { start_ms: 14000, end_ms: 18000, text: "谁负责这次的迁移？" },
    ];
    const transcript = engine.fromChunks(chunks, "chinese", true);
    const summary = engine.summariseLocal(transcript);
    const markdown = engine.render(transcript, "markdown", {
      title: "预算评审",
      summary,
      labels: {
        summary: "摘要",
        key_points: "要点",
        decisions: "决定",
        action_items: "行动项",
        questions_asked: "提出的问题",
        questions_open: "尚未解决的问题",
        topics: "主题",
        who_spoke: "发言情况",
        transcript: "文字记录",
        consent: "录音同意记录",
        unknown_speaker: "未知",
        due: "截止",
        stats: "{sentences} 句 · 约 {minutes} 分钟 · {speakers} 位发言者",
      },
    });
    return {
      decisions: summary.decisions,
      actions: summary.action_items,
      questions: summary.questions,
      keywords: summary.keywords,
      markdown,
    };
  });
  check("a Chinese meeting finds its decision", result.decisions.some((d) => d.includes("我们决定")), JSON.stringify(result.decisions));
  check("…its action item", result.actions.length >= 1, JSON.stringify(result.actions));
  check("…its deadline", result.actions.some((a) => a.due), JSON.stringify(result.actions));
  check("…and its question", result.questions.length >= 1, JSON.stringify(result.questions));
  check("Chinese topics are extracted", result.keywords.some((k) => k.includes("预")), JSON.stringify(result.keywords));
  check("the export uses Chinese headings", result.markdown.includes("## 文字记录"));
  check("no English heading leaks into it", !result.markdown.includes("## Transcript"));
}

// --- the privacy claim ------------------------------------------------------

// The whole free tier, driven for real above, with the network watched.
{
  const seen = watchRequests();
  await page.goto(BASE);
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    const { engine } = window.__test;
    const transcript = engine.fromChunks(
      [{ start_ms: 0, end_ms: 2000, text: "a line about the migration" }],
      "en",
      true,
    );
    engine.summariseLocal(transcript);
    engine.render(transcript, "srt", { title: "x" });
    const index = new engine.SearchIndex();
    index.add("n", transcript);
    index.search("migration", 3);
  });
  check("the free tier makes no requests at all", seen().length === 0, seen().join(", "));
}

await browser.close();
server.kill();

if (failures.length) {
  console.error(`\n${failures.length} failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("\nall good");

async function waitFor(url, timeoutMs) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    if (Date.now() > until) throw new Error(`${url} did not come up`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
