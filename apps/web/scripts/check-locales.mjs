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

import { readFileSync } from "node:fs";
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

for (const file of ["zh-Hans.ts", "zh-Hant.ts"]) {
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
  console.log(`${file.padEnd(12)} ${translated.size} strings`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`en.ts        ${english.size} strings — all locales match`);
