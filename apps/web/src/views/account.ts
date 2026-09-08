// Sign-in, balance and credits.
//
// Deliberately dull, and deliberately honest about how little it gates. §5.3
// found billing opacity to be the second-largest complaint in this category --
// surprise renewals, cancellation mazes, tiers nobody could follow -- so the
// first thing this page says is what you can do without an account, which is
// nearly everything.
//
// The elements are the shared OpenApps ones, so the account here is the same
// account across every app in the suite. They configure themselves from
// lib/account.ts, which is imported for that side effect.

import * as engine from "../engine";
import { el } from "../lib/dom";
import { t } from "../lib/i18n";
import "../lib/account";
import type { App } from "../main";

export function renderAccount(app: App): Node {
  const pricing = engine.pricing();

  return el(
    "main",
    el("h1", t("account.title")),
    el("p.lede", { style: "font-size:var(--text-md)" }, t("account.lede")),

    // The element's own defaults name the shared platform -- "Sign in to
    // OpenApps", a mark reading "O". That is right on the platform's own
    // pages and wrong here: a second company's name above a password field,
    // in a product someone installed to take meeting notes, reads exactly
    // like the handoff people are told to be suspicious of. `mark` is the
    // glyph the app icon is drawn from, so the panel and the browser tab
    // agree.
    el(
      "div.card",
      el("openapps-login", {
        variant: "panel",
        mark: "\u2980",
        heading: t("account.signInHeading"),
        description: t("account.signInBody"),
      }),
    ),

    el(
      "div.card",
      el("h3", t("account.creditsHeading")),
      el("openapps-credits", { "poll-seconds": "30" }),
      el(
        "p.small.muted",
        { style: "margin-top:1rem" },
        t("account.creditsNote", {
          packCredits: pricing.pack_credits,
          packPrice: engine.usd(pricing.pack_usd),
          each: engine.usd(pricing.credit_usd),
        }),
      ),
      el("openapps-buy"),
    ),

    el(
      "div.card",
      el("h3", t("account.costHeading")),
      el(
        "table.plain",
        el("thead", el("tr", el("th", t("account.job")), el("th", t("account.typical")))),
        el(
          "tbody",
          el("tr", el("td", t("account.cost30")), el("td.tabular", exampleSummary(30))),
          el("tr", el("td", t("account.cost60")), el("td.tabular", exampleSummary(60))),
          el("tr", el("td", t("account.costAsk")), el("td.tabular", exampleAsk())),
        ),
      ),
      el("p.small.faint", { style: "margin:1rem 0 0" }, t("account.costNote")),
    ),

    el(
      "div.card",
      el("h3", t("account.historyHeading")),
      el("openapps-history"),
    ),

    el(
      "div.card",
      el("h3", t("account.notHeading")),
      el("p.small.muted", { style: "margin-bottom:0" }, t("account.notBody")),
    ),

    (() => {
      void app;
      return null;
    })(),
  );
}

/// A representative price, computed from the same crate that charges.
///
/// Synthesised from an average speaking rate rather than hard-coded, so these
/// numbers move when the rates or the margin move and cannot go stale on the
/// page while being correct on the button.
function exampleSummary(minutes: number): string {
  const line = "[0:00] Speaker 1: this is roughly what a line of meeting transcript looks like\n";
  const quote = engine.quoteForSummary(line.repeat(minutes * 12));
  return engine.priceLabel(quote.credits);
}

function exampleAsk(): string {
  const passages = Array.from({ length: 24 }, () => "a retrieved passage of about this length from a meeting");
  return engine.priceLabel(engine.quoteForAsk("what did we decide about the migration?", passages).credits);
}
