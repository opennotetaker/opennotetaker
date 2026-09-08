// Everything recorded on this device, and the controls over how long it stays.
//
// The listing is the easy half. The other half is §10's third tagline made
// real -- "you decide what is recorded and how long it is kept" -- which means
// the retention control belongs *here*, next to the things it deletes, rather
// than buried in a settings page.
//
// Search across the whole library is free and local: a BM25 index built in
// wasm over every stored transcript. It is also the retrieval step the paid
// Ask feature uses, which is why finding something never costs anything and
// only having it *answered* does.

import * as engine from "../engine";
import { download, el, mount, newId } from "../lib/dom";
import { formatDate, t } from "../lib/i18n";
import { enforceRetention, exportAll, expiresAt, openStore, parseImport, retentions } from "../lib/store";
import { importFile, pickAudioFile } from "./import";
import type { App } from "../main";
import type { Note, Retention } from "../types";

export async function renderLibrary(app: App): Promise<Node> {
  await app.refresh();
  const rows = el("div.notes");
  const results = el("div.hits");

  const index = new engine.SearchIndex();
  for (const note of app.notes) index.add(note.id, note.transcript);

  const drawRows = (notes: Note[]) => {
    mount(
      rows,
      ...(notes.length
        ? notes.map((note) => row(app, note))
        : [
            el("p.muted", t(app.notes.length ? "library.noMatch" : "library.empty")),
          ]),
    );
  };

  const search = el("input", {
    type: "search",
    placeholder: app.notes.length
      ? t("library.searchPlaceholderCount", { lines: index.size })
      : t("library.searchPlaceholder"),
    oninput: (event: Event) => {
      const query = (event.target as HTMLInputElement).value.trim();
      if (!query) {
        mount(results);
        drawRows(app.notes);
        return;
      }
      // Two things at once: filter the list of meetings, and show the actual
      // lines that matched. The second is what makes this useful -- "which
      // meeting was that in" is nearly always followed by "what was said".
      const hits = index.search(query, 30);
      const ids = new Set(hits.map((hit) => hit.passage.note_id));
      drawRows(app.notes.filter((note) => ids.has(note.id) || note.title.toLowerCase().includes(query.toLowerCase())));
      mount(
        results,
        ...hits.slice(0, 12).map((hit) => {
          const note = app.notes.find((n) => n.id === hit.passage.note_id);
          return el(
            "a.hit",
            { href: `#/note/${hit.passage.note_id}`, style: "text-decoration:none;color:inherit;display:block" },
            el(
              "span.where",
              [note?.title ?? "Untitled", engine.clock(hit.passage.start_ms), hit.passage.speaker]
                .filter(Boolean)
                .join(" · "),
            ),
            highlight(hit.passage.text, query),
          );
        }),
      );
    },
  });

  drawRows(app.notes);

  return el(
    "main",
    el(
      "div.spread",
      el("h1", { style: "margin:0" }, t("library.title")),
      el(
        "div.row",
        el("button", { onclick: () => app.go("#/record") }, t("library.record")),
        el("button", { onclick: () => void pickAudioFile(app) }, t("library.open")),
      ),
    ),
    el(
      "p.small.muted",
      t(app.store.durable ? "library.durable" : "library.memory"),
    ),

    el("div", { style: "margin:1.5rem 0" }, search),
    results,
    rows,

    retentionCard(app),
    dataCard(app),
  );
}

function row(app: App, note: Note): Node {
  const expires = expiresAt(note, app.settings.retention);
  return el(
    "a.note-row",
    { href: `#/note/${note.id}` },
    el(
      "div.grow",
      el("div.title", note.title),
      el(
        "div.meta",
        [
          formatDate(note.created, { day: "numeric", month: "short", year: "numeric" }),
          engine.clock(note.durationMs || note.transcript.duration_ms),
          note.transcript.speakers.length === 1
            ? t("library.oneVoice")
            : t("library.voices", { count: note.transcript.speakers.length || 1 }),
          t(note.audio ? "library.audioKept" : "library.transcriptOnly"),
          note.aiSummary ? t("library.hasMinutes") : null,
        ]
          .filter(Boolean)
          .join(" · "),
      ),
    ),
    expires
      ? el(
          "span.pill",
          { title: t("library.deletedOn", { date: formatDate(expires, { dateStyle: "medium" }) }) },
          daysLeft(expires),
        )
      : null,
  );
}

function daysLeft(at: number): string {
  const days = Math.ceil((at - Date.now()) / 86_400_000);
  return days <= 0 ? t("library.expiring") : t("library.daysLeft", { days });
}

/// A case-insensitive highlight that does not go near `innerHTML`.
///
/// A transcript is untrusted text -- it is whatever a model produced from
/// whatever somebody said -- and building a match highlighter out of string
/// replacement into HTML is the classic way that becomes an injection.
function highlight(text: string, query: string): Node {
  const node = el("span");
  const needle = query.toLowerCase();
  const haystack = text.toLowerCase();
  let at = 0;
  for (;;) {
    const found = haystack.indexOf(needle, at);
    if (found === -1 || !needle) break;
    node.append(text.slice(at, found));
    node.append(el("mark", text.slice(found, found + needle.length)));
    at = found + needle.length;
  }
  node.append(text.slice(at));
  return node;
}

function retentionCard(app: App): Node {
  const status = el("div");
  return el(
    "div.card",
    { style: "margin-top:2rem" },
    el("h3", t("library.retentionHeading")),
    el("p.small.muted", t("library.retentionNote")),
    el(
      "div",
      ...retentions().map((option) =>
        el(
          "label.check",
          el("input", {
            type: "radio",
            name: "retention",
            checked: app.settings.retention === option.value,
            onchange: () => void changeRetention(app, option.value, status),
          }),
          el(
            "span",
            el("span", option.label),
            option.hint ? el("span.hint", option.hint) : null,
          ),
        ),
      ),
    ),
    status,
  );
}

async function changeRetention(app: App, retention: Retention, status: HTMLElement): Promise<void> {
  const wasMemoryOnly = app.settings.retention === "session";
  app.settings.retention = retention;

  // Switching *into* session mode has to actually move the data, not just
  // change a label: the promise is "nothing on disk", and leaving the old
  // IndexedDB rows behind would make that false.
  if (retention === "session") {
    const notes = await app.store.all();
    await app.store.clear();
    app.store = await openStore(retention);
    for (const note of notes) await app.store.put(note);
    mount(
      status,
      el("div.note.good", t("library.movedToMemory")),
    );
  } else if (wasMemoryOnly) {
    const notes = await app.store.all();
    app.store = await openStore(retention);
    for (const note of notes) await app.store.put(note);
  }

  const removed = await enforceRetention(app.store, retention);
  await app.refresh();
  if (removed > 0) {
    mount(status, el("div.note.warn", t("library.retentionRemoved", { count: removed })));
  }
  app.render();
}

function dataCard(app: App): Node {
  const status = el("div");
  return el(
    "div.card",
    el("h3", t("library.dataHeading")),
    el("p.small.muted", t("library.dataNote")),
    el(
      "div.row",
      el(
        "button",
        {
          onclick: () =>
            download(
              `opennotetaker-${new Date().toISOString().slice(0, 10)}.json`,
              exportAll(app.notes),
              "application/json",
            ),
        },
        t("library.exportAll"),
      ),
      el("button", { onclick: () => void pickRestore(app, status) }, t("library.importAll")),
      el(
        "button.danger",
        {
          onclick: async () => {
            if (!confirm(t("library.deleteAllConfirm", { count: app.notes.length }))) return;
            await app.store.clear();
            await app.refresh();
            app.render();
          },
        },
        t("library.deleteAll"),
      ),
    ),
    status,
    el(
      "p.small.faint",
      { style: "margin:1rem 0 0" },
      t("library.exportNote"),
    ),
  );
}

async function pickRestore(app: App, status: HTMLElement): Promise<void> {
  const input = el("input", { type: "file", accept: "application/json,.json" }) as HTMLInputElement;
  input.style.display = "none";
  document.body.append(input);
  const file = await new Promise<File | null>((resolve) => {
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener("cancel", () => resolve(null), { once: true });
    input.click();
  });
  input.remove();
  if (!file) return;

  try {
    const notes = parseImport(await file.text());
    for (const note of notes) {
      // Ids are kept where they are usable, so re-importing the same file is
      // idempotent rather than producing a second copy of every meeting.
      await app.store.put({ ...note, id: note.id || newId() });
    }
    await app.refresh();
    mount(status, el("div.note.good", t("library.restored", { count: notes.length })));
    app.render();
  } catch (error) {
    mount(status, el("div.note.bad", (error as Error).message));
  }
}

/// Re-exported so `import.ts` and this module agree on the entry point.
export { importFile };
