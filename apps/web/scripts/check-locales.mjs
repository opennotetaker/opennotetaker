// Static checks on the translation catalogues.
//
// TypeScript already guarantees every locale has every key — each is typed as
// the full `Catalogue`. What it cannot see is *inside* the strings, and that is
// where the two failures that matter live:
//
// - **A dropped placeholder.** `"{count} notes deleted"` translated without its
//   `{count}` renders as "notes deleted" with the number silently gone. Nothing
//   in the type system or the browser notices; a user just sees a sentence with
//   a hole in it.
// - **An invented placeholder.** A typo like `{cout}` renders literally, braces
//   and all, in the middle of the interface.
//
// Both are caught here by comparing each translation's placeholder set against
// English's.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const locales = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "locales");

/// Pull `"key": "value"` pairs out of a catalogue without running it.
///
/// A regex rather than an import: these are TypeScript modules, so importing
/// one from a plain node script needs a build step, and the thing being checked
/// is the source text anyway.
function entries(file) {
  const source = readFileSync(join(locales, file), "utf8");
  const out = new Map();
  const pattern = /^ {2}"([^"]+)":\s*([\s\S]*?)(?=\n {2}"|\n\} as const;|\n\};)/gm;
  for (const match of source.matchAll(pattern)) out.set(match[1], match[2]);
  return out;
}

const placeholders = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const english = entries("en.ts");
const problems = [];

// Discovered, not listed. A hardcoded list is a check that silently stops
// covering a locale the moment one is added — which is exactly what happened
// when the catalogue went from three languages to eight and this file went on
// checking two of them.
const files = readdirSync(locales)
  .filter((name) => name.endsWith(".ts") && name !== "en.ts")
  .sort();

// Every locale the app offers must have a catalogue here, or a language sits
// in the picker and does nothing.
const declared = [...readFileSync(join(locales, "..", "lib", "i18n.ts"), "utf8")
  .matchAll(/code: "([^"]+)"/g)].map((m) => m[1]).filter((code) => code !== "en");
for (const code of declared) {
  if (!files.includes(`${code}.ts`)) problems.push(`${code}: offered in the picker but has no catalogue`);
}
for (const file of files) {
  if (!declared.includes(file.replace(/\.ts$/, ""))) {
    problems.push(`${file}: a catalogue nothing offers — add it to LOCALES or delete it`);
  }
}

// Values that are still the English source. Catches a copy-paste that never
// got translated, which no type and no placeholder check can see.
//
// The allowlist is for genuine identities rather than a loosened rule: a
// product name, a file extension, a word that is spelled the same. Each entry
// is a key that is *expected* to match English in at least one locale.
const SAME_AS_ENGLISH_OK = new Set([
  "app.name",          // the wordmark, never translated
  "format.json",       // "JSON (.json)" in most of them
  "nav.start",         // "Start" is also German
  "run.ready",         // "Pronto"/"Listo" differ, but "Ready" recurs
  "export.heading",    // "Export" is German and English alike
  "nav.privacy",       // never matches, but kept for the next locale that does
  "common.listJoin",   // " and " is genuinely German's join too
  "record.pause",      // "Pause" is the German word, not a missed string
  "privacy.host",      // and so is "Host", which German IT uses unchanged
]);

for (const file of files) {
  const translated = entries(file);
  for (const [key, value] of english) {
    const want = placeholders(value);
    const got = placeholders(translated.get(key) ?? "");
    if (want !== got) {
      problems.push(`${file} ${key}: expected {${want || "none"}}, found {${got || "none"}}`);
    }
  }
  for (const key of translated.keys()) {
    if (!english.has(key)) problems.push(`${file} ${key}: not in the English catalogue`);
  }
  for (const [key, value] of english) {
    const mine = translated.get(key);
    if (mine !== undefined && mine.trim() === value.trim() && !SAME_AS_ENGLISH_OK.has(key)) {
      problems.push(`${file} ${key}: identical to the English — untranslated?`);
    }
  }
  console.log(`${file.padEnd(12)} ${translated.size} strings`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`en.ts        ${english.size} strings — all locales match`);
