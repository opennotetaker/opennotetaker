// The extension's own strings, in the languages the product ships.
//
// The prompt is drawn by the extension, so it follows the *browser's*
// language, not the app's picker — a German user in a German Teams meeting
// was being offered an English card (APP-165). These are the same eight
// languages the app ships, named the way Chrome names locale folders:
// zh_CN/zh_TW rather than zh-Hans/zh-Hant, pt_BR rather than pt.
//
// A missing key falls back to English at runtime, which is survivable and
// invisible — hence this test rather than a runtime check.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../_locales");

const read = (locale) => JSON.parse(readFileSync(join(root, locale, "messages.json"), "utf8"));
const locales = readdirSync(root).sort();
const english = read("en");

test("the eight product languages are all present", () => {
  assert.deepEqual(locales, ["de", "en", "es", "ja", "ko", "pt_BR", "zh_CN", "zh_TW"]);
});

test("every language says everything English says", () => {
  for (const locale of locales) {
    assert.deepEqual(
      Object.keys(read(locale)).sort(),
      Object.keys(english).sort(),
      `${locale} does not have the same keys as English`,
    );
  }
});

test("a message with a placeholder declares it", () => {
  for (const locale of locales) {
    for (const [key, entry] of Object.entries(read(locale))) {
      assert.ok(entry.message.trim(), `${locale} ${key} is empty`);
      for (const name of entry.message.match(/\$([A-Z]+)\$/g) ?? []) {
        const placeholder = name.replaceAll("$", "").toLowerCase();
        assert.ok(
          entry.placeholders?.[placeholder],
          `${locale} ${key} uses ${name} without declaring it`,
        );
      }
    }
  }
});

test("the platform's own name is never translated", () => {
  // "Google Meet" is called Google Meet in every one of these; a translated
  // product name in the prompt reads as a different product.
  for (const locale of locales) {
    const example = read(locale).promptTitle.placeholders.platform.example;
    assert.equal(example, "Google Meet", locale);
  }
});
