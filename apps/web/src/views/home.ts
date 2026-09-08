// The first screen, which is also the argument.
//
// §9 切入点1 asks for the front page to say, in one line, that we do not record
// people secretly -- as the first impression, in contrast to the "a bot
// silently joins your call" experience of Fireflies and Granola. §10's
// candidate taglines are the source of the wording here.
//
// The three claims below are the three market gaps §4 identified, in the order
// they matter: nothing is uploaded (空白1), consent is asked for (空白2), and
// the bill has no surprises in it (§5.3 共性差评1). Everything on this page is
// checkable by the reader -- which is why the privacy page exists and is
// linked from each of them.

import { el } from "../lib/dom";
import { t } from "../lib/i18n";
import { pickAudioFile } from "./import";
import { MODELS, support } from "../lib/transcribe";
import type { App } from "../main";

/// The feature table: which key, where it runs, and whether it is free.
///
/// A list rather than eleven hand-written rows, so the free/paid split is a
/// column of booleans somebody can check at a glance rather than a claim
/// repeated in prose.
const FEATURES: [Parameters<typeof t>[0], Parameters<typeof t>[0], boolean][] = [
  ["home.feature.transcribe", "home.table.inTab", true],
  ["home.feature.timeline", "home.table.inTab", true],
  ["home.feature.speakers", "home.table.inTab", true],
  ["home.feature.record", "home.table.inTab", true],
  ["home.feature.export", "home.table.inTab", true],
  ["home.feature.summary", "home.table.inTab", true],
  ["home.feature.search", "home.table.inTab", true],
  ["home.feature.translateFree", "home.table.inTab", true],
  ["home.feature.minutes", "home.table.ourServer", false],
  ["home.feature.ask", "home.table.split", false],
  ["home.feature.translatePaid", "home.table.ourServer", false],
];

export async function renderHome(app: App): Promise<Node> {
  const device = await support();
  const model = MODELS.find((m) => m.id === app.settings.model) ?? MODELS[1]!;

  const start = el(
    "div.row",
    el(
      "button.primary.big",
      { onclick: () => app.go("#/record") },
      t("home.record"),
    ),
    el(
      "button.big",
      { onclick: () => void pickAudioFile(app) },
      t("home.open"),
    ),
  );

  return el(
    "main",
    el(
      "section.hero",
      el("h1", t("home.title")),
      el("p.lede", t("home.lede")),
      start,
      el(
        "p.small.muted",
        { style: "margin-top:1rem" },
        device.ok
          ? t(device.device === "webgpu" ? "home.readyGpu" : "home.readyWasm", {
              model: model.label,
              size: model.size,
            })
          : device.reason ?? "",
      ),
    ),

    el(
      "section.claims",
      claim(t("home.claim1.title"), t("home.claim1.body"), t("home.claim1.link"), "#/privacy"),
      claim(t("home.claim2.title"), t("home.claim2.body"), null, null),
      claim(t("home.claim3.title"), t("home.claim3.body"), t("home.claim3.link"), "#/account"),
    ),

    el(
      "section.card",
      { style: "margin-top:2.5rem" },
      el("h2", t("home.table.heading")),
      el(
        "table.plain",
        el(
          "thead",
          el(
            "tr",
            el("th", t("home.table.feature")),
            el("th", t("home.table.where")),
            el("th", t("home.table.price")),
          ),
        ),
        el(
          "tbody",
          ...FEATURES.map(([key, where, free]) =>
            el(
              "tr",
              el("td", t(key)),
              el("td.muted", t(where)),
              el(
                "td",
                free
                  ? el(
                      "span.pill",
                      { style: "color:var(--success-fg);background:var(--success-bg)" },
                      t("home.table.free"),
                    )
                  : el("span.pill", t("home.table.credits")),
              ),
            ),
          ),
        ),
      ),
      el("p.small.muted", { style: "margin-top:1rem;margin-bottom:0" }, t("home.table.note")),
    ),

    el(
      "section.card",
      el("h2", t("home.selfhost.title")),
      el("p", t("home.selfhost.body")),
      el("p.small.muted", { style: "margin-bottom:0" }, t("home.selfhost.note")),
    ),
  );
}

function claim(title: string, body: string, linkLabel: string | null, href: string | null): Node {
  return el(
    "div",
    el("h3", title),
    el("p", body),
    linkLabel && href ? el("p", { style: "margin-top:.5rem" }, el("a.small", { href }, linkLabel)) : null,
  );
}
