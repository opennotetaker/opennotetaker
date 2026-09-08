// The privacy centre: every request this app can make, named.
//
// This page is the receipt for the claim the landing page makes. §9 切入点1
// says the trust position only becomes a moat if it is kept consistently at
// every point -- storage, model policy, third parties -- rather than asserted
// once in marketing. A page that lists the four hosts this application is
// capable of contacting, and what would be in each request, is the difference
// between a claim and something a reader can check.
//
// Everything here is also *actionable*: the settings that change what leaves
// this device are on this page, next to the description of what leaves.

import * as engine from "../engine";
import { el, mount } from "../lib/dom";
import { current, LOCALES, setLocale, t, type LocaleCode } from "../lib/i18n";
import { AUTH_URL, API_URL } from "../lib/account";
import { LANGUAGES, MODELS } from "../lib/transcribe";
import type { App } from "../main";

export async function renderPrivacy(app: App): Promise<Node> {
  const bytes = await app.store.size().catch(() => 0);
  const kinds = engine.redactions();

  return el(
    "main",
    el("h1", t("privacy.title")),
    el("p.lede", { style: "font-size:var(--text-md)" }, t("privacy.lede")),

    el(
      "div.card",
      el("h3", t("privacy.tableHeading")),
      el(
        "table.plain",
        el(
          "thead",
          el(
            "tr",
            el("th", t("privacy.host")),
            el("th", t("privacy.when")),
            el("th", t("privacy.what")),
          ),
        ),
        el(
          "tbody",
          request("huggingface.co", t("privacy.hfWhen"), t("privacy.hfWhat")),
          request(t("privacy.thisSite"), t("privacy.siteWhen"), t("privacy.siteWhat")),
          request(hostOf(AUTH_URL), t("privacy.authWhen"), t("privacy.authWhat")),
          request(hostOf(API_URL), t("privacy.gatewayWhen"), t("privacy.gatewayWhat")),
        ),
      ),
      el("p.small.faint", { style: "margin:1rem 0 0" }, t("privacy.noTrackers")),
      el("p.small.faint", { style: "margin:.5rem 0 0" }, t("privacy.testedClaim")),
    ),

    el(
      "div.card",
      el("h3", t("privacy.audioHeading")),
      el("p", t("privacy.audioBody")),
      el("p.small.muted", { style: "margin-bottom:0" }, t("privacy.audioNote")),
    ),

    el(
      "div.card",
      el("h3", t("privacy.storedHeading")),
      el(
        "p",
        app.store.durable
          ? t("privacy.storedBody", { count: app.notes.length, size: formatBytes(bytes) })
          : t("privacy.storedNothing"),
      ),
      el("div.row", el("a.button", { href: "#/library" }, t("privacy.changeRetention"))),
    ),

    el(
      "div.card",
      el("h3", t("privacy.redactHeading")),
      el(
        "label.check",
        el("input", {
          type: "checkbox",
          checked: app.settings.redactBeforeSending,
          onchange: (event: Event) => {
            app.settings.redactBeforeSending = (event.target as HTMLInputElement).checked;
            app.render();
          },
        }),
        el(
          "span",
          el("span", t("privacy.redactLabel")),
          el(
            "span.hint",
            t("privacy.redactHint", { kinds: kinds.map((k) => k.label).join("、") }),
          ),
        ),
      ),
      el("p.small.muted", { style: "margin:.5rem 0 0" }, t("privacy.redactNote")),
    ),

    el(
      "div.card",
      el("h3", t("privacy.recordingHeading")),
      el(
        "label.check",
        el("input", {
          type: "checkbox",
          checked: app.settings.keepAudio,
          onchange: (event: Event) => {
            app.settings.keepAudio = (event.target as HTMLInputElement).checked;
            app.render();
          },
        }),
        el(
          "span",
          el("span", t("privacy.keepAudio")),
          el("span.hint", t("privacy.keepAudioHint")),
        ),
      ),
      el(
        "label.check",
        el("input", {
          type: "checkbox",
          checked: app.settings.diarize,
          onchange: (event: Event) => {
            app.settings.diarize = (event.target as HTMLInputElement).checked;
            app.render();
          },
        }),
        el(
          "span",
          el("span", t("privacy.diarize")),
          el("span.hint", t("privacy.diarizeHint")),
        ),
      ),
    ),

    languageCard(app),

    el(
      "div.card",
      el("h3", t("privacy.modelHeading")),
      el(
        "div",
        ...MODELS.map((model) =>
          el(
            "label.check",
            el("input", {
              type: "radio",
              name: "model",
              checked: app.settings.model === model.id,
              onchange: () => {
                app.settings.model = model.id;
                app.render();
              },
            }),
            el(
              "span",
              el("span", `${model.label} — ${model.size}`),
              el("span.hint", t(model.note as Parameters<typeof t>[0])),
            ),
          ),
        ),
      ),
      el(
        "p.small.faint",
        { style: "margin:.5rem 0 0" },
        t("privacy.modelNote"),
      ),
    ),

    el(
      "div.card",
      el("h3", t("privacy.selfHostHeading")),
      el("p", t("privacy.selfHostBody")),
      el("p.small.muted", { style: "margin-bottom:0" }, t("privacy.selfHostNote")),
    ),
  );
}

/// The two language controls, together, because a reader confusing them will
/// look for both in the same place.
///
/// They are genuinely different settings: one changes the words this app says,
/// the other tells Whisper what it is listening to. Putting them side by side
/// with that stated is cheaper than answering the question afterwards.
function languageCard(app: App): Node {
  const ui = el(
    "select",
    {
      style: "width:auto",
      onchange: (event: Event) => {
        setLocale((event.target as HTMLSelectElement).value as LocaleCode);
        app.render();
      },
    },
    ...LOCALES.map((locale) =>
      el("option", { value: locale.code, selected: locale.code === current().code }, locale.label),
    ),
  );

  const spoken = el(
    "select",
    {
      style: "width:auto",
      onchange: (event: Event) => {
        app.settings.language = (event.target as HTMLSelectElement).value;
        app.render();
      },
    },
    ...LANGUAGES.map((language) =>
      el(
        "option",
        { value: language.code, selected: language.code === app.settings.language },
        language.code === "" ? t("language.detect") : language.label,
      ),
    ),
  );

  // Only beside a first language, and cleared with it. "Detect it, but one of
  // them is definitely Chinese" is not a thing to ask for, and a leftover
  // second choice read as the only choice would silently force every recording
  // into it.
  const second = app.settings.language
    ? el(
        "select",
        {
          style: "width:auto",
          onchange: (event: Event) => {
            app.settings.secondLanguage = (event.target as HTMLSelectElement).value;
            app.render();
          },
        },
        el("option", { value: "", selected: app.settings.secondLanguage === "" }, t("language.none")),
        ...LANGUAGES.filter(
          (language) => language.code !== "" && language.code !== app.settings.language,
        ).map((language) =>
          el(
            "option",
            { value: language.code, selected: language.code === app.settings.secondLanguage },
            language.label,
          ),
        ),
      )
    : null;

  return el(
    "div.card",
    el("h3", t("privacy.interfaceHeading")),
    el("div.row", ui),
    el("p.small.muted", { style: "margin:.5rem 0 1.5rem" }, t("privacy.interfaceHint")),

    el("h3", t("privacy.languageHeading")),
    el("div.row", spoken, second),
    el(
      "p.small.muted",
      { style: "margin:.5rem 0 0" },
      second ? t("privacy.secondLanguageHint") : t("privacy.languageHint"),
    ),
    el(
      "label.check",
      el("input", {
        type: "checkbox",
        checked: app.settings.translateToEnglish,
        onchange: (event: Event) => {
          app.settings.translateToEnglish = (event.target as HTMLInputElement).checked;
          app.render();
        },
      }),
      el(
        "span",
        el("span", t("privacy.translateToEnglish")),
        el("span.hint", t("privacy.translateHint")),
      ),
    ),
  );
}

function request(host: string, when: string, what: string): Node {
  return el("tr", el("td", el("code", host)), el("td.muted", when), el("td", what));
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export { mount };
