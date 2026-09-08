// The two summaries, side by side and honestly labelled.
//
// §5.2 of the research is unambiguous: generative summarisation is the one
// capability nine of the eleven competitors that have it put behind a paywall,
// and it is the most-cited reason people pay. Extractive summarisation costs
// nothing and is free here. So both exist, and the interface has one job
// beyond rendering them -- never letting a reader mistake one for the other.
//
// Hence: the free panel is always visible and always first, the paid one is
// labelled "written by AI", and buying a summary adds a panel rather than
// replacing the extracted one. A product that quietly swapped "sentences from
// your meeting" for "sentences a model wrote about your meeting" would be
// undermining the only thing it is selling.
//
// # The price is on the button
//
// Not on a pricing page, not after signing in. §5.3 found billing opacity to
// be the second-largest complaint in this category; the answer is that you can
// read the exact cost of this specific job before you have an account.

import * as engine from "../engine";
import { el, mount } from "../lib/dom";
import { t } from "../lib/i18n";
import {
  balance,
  InsufficientCredits,
  jobKey,
  NotSignedIn,
  signedIn,
  summariseOnBackend,
} from "../lib/account";
import type { App } from "../main";
import type { Note, Summary } from "../types";

export function renderSummaryPanel(app: App, note: Note): Node {
  const free = el("div");
  const paid = el("div");

  const drawFree = () => {
    mount(
      free,
      el(
        "div.spread",
        el("h3", { style: "margin:0" }, t("summary.freeHeading")),
        el(
          "div.row",
          el("span.pill", t("summary.freeBadge")),
          el(
            "button.tiny",
            {
              onclick: () => {
                note.summary = engine.summariseLocal(note.transcript);
                void app.save(note).then(drawFree);
              },
            },
            t("summary.redo"),
          ),
        ),
      ),
      note.summary && !isEmpty(note.summary)
        ? summaryBody(note.summary, note)
        : el(
            "p.muted",
            { style: "margin-bottom:0" },
            t("summary.empty"),
          ),
      el(
        "p.small.faint",
        { style: "margin:1rem 0 0" },
        t("summary.freeNote"),
      ),
      el(
        "p.small.faint",
        { style: "margin:.5rem 0 0" },
        t("summary.cueLanguages", { languages: engine.cueLanguages().join("、") }),
      ),
    );
  };

  drawFree();
  drawPaid(app, note, paid);

  return el("div.card", free, el("hr", { style: "border:none;border-top:var(--edge);margin:1.5rem 0" }), paid);
}

/// The header line for either tier: the model's prose where there is any, else
/// the counts rendered through this locale's template.
function header(summary: Summary): string {
  if (summary.overview.trim()) return summary.overview.trim();
  if (!summary.stats) return "";
  return t("summary.stats", {
    sentences: summary.stats.sentences,
    minutes: summary.stats.minutes,
    speakers: summary.stats.speakers,
  });
}

function isEmpty(summary: Summary): boolean {
  return (
    !summary.overview.trim() &&
    !summary.stats &&
    summary.keywords.length === 0 &&
    summary.key_points.length === 0 &&
    summary.decisions.length === 0 &&
    summary.action_items.length === 0 &&
    summary.questions.length === 0
  );
}

function summaryBody(summary: Summary, note: Note): Node {
  const seek = (ms: number | null) => {
    if (ms === null) return;
    const player = document.querySelector("audio");
    if (player) {
      player.currentTime = ms / 1000;
      void player.play();
    }
  };

  return el(
    "div.summary-lists",
    header(summary) ? el("p", { style: "color:var(--text-strong)" }, header(summary)) : null,

    summary.keywords.length
      ? el(
          "p.small",
          { style: "margin-bottom:1rem" },
          el("span.muted", t("summary.topics")),
          summary.keywords.join(" · "),
        )
      : null,

    list(t("summary.keyPoints"), summary.key_points),
    list(t("summary.decisions"), summary.decisions),

    summary.action_items.length
      ? el(
          "div",
          el(
            "h4",
            { style: "margin:0 0 .25rem;font-size:var(--text-sm);color:var(--text-muted)" },
            t("summary.actionItems"),
          ),
          el(
            "ul.actions-list",
            ...summary.action_items.map((item) =>
              el(
                "li",
                item.at_ms !== null
                  ? el(
                      "button.at.clock.tiny.quiet",
                      { onclick: () => seek(item.at_ms), title: t("note.playFromHere") },
                      engine.clock(item.at_ms),
                    )
                  : null,
                el(
                  "span",
                  { style: "flex:1" },
                  item.text,
                  item.owner ? el("span.owner", ` — ${item.owner}`) : null,
                  item.due ? el("span.due", ` (${item.due})`) : null,
                ),
              ),
            ),
          ),
        )
      : null,

    // "Questions asked" for the extracted tier, "Open questions" for the
    // written one -- extraction cannot know whether a question was answered.
    list(
      t(summary.origin === "generated" ? "summary.questionsOpen" : "summary.questionsAsked"),
      summary.questions,
    ),
    note.transcript.speakers.length > 1 ? talkTime(note) : null,
  );
}

function list(heading: string, items: string[]): Node | null {
  if (!items.length) return null;
  return el(
    "div",
    el("h4", { style: "margin:0 0 .25rem;font-size:var(--text-sm);color:var(--text-muted)" }, heading),
    el("ul", ...items.map((item) => el("li", item))),
  );
}

/// Who held the floor. Computed from data already on screen, and a small thing
/// several competitors put behind an account.
function talkTime(note: Note): Node {
  const rows = engine.talkTimes(note.transcript);
  const total = rows.reduce((sum, row) => sum + row.ms, 0) || 1;
  return el(
    "div",
    el(
      "h4",
      { style: "margin:1rem 0 .5rem;font-size:var(--text-sm);color:var(--text-muted)" },
      t("summary.whoTalked"),
    ),
    ...rows.map((row) =>
      el(
        "div",
        { style: "display:grid;grid-template-columns:8rem 1fr 4rem;gap:.5rem;align-items:center;margin-bottom:.25rem" },
        el("span.small", row.label),
        el("div.meter", el("i", { style: `width:${Math.round((row.ms / total) * 100)}%` })),
        el("span.small.faint.tabular", `${Math.round((row.ms / total) * 100)}%`),
      ),
    ),
  );
}

// -------------------------------------------------------------- the paid half

function drawPaid(app: App, note: Note, root: HTMLElement): void {
  const rendered = engine.renderForRequest(note.transcript);
  const requests = engine.requestCount(rendered);
  const quote = engine.quoteForSummary(rendered);
  const status = el("div");
  const instructions = el("input", {
    type: "text",
    placeholder: t("summary.steerPlaceholder"),
  }) as HTMLInputElement;

  const buy = el(
    "button.primary",
    {
      onclick: async () => {
        buy.disabled = true;
        mount(status, el("p.small.muted", t("summary.writing")));
        try {
          const toSend = app.settings.redactBeforeSending
            ? engine.render(engine.redact(note.transcript, null).transcript, "text_timestamped", { title: note.title })
            : rendered;
          const result = await summariseOnBackend(
            app.settings.redactBeforeSending ? engine.renderForRequest(engine.redact(note.transcript, null).transcript) : toSend,
            instructions.value.trim(),
            note.transcript.language,
            // Keyed on the transcript and the instruction, so pressing the
            // button twice for the same job replays one charge rather than
            // making two.
            jobKey("summarise", note.id, String(note.transcript.segments.length), instructions.value.trim()),
          );
          note.aiSummary = result.summary;
          await app.save(note);
          drawPaid(app, note, root);
        } catch (error) {
          buy.disabled = false;
          mount(status, errorNote(app, error as Error));
        }
      },
    },
    t("summary.write", { price: engine.priceLabel(quote.credits) }),
  );

  mount(
    root,
    el(
      "div.spread",
      el("h3", { style: "margin:0" }, t("summary.paidHeading")),
      el(
        "span.pill",
        note.aiSummary ? t("summary.paidBought") : engine.priceLabel(quote.credits),
      ),
    ),

    note.aiSummary
      ? el(
          "div",
          summaryBody(note.aiSummary, note),
          el(
            "div.row",
            { style: "margin-top:1rem" },
            el(
              "button.tiny.quiet",
              {
                onclick: () => {
                  note.aiSummary = null;
                  void app.save(note).then(() => drawPaid(app, note, root));
                },
              },
              t("summary.discard"),
            ),
          ),
        )
      : el(
          "div",
          el(
            "p.muted",
            t("summary.paidBody"),
          ),
          el("label.field", el("span", t("summary.steer")), instructions),
          el(
            "div.row",
            buy,
            signedIn()
              ? balanceLine()
              : el("a.small", { href: "#/account" }, t("summary.signInFirst")),
          ),
          status,
          el(
            "details.reveal",
            { style: "margin-top:1rem" },
            el(
              "summary",
              requests === 1
                ? t("summary.revealOne")
                : t("summary.revealMany", { count: requests }),
            ),
            el(
              "p.small",
              { style: "margin-top:0" },
              app.settings.redactBeforeSending
                ? redactionLine(note)
                : t("summary.redactOff"),
            ),
            el("pre", preview(app, note, rendered)),
          ),
          el(
            "p.small.faint",
            { style: "margin:1rem 0 0" },
            t("summary.paidNote"),
          ),
        ),
  );
}

function redactionLine(note: Note): string {
  const { report } = engine.redact(note.transcript, null);
  const total = report.counts.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return t("summary.redactNone");
  // The kind names come from the engine, which reports them with the labels the
  // interface uses -- so the sentence reads in the reader's language rather
  // than naming a Rust enum variant.
  const names = new Map(engine.redactions().map((r) => [r.kind, r.label]));
  const parts = report.counts.map(([kind, count]) => `${count} ${names.get(kind) ?? kind}`);
  return t("summary.redactSome", { items: parts.join("、") });
}

function preview(app: App, note: Note, rendered: string): string {
  const text = app.settings.redactBeforeSending
    ? engine.renderForRequest(engine.redact(note.transcript, null).transcript)
    : rendered;
  if (text.length <= 6_000) return text;
  return `${text.slice(0, 6_000)}\n\n${t("summary.moreChars", { count: text.length - 6_000 })}`;
}

function balanceLine(): Node {
  const node = el("span.small.muted", "…");
  void balance().then((credits) => {
    node.textContent = t("summary.balance", { credits: engine.creditWord(credits) });
  });
  return node;
}

export function errorNote(app: App, error: Error): Node {
  if (error instanceof NotSignedIn) {
    return el(
      "div.note.info",
      el("span", `${error.message} `),
      el("a", { href: "#/account" }, t("error.signIn")),
    );
  }
  if (error instanceof InsufficientCredits) {
    return el(
      "div.note.warn",
      el("span", `${error.message} `),
      el(
        "a",
        { href: "#/account" },
        t("error.topUp", {
          price: engine.usd(engine.pricing().pack_usd),
          credits: engine.pricing().pack_credits,
        }),
      ),
    );
  }
  void app;
  return el("div.note.bad", error.message);
}
