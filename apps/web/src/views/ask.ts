// A question across every meeting you have recorded.
//
// §5.2 lists this as an opportunity that Otter, Fathom and Granola all put in
// their highest tier. The split here follows from *why* it costs anything:
// retrieval plus a model call, of which only the second is a bill.
//
// So the search runs here, in wasm, over the whole library, and it is free and
// instant and shows you the passages. Only pressing "answer this" sends
// anything -- and what it sends is those passages, which are on screen before
// you press it.
//
// That also makes the price flat: a question costs about the same whether you
// have five meetings or five hundred, because the number of passages is
// capped, not proportional. A user can learn what a question costs once.

import * as engine from "../engine";
import { el, mount } from "../lib/dom";
import { t } from "../lib/i18n";
import { askOnBackend, jobKey, signedIn } from "../lib/account";
import type { App } from "../main";
import type { AskRequest } from "../types";
import { errorNote } from "./summary-panel";

export async function renderAsk(app: App): Promise<Node> {
  await app.refresh();

  const index = new engine.SearchIndex();
  const titles: Record<string, string> = {};
  for (const note of app.notes) {
    index.add(note.id, note.transcript);
    titles[note.id] = note.title;
  }

  const question = el("input", {
    type: "text",
    placeholder: t("ask.placeholder"),
  }) as HTMLInputElement;

  const found = el("div");
  const answer = el("div");
  const priceRow = el("div.row");
  let request: AskRequest | null = null;

  const look = () => {
    const text = question.value.trim();
    mount(answer);
    if (!text) {
      mount(found);
      mount(priceRow);
      request = null;
      return;
    }
    request = index.askPassages(text, titles);
    const quote = engine.quoteForAsk(text, request.passages.map((p) => p.text));

    mount(
      found,
      request.passages.length
        ? el(
            "div",
            el(
              "p.small.muted",
              t("ask.found", { count: request.passages.length }),
            ),
            el(
              "div.hits",
              ...request.passages.slice(0, 8).map((passage) =>
                el(
                  "a.hit",
                  {
                    href: `#/note/${passage.note_id}`,
                    style: "text-decoration:none;color:inherit;display:block",
                  },
                  el(
                    "span.where",
                    [passage.note_title, engine.clock(passage.at_ms), passage.speaker].filter(Boolean).join(" · "),
                  ),
                  passage.text,
                ),
              ),
            ),
            request.passages.length > 8
              ? el("p.small.faint", t("ask.andMore", { count: request.passages.length - 8 }))
              : null,
          )
        : el("p.muted", t("ask.nothing")),
    );

    mount(
      priceRow,
      request.passages.length
        ? el(
            "button.primary",
            {
              onclick: () => void ask(app, request!, quote.credits, answer),
            },
            t("ask.answer", { price: engine.priceLabel(quote.credits) }),
          )
        : null,
      request.passages.length && !signedIn()
        ? el("a.small", { href: "#/account" }, t("summary.signInFirst"))
        : null,
    );
  };

  // Debounced: the index is fast, but rebuilding the passage list on every
  // keystroke also re-renders the price, and a price that flickers while you
  // type reads as unstable.
  let timer: number | undefined;
  question.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(look, 180);
  });

  return el(
    "main",
    el("h1", t("ask.title")),
    el(
      "p.lede",
      { style: "font-size:var(--text-md)" },
      app.notes.length
        ? t("ask.lede", { notes: app.notes.length, lines: index.size })
        : t("ask.ledeEmpty"),
    ),
    el("div", { style: "margin:1.5rem 0" }, question),
    found,
    priceRow,
    answer,
    el(
      "div.card",
      { style: "margin-top:2rem" },
      el("h3", t("ask.splitHeading")),
      el("p.small.muted", { style: "margin-bottom:.5rem" }, t("ask.splitBody")),
      el("p.small.faint", { style: "margin:0" }, t("ask.splitNote")),
    ),
  );
}

async function ask(app: App, request: AskRequest, credits: number, root: HTMLElement): Promise<void> {
  mount(root, el("p.small.muted", { style: "margin-top:1rem" }, t("ask.thinking")));
  try {
    const result = await askOnBackend(
      request.question,
      request.passages,
      jobKey("ask", request.question, ...request.passages.map((p) => p.tag + p.note_id)),
    );
    mount(
      root,
      el(
        "div.card",
        { style: "margin-top:1rem" },
        result.answer.answered
          ? el("p", { style: "color:var(--text-strong);font-size:var(--text-md)" }, result.answer.answer)
          : el("div.note.info", result.answer.answer),
        result.answer.cited.length
          ? el(
              "div",
              el(
                "h4",
                { style: "font-size:var(--text-sm);color:var(--text-muted);margin:1rem 0 .5rem" },
                t("ask.sources"),
              ),
              el(
                "div.hits",
                ...result.answer.cited.map((citation) =>
                  el(
                    "a.hit",
                    {
                      href: `#/note/${citation.note_id}`,
                      style: "text-decoration:none;color:inherit;display:block",
                    },
                    el("span.where", `${citation.note_title} · ${engine.clock(citation.at_ms)}`),
                    citation.text,
                  ),
                ),
              ),
            )
          : el("p.small.faint", t("ask.noCitations")),
        el(
          "p.small.faint",
          { style: "margin:1rem 0 0" },
          t("ask.charged", {
            charged: engine.creditWord(result.charged || credits),
            balance: engine.creditWord(result.newBalance),
          }),
        ),
      ),
    );
  } catch (error) {
    mount(root, el("div", { style: "margin-top:1rem" }, errorNote(app, error as Error)));
  }
}
