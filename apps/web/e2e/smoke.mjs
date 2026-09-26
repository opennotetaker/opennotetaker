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
// `SITE_ROOT` serves the composed site — the product page from the private
// site repo with this app inside it — rather than the app's own `dist/`.
// After the website moved out, `dist/` is a bare shell with none of the copy
// a third of these checks assert on, and the masking check in particular
// reads what is *painted*: pointed at the shell it would pass by having
// nothing to paint. `deploy.sh` in the site repo sets it.
const previewArgs = ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"];
if (process.env.SITE_ROOT) previewArgs.push("--outDir", process.env.SITE_ROOT);
const server = spawn("npx", previewArgs, {
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


/// Choose a language through the topbar control.
///
/// It was a `<select>` and is now an icon button opening a menu of endonyms,
/// matching openpdfedit's and opencapture's. The tests drive it the way a
/// person does rather than reaching for the underlying value.
async function chooseLanguage(page, code) {
  // Open it only if it is shut. The button toggles, so a caller that has
  // already opened the menu — to read what is in it, say — would otherwise
  // close it here and then wait for an item that is no longer on screen.
  const button = page.locator(".lang__button");
  if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
  await page.locator(`.lang__item[lang="${code}"]`).click();
  // On the published site each language is its own page, so this is a
  // navigation, not a re-render (APP-150). Wait for the language to be in
  // force either way rather than for a fixed slice of time.
  await page.waitForFunction(
    (want) => document.documentElement.lang === want && !!window.__test,
    code,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(150);
}

/// The same screen, on whichever language's page the browser is on.
///
/// Each language is its own page now (APP-150), so `BASE + "#/record"` is the
/// English one by definition: after choosing a language, ask for the screen
/// relative to where that left us.
const here = (page, hash) => page.url().split("#")[0] + hash;

const failures = [];
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  ok  ${name}`);
  else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

await page.goto(BASE, { waitUntil: "networkidle" });

// On the first route the landing copy is what is on screen and the app is
// mounted behind it, so "did it boot" is about the app having rendered, not
// about which heading happens to be visible.
//
// `:is(h1, h2.h1)` rather than `h1`: the home view's title is an `h2` now,
// because a document with the landing hero *and* an app view on it had two
// `h1`s and therefore no outline. Every other view is still the only heading
// on screen when it is up, so it kept `h1`. The locator is "the view's
// title", which is what every assertion below actually means.
check(
  "the app boots",
  (await page.locator("main :is(h1, h2.h1)").first().textContent())?.trim().length > 0,
);
check("…with the landing copy in front of it", await page.locator(".site-chrome .hero h1").isVisible());
check(
  "the landing page leads with the promise",
  (await page.locator("main :is(h1, h2.h1)").first().textContent())?.includes("Nothing leaves"),
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
// APP-185: the wash sets --bg-page on .site-chrome, and the dark-mode guard
// beside it read that same overridden value back, so it fired and changed
// nothing: white type on lavender, about 1.1:1, and the headline was gone for
// anyone whose system is dark. Nobody on a light desktop can see that, so it
// is measured here rather than looked at.
{
  const dark = await browser.newContext({ colorScheme: "dark" });
  const darkPage = await dark.newPage();
  for (const path of ["", "privacy.html"]) {
    await darkPage.goto(BASE + path);
    await darkPage.waitForTimeout(400);
    const seen = await darkPage.evaluate(() => {
      const heading = document.querySelector(".site-chrome h1, .site-chrome h2, main h1, h1");
      if (!heading) return null;
      const luminance = (colour) => {
        const [r, g, b] = colour.match(/[\d.]+/g).slice(0, 3).map(Number);
        const channel = (c) => {
          const v = c / 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      let ground = "rgb(255, 255, 255)";
      for (let el = heading; el && el !== document.documentElement; el = el.parentElement) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)") { ground = bg; break; }
      }
      const ink = getComputedStyle(heading).color;
      const [a, b] = [luminance(ink), luminance(ground)].sort((x, y) => y - x);
      return { ink, ground, ratio: Math.round(((a + 0.05) / (b + 0.05)) * 10) / 10 };
    });
    check(
      `the heading is readable in dark mode${path ? ` on /${path}` : ""}`,
      seen !== null && seen.ratio >= 4.5,
      JSON.stringify(seen),
    );
  }
  await dark.close();
}

// APP-176: the footer's language row shares a class with the block of footer
// columns above it, which is a five-column grid. As a lone grid item the nav
// was pushed into the first column and its eight links fell onto three rows on
// an ordinary desktop. One row is the whole point of a row of languages.
{
  await page.goto(BASE);
  await page.waitForTimeout(400);
  const rows = await page.evaluate(() => {
    const links = [...document.querySelectorAll(".site-chrome .lang-row a")];
    return {
      links: links.length,
      rows: new Set(links.map((a) => Math.round(a.getBoundingClientRect().top))).size,
    };
  });
  check("the eight languages sit on one row in the footer", rows.links === 8 && rows.rows === 1, JSON.stringify(rows));
}

// APP-150: the site publishes a page per language and the app runs inside it,
// so one document has two translation systems in it. They disagreed: the app
// chose from the browser or localStorage and re-rendered its half, which put
// an English top bar and an English hero inside a Chinese page — and set
// <html lang> to whichever the app had picked. The page decides now.
{
  const alternates = await page.evaluate(
    () => !!document.querySelector("link[rel=alternate][hreflang]"),
  );
  if (!alternates) {
    console.log("  --  language-per-page checks skipped: no alternates (bare app)");
  } else {
    const chinese = await page.goto(BASE + "zh-Hans.html").catch(() => null);
    if (!chinese || chinese.status() !== 200) {
      console.log("  --  the Chinese page is not in this build; skipped");
    } else {
      await page.waitForTimeout(600);
      const zh = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        nav: document.querySelector("#nav")?.innerText.replace(/\s+/g, " ").trim() ?? "",
        english: ["Nobody joins your call", "What it does", "How it works"].filter((s) =>
          document.body.innerText.includes(s),
        ),
        stored: (() => {
          try {
            return localStorage.getItem("opennotetaker.locale");
          } catch {
            return null;
          }
        })(),
      }));
      check("the Chinese page says it is Chinese", zh.lang === "zh-Hans", zh.lang);
      check("…its top bar is Chinese too", /功能|录制会议/.test(zh.nav) && !/Features|Record a meeting/.test(zh.nav), zh.nav.slice(0, 80));
      check("…and no English copy is left on it", zh.english.length === 0, zh.english.join(" | "));
      check("…the app took the page's language", zh.stored === "zh-Hans", String(zh.stored));
    }

    // The reporter's own case, the other way round: a Chinese browser on the
    // English page. Half-translating it is the bug, not the fix.
    const zhBrowser = await browser.newContext({ locale: "zh-CN" });
    const zhPage = await zhBrowser.newPage();
    await zhPage.goto(BASE);
    await zhPage.waitForTimeout(600);
    const en = await zhPage.evaluate(() => ({
      lang: document.documentElement.lang,
      nav: document.querySelector("#nav")?.innerText.replace(/\s+/g, " ").trim() ?? "",
    }));
    check("a Chinese browser does not half-translate the English page", en.lang === "en" && !/录制|功能|记录库/.test(en.nav), `${en.lang} — ${en.nav.slice(0, 60)}`);
    await zhBrowser.close();
    await page.goto(BASE);
    await page.waitForTimeout(400);
  }
}

check("window counting matches the pipeline's own loop", languageResult.windows === 1, String(languageResult.windows));

// APP-126: the download bar ran 100% -> 58% -> 41% -> 100%, because each file
// that started grew the total. The events below are the order transformers.js
// sends them in for whisper-base.
const progressResult = await page.evaluate(() => {
  const { DownloadProgress, clock } = window.__test.transcribe;
  const bar = new DownloadProgress();
  const shown = [
    bar.update("config.json", 2_000, 2_000),
    bar.update("onnx/encoder_model.onnx", 40e6, 82e6),
    bar.update("onnx/decoder_model_merged.onnx", 1e6, 208e6),
    bar.update("onnx/encoder_model.onnx", 82e6, 82e6),
    bar.update("onnx/decoder_model_merged.onnx", 208e6, 208e6),
  ];
  return { shown, clocks: [clock(40 * 16000), clock(82.7 * 16000), clock(3725 * 16000)] };
});
const seen = progressResult.shown.filter((x) => x !== null);
check("the download bar ignores the config file", progressResult.shown[0] === null, JSON.stringify(progressResult.shown));
check("…never runs backwards", seen.every((x, i) => i === 0 || x >= seen[i - 1]), JSON.stringify(seen));
check("…and ends at 100%", seen[seen.length - 1] === 1, JSON.stringify(seen));
check("positions read as a clock", progressResult.clocks.join(" ") === "0:40 1:22 1:02:05", progressResult.clocks.join(" "));

// APP-125: language detection read every 4 s cell, one encoder pass each, and
// on an Intel laptop that was 65% of the run. It now reads every other cell and
// the one between only where its neighbours disagree. The runs must come out
// the same as reading them all, for meeting-shaped sequences.
const cellsResult = await page.evaluate(async () => {
  const { readCells, smoothLabels } = window.__test.transcribe;
  const expand = (spec) => spec.flatMap(([language, n]) => Array(n).fill(language));
  const cases = {
    oneLanguage: expand([["en", 40]]),
    eightSecondInsert: expand([["en", 9], ["zh", 2], ["en", 9]]),
    insertOnOddCell: expand([["en", 8], ["zh", 2], ["en", 10]]),
    oneNoisyCell: expand([["en", 7], ["zh", 1], ["en", 7]]),
    halfAndHalf: expand([["zh", 13], ["en", 14]]),
    codeSwitching: expand([["en", 3], ["zh", 2], ["en", 4], ["zh", 3], ["en", 2]]),
  };
  const out = {};
  for (const [name, truth] of Object.entries(cases)) {
    const { labels, read } = await readCells(truth.length, () => true, async (i) => truth[i], "en");
    out[name] = {
      same: smoothLabels(labels).join() === smoothLabels(truth).join(),
      read,
      of: truth.length,
    };
  }
  // A quiet cell is never read.
  const quiet = await readCells(6, (i) => i !== 3, async () => "en", "en");
  // 0, 2 and 4 are read, 1 is inferred from them, 3 is quiet, 5 has no right
  // neighbour and is read.
  out.quietSkipped = quiet.read === 4;
  return out;
});
for (const [name, r] of Object.entries(cellsResult)) {
  if (name === "quietSkipped") continue;
  check(`language cells, ${name}: same runs as reading every cell`, r.same, JSON.stringify(r));
}
check("…a quiet cell is never read", cellsResult.quietSkipped);
check("…one language costs half the passes", cellsResult.oneLanguage.read <= 21, JSON.stringify(cellsResult.oneLanguage));

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
  const heading = await page.locator("main :is(h1, h2.h1)").first().textContent();
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

// Whisper loops, and no_repeat_ngram_size only constrains one generation.
// Measured on a real 28-minute meeting: 然后 然后 twelve times in one line.
{
  const loops = await page.evaluate(() => {
    const { collapseLoops, splitLongChunks } = window.__test.transcribe;
    const looped =
      "然后这个它算是然后这个然后这个然后这个 然后这个然后然后这个 然后这个然后然后 " +
      "然后 然后然后 然后然后 然后然后 然后然后 然后然后 然后然后 然后然后";
    // A 40-second wall of continuous Chinese with no sentence ending in it.
    const wall = {
      start_ms: 0,
      end_ms: 40_000,
      text:
        "然后可以看一下我们目前的情况，那个自然搜索被展示的有二百六十七次，" +
        "然后最终点击的有十五次，因为我们还有一些外链等等，" +
        "然后最终到官网访问的有九十四次，其中有三十九个到了商店。",
    };
    return {
      collapsed: collapseLoops(looped),
      before: looped.length,
      untouchedEnglish: collapseLoops("It is very very very good"),
      untouchedShortRepeat: collapseLoops("好 好 好"),
      pieces: splitLongChunks([wall]).length,
      spans: splitLongChunks([wall]).map((c) => Math.round((c.end_ms - c.start_ms) / 1000)),
      rejoined: splitLongChunks([wall]).map((c) => c.text).join(""),
      original: wall.text,
      shortLeftAlone: splitLongChunks([{ start_ms: 0, end_ms: 6000, text: "Short enough already." }]).length,
    };
  });

  check("a twelve-times loop is collapsed", loops.collapsed.length < loops.before * 0.75,
    `${loops.before} -> ${loops.collapsed.length}`);
  check("…and what is left has no run of four", !/(.{1,12}?)\1{3,}/.test(loops.collapsed), loops.collapsed);
  // Real speech repeats. Three is a person; twelve is a model.
  check("ordinary emphasis survives", loops.untouchedEnglish === "It is very very very good");
  check("…and so does a three-times repeat", loops.untouchedShortRepeat === "好 好 好");

  check("a forty-second wall is divided", loops.pieces >= 4, `${loops.pieces} pieces`);
  check("…into pieces of a readable length", loops.spans.every((s) => s <= 14), loops.spans.join(","));
  // Dividing must move no words: it is a line break, not an edit.
  check("…losing not one character of it",
    loops.rejoined.replace(/\s/g, "") === loops.original.replace(/\s/g, ""),
    `${loops.rejoined.length} vs ${loops.original.length}`);
  check("a line already short enough is left alone", loops.shortLeftAlone === 1);
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

// The choice that decides whether a bad transcript can ever be fixed has to be
// on the screen where a recording starts, not only in a settings page nobody
// opened. A 28-minute meeting was transcribed badly and could not be re-run.
await page.goto(BASE + "#/record");
await page.waitForTimeout(200);
{
  const keep = page.getByRole("checkbox", { name: /Keep the recording/i });
  check("the record screen offers to keep the audio", (await keep.count()) === 1);
  check("…and it is off, as the default is", !(await keep.isChecked()));
  const warned = await page.getByText(/nothing left to run again/i).count();
  check("…and says plainly what that costs", warned === 1);

  await keep.check();
  await page.waitForTimeout(150);
  check("ticking it clears the warning",
    (await page.getByText(/nothing left to run again/i).count()) === 0);
  // It is a real setting, not a per-visit toggle: the privacy centre agrees.
  await page.goto(BASE + "#/privacy");
  await page.waitForTimeout(200);
  check(
    "…and the privacy centre now agrees",
    await page.getByRole("checkbox", { name: /Keep the audio/i }).isChecked(),
  );
  await page.getByRole("checkbox", { name: /Keep the audio/i }).uncheck();
}

// Starting a recording must need nothing installed.
//
// When the app moved to this origin the hero's primary button was deleted
// rather than repointed, leaving "Get the extension" as the only thing to
// press — an optional convenience reading as a prerequisite.
{
  await page.goto(BASE);
  await page.waitForTimeout(300);
  const hero = page.locator(".site-chrome .hero .actions");
  const labels = (await hero.locator("a").allInnerTexts()).map((t) => t.trim());
  check("the hero leads with recording, not with installing",
    labels[0] === "Record a meeting", labels.join(" | "));
  check("…and the extension is offered second", labels.some((l) => /extension/i.test(l)), labels.join(" | "));

  // Pressing it must reach the consent screen on this origin.
  await hero.getByRole("link", { name: "Record a meeting" }).click();
  await page.waitForTimeout(400);
  check("pressing it reaches the consent screen", new URL(page.url()).hash === "#/record", page.url());
  check("…on this origin, with no redirect anywhere",
    new URL(page.url()).host === new URL(BASE).host, page.url());
}

// A deep link is a fresh load with a hash already set, which is what every
// shared link and every extension handoff is. The marketing copy must not be
// drawn over the app on one.
{
  await page.goto(BASE + "#/record");
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => ({
    route: document.body.dataset.route,
    chromeVisible: (() => {
      const el = document.querySelector(".site-chrome");
      return el ? getComputedStyle(el).display !== "none" : false;
    })(),
    heading: document.querySelector("main :is(h1, h2.h1)")?.textContent?.trim() ?? "",
  }));
  check("a deep link sets the route on load", state.route === "record", JSON.stringify(state));
  check("…hides the landing copy", !state.chromeVisible);
  check("…and shows the app's own screen", state.heading === "Before you record", state.heading);

  // A bare anchor is not a route: it points into the marketing copy.
  await page.goto(BASE + "#extension");
  await page.waitForTimeout(300);
  check("a bare #anchor keeps the landing copy on screen",
    (await page.evaluate(() => document.body.dataset.route)) === "");
}

// Every offered language reaches the screen.
//
// A translation can exist in a file and never render — the picker can be
// missing an entry, a catalogue can be registered under the wrong code. This
// asserts on a string that differs in all eight, which the empty-library
// sentence does; "Biblioteca" would not separate Spanish from Portuguese.
{
  await page.goto(BASE + "#/library");
  await page.waitForTimeout(200);
  await page.locator(".lang__button").click();
  const offered = await page.locator(".lang__item").evaluateAll((items) =>
    items.map((i) => ({ code: i.getAttribute("lang"), label: i.textContent.trim() })));
  check("all eight languages are offered", offered.length === 8,
    offered.map((o) => o.code).join(","));
  // Endonyms: somebody looks for the word they call their own language.
  check("…each named in its own language",
    ["English", "简体中文", "繁體中文", "日本語", "한국어", "Deutsch", "Español", "Português"]
      .every((label) => offered.some((o) => o.label === label)),
    offered.map((o) => o.label).join(" | "));
  // Each item declares its own language, so a screen reader switches voice
  // and Han characters get the right glyphs inside the menu too.
  check("…and each item declares its own lang",
    offered.every((o) => o.code), offered.map((o) => o.code).join(","));

  const seen = new Map();
  for (const { code } of offered) {
    await chooseLanguage(page, code);
    // Not the heading: "Biblioteca" is the same word in Spanish and in
    // Portuguese, so it proves nothing about either. The search placeholder is
    // a whole sentence and differs in all eight.
    const [marker, lang] = await page.evaluate(() => [
      document.querySelector("main input[type=search], main input[placeholder]")
        ?.getAttribute("placeholder") ?? "",
      document.documentElement.lang,
    ]);
    seen.set(code, marker);
    // `lang` is not decoration: it picks the right glyphs for Han characters,
    // which are drawn differently in Chinese and Japanese, and it is what a
    // screen reader switches voice on.
    check(`${code}: the document language follows the picker`,
      lang === code, `<html lang="${lang}">`);
  }
  check("every language renders differently on screen",
    new Set(seen.values()).size === 8 && ![...seen.values()].some((v) => !v),
    [...seen].map(([c, h]) => `${c}=${h}`).join(" | "));

  // The choice has to survive a reload, or the picker is a per-visit toy.
  await chooseLanguage(page, "ja");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check("the choice survives a reload",
    (await page.evaluate(() => document.documentElement.lang)) === "ja");
  await chooseLanguage(page, "en");
}

// Matching widens rather than requiring equality. A browser asking for pt-BR
// gets Portuguese, not English — which is what it used to get, because only
// zh and en were understood at all.
{
  const widening = await page.evaluate(() => {
    const { detect } = window.__test.i18n;
    const real = Object.getOwnPropertyDescriptor(Navigator.prototype, "languages");
    const ask = (tags) => {
      Object.defineProperty(navigator, "languages", { value: tags, configurable: true });
      const got = detect();
      if (real) Object.defineProperty(Navigator.prototype, "languages", real);
      return got;
    };
    return {
      ptBR: ask(["pt-BR"]),
      es419: ask(["es-419"]),
      deAT: ask(["de-AT"]),
      jaJP: ask(["ja-JP"]),
      koKR: ask(["ko-KR"]),
      zhTW: ask(["zh-TW"]),
      zhCN: ask(["zh-CN"]),
      unknown: ask(["is-IS"]),
      skipToKnown: ask(["is-IS", "de-DE"]),
    };
  });
  check("pt-BR widens to Portuguese", widening.ptBR === "pt", widening.ptBR);
  check("es-419 widens to Spanish", widening.es419 === "es", widening.es419);
  check("de-AT widens to German", widening.deAT === "de", widening.deAT);
  check("ja-JP widens to Japanese", widening.jaJP === "ja", widening.jaJP);
  check("ko-KR widens to Korean", widening.koKR === "ko", widening.koKR);
  // Script, not region — the step that a plain base-language match gets wrong.
  check("zh-TW is Traditional, not the base language", widening.zhTW === "zh-Hant", widening.zhTW);
  check("zh-CN is Simplified", widening.zhCN === "zh-Hans", widening.zhCN);
  check("a language we do not ship falls back to English", widening.unknown === "en");
  check("…and a later tag we do ship still wins", widening.skipToKnown === "de", widening.skipToKnown);
}

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
  // Assert the *mic* warning is gone, not that the screen holds no notes at
  // all: the "keep the recording" card carries its own, and counting every
  // note made this pass only while that one happened to be absent.
  check(
    "the warning goes away when the tab is recorded too",
    !(await page.locator("main .note").allInnerTexts()).join(" ").includes("cancelled out"),
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
  await mic.waitForSelector("main :is(h1, h2.h1)");

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
    (await mic.locator("main :is(h1, h2.h1)").first().textContent())?.includes("Recording"),
    `clock was ${elapsedBefore}`,
  );

  // Discarded rather than finished: finishing would start a transcription,
  // which means downloading a Whisper model.
  mic.on("dialog", (dialog) => dialog.accept());
  await mic.getByRole("button", { name: "Discard the recording" }).click();
  await mic.waitForTimeout(500);
  check(
    "discarding returns to the start",
    !(await mic.locator("main :is(h1, h2.h1)").first().textContent())?.includes("Recording"),
  );

  await recording.close();
}

// --- languages ---------------------------------------------------------------

// The interface has to actually switch, and the switch has to survive a reload
// — a language chosen once and forgotten on the next visit is worse than none.
{
  await page.goto(BASE);
  await page.waitForTimeout(300);
  await chooseLanguage(page, "zh-Hans");
  await page.waitForTimeout(300);
  const heading = (await page.locator("main :is(h1, h2.h1)").first().textContent()) ?? "";
  check("the interface switches to Simplified Chinese", heading.includes("没有机器人"), heading);
  check(
    "the document language attribute follows",
    (await page.getAttribute("html", "lang")) === "zh-Hans",
  );

  await page.reload();
  await page.waitForTimeout(400);
  const after = (await page.locator("main :is(h1, h2.h1)").first().textContent()) ?? "";
  check("the choice survives a reload", after.includes("没有机器人"), after);

  await chooseLanguage(page, "zh-Hant");
  await page.waitForTimeout(300);
  const hant = (await page.locator("main :is(h1, h2.h1)").first().textContent()) ?? "";
  check("Traditional is a different translation, not a converted one", hant.includes("沒有機器人"), hant);

  // The consent screen is the one place the words have to be right, so it is
  // checked in the translated locale rather than only in English.
  await page.goto(here(page, "#/record"));
  await page.waitForTimeout(300);
  const consent = (await page.locator("blockquote").first().textContent()) ?? "";
  check("the consent script is translated too", consent.includes("錄下來"), consent);

  await page.goto(BASE);
  await page.waitForTimeout(300);
  await chooseLanguage(page, "en");
  await page.waitForTimeout(300);
}

// The engine's own language coverage, which the summary panel names on screen.
{
  const languages = await page.evaluate(() => window.__test.engine.cueLanguages());
  check("the free summariser reports its languages", languages.includes("简体中文"), String(languages));
  check("…including Traditional Chinese", languages.includes("繁體中文"));
  check("…and Japanese", languages.includes("日本語"));
}

// APP-129. Lists are joined in the reader's own list grammar, never with a
// hard-coded Chinese 、. The privacy page's redaction hint is one of the three
// that shipped it; checked in the languages the report named, plus Chinese,
// where the 、 is right.
{
  const joins = {};
  for (const code of ["en", "de", "es", "pt", "zh-Hans"]) {
    await chooseLanguage(page, code);
    await page.goto(here(page, "#/privacy"));
    await page.waitForTimeout(400);
    joins[code] = await page.evaluate(() => document.querySelector("main")?.innerText ?? "");
  }
  for (const code of ["en", "de", "es", "pt"]) {
    check(`${code}: no Chinese 、 in a list`, !joins[code].includes("、"),
      (joins[code].match(/.{0,40}、.{0,40}/) ?? [""])[0]);
  }
  check("en: the redaction list reads as English", /email addresses, phone numbers/i.test(joins.en),
    (joins.en.match(/Replaces.{0,90}/) ?? [""])[0]);
  check("zh-Hans: Chinese still uses its own 、", joins["zh-Hans"].includes("、"));
  await chooseLanguage(page, "en");
}

// APP-128 and APP-130, through the export card and the file it actually saves.
// "Include who said what" must reach subtitles too, and a CSV must open in
// Windows Excel without turning Chinese into mojibake, which needs a BOM.
{
  await page.evaluate(async () => {
    const { app, engine } = window.__test;
    const transcript = engine.fromChunks([
      { start_ms: 0, end_ms: 2500, text: "你今天把上线清单发到群里。" },
      { start_ms: 2500, end_ms: 5000, text: "好的，我周五之前发给你。" },
    ], "chinese", true);
    transcript.speakers = [
      { id: "S0", label: "Speaker 1", named: false },
      { id: "S1", label: "Speaker 2", named: false },
    ];
    transcript.segments[0].speaker = "S0";
    transcript.segments[1].speaker = "S1";
    await app.save({ id: "smoke-export", title: "上线清单", created: Date.now(), updated: Date.now(),
      transcript, summary: engine.summariseLocal(transcript), aiSummary: null, consent: null,
      audio: null, audioType: null, durationMs: 5000, language: "zh" });
  });
  await page.goto(BASE + "#/note/smoke-export");
  await page.waitForTimeout(800);
  const card = page.locator("div.card", { hasText: "Include who said what" }).first();
  const speakers = card.locator("label.check", { hasText: "Include who said what" }).locator("input");
  const saved = async (format, withSpeakers) => {
    await card.locator("select").first().selectOption(format);
    if ((await speakers.isChecked()) !== withSpeakers) await speakers.click();
    const download = page.waitForEvent("download");
    await card.getByRole("button", { name: "Download" }).click();
    const { readFile } = await import("node:fs/promises");
    return readFile(await (await download).path());
  };
  for (const format of ["srt", "vtt"]) {
    const off = (await saved(format, false)).toString("utf8");
    check(`${format}: no speaker prefix when "who said what" is off`, !/Speaker \d: /.test(off), off.slice(0, 120));
    const on = (await saved(format, true)).toString("utf8");
    check(`${format}: the prefix is kept when it is on`, /Speaker 1: /.test(on), on.slice(0, 120));
  }
  const csv = await saved("csv", true);
  check("csv: starts with a UTF-8 byte-order mark", csv[0] === 0xef && csv[1] === 0xbb && csv[2] === 0xbf,
    [...csv.subarray(0, 3)].map((x) => x.toString(16)).join(" "));
  check("csv: exactly one, not stacked", !(csv[3] === 0xef && csv[4] === 0xbb));
  await page.evaluate(() => window.__test.app.remove("smoke-export"));
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
