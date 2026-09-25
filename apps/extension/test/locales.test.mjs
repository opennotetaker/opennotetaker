// The extension's strings, in two layers.
//
// **The store's** — `name` and `description`, which the manifest points at
// with `__MSG_name__`. These are what a shopper reads in the Chrome and Edge
// listings, they are the copy that was signed off (APP-175), and every one of
// them has to fit the store's limits or the upload is rejected at submission
// rather than here.
//
// **The interface's** — the prompt and the popup, which follow the browser's
// language. These exist in the eight languages the product ships (APP-165);
// Chrome falls back to `default_locale` per missing message, so a locale with
// store copy alone shows an English prompt rather than nothing.
//
// A missing key is invisible at runtime by design, which is exactly why it is
// checked here.

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

/// The languages the *product* is translated into — the prompt, the popup.
/// Chrome spells them its own way: zh_CN/zh_TW, pt_BR.
const INTERFACE = ["de", "en", "es", "ja", "ko", "pt_BR", "zh_CN", "zh_TW"];

/// What the stores allow. Exceeding either is rejected at submission.
const MAX_NAME = 75;
const MAX_DESCRIPTION = 132;

test("every language has the listed name and description", () => {
  for (const locale of locales) {
    const messages = read(locale);
    for (const key of ["name", "description"]) {
      assert.ok(messages[key]?.message?.trim(), `${locale} has no ${key}`);
    }
  }
});

test("the store's own limits are respected", () => {
  for (const locale of locales) {
    const messages = read(locale);
    assert.ok(
      messages.name.message.length <= MAX_NAME,
      `${locale}: name is ${messages.name.message.length} characters, over ${MAX_NAME}`,
    );
    assert.ok(
      messages.description.message.length <= MAX_DESCRIPTION,
      `${locale}: description is ${messages.description.message.length}, over ${MAX_DESCRIPTION}`,
    );
  }
});

test("the interface is translated in the eight the product ships", () => {
  assert.deepEqual(
    locales.filter((locale) => INTERFACE.includes(locale)),
    INTERFACE,
  );
  for (const locale of INTERFACE) {
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
  for (const locale of INTERFACE) {
    const example = read(locale).promptTitle.placeholders.platform.example;
    assert.equal(example, "Google Meet", locale);
  }
});

test("the manifest takes its name and description from these", () => {
  const manifest = JSON.parse(readFileSync(join(here, "../manifest.json"), "utf8"));
  assert.equal(manifest.name, "__MSG_name__");
  assert.equal(manifest.description, "__MSG_description__");
  assert.equal(manifest.default_locale, "en");
  assert.ok(locales.includes(manifest.default_locale));
});
