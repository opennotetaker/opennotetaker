// The shell: state everything shares, and the router that swaps views into it.
//
// One module owns the pieces that must outlive a view -- the store, the search
// index, the settings, and above all the recorder. A recording that stopped
// because somebody opened the library would be a bug of the worst kind for
// this product, so the `Recorder` lives here and the record view merely draws
// it.

import "./styles.css";

import * as engine from "./engine";
import { el, mount } from "./lib/dom";
import { connect as connectDetector, type Handoff, onHandoff } from "./lib/ext-bridge";
import { current, initialLocale, LOCALES, setLocale, t, type LocaleCode } from "./lib/i18n";
import { Recorder } from "./lib/recorder";
import {
  DEFAULT_SETTINGS,
  enforceRetention,
  loadSettings,
  openStore,
  saveSettings,
  type Store,
} from "./lib/store";
import type { Note, Settings } from "./types";

import { renderAccount } from "./views/account";
import { renderAsk } from "./views/ask";
import { renderHome } from "./views/home";
import { renderLibrary } from "./views/library";
import { renderNote } from "./views/note";
import { renderPrivacy } from "./views/privacy";
import { renderRecord } from "./views/record";

export interface App {
  settings: Settings;
  store: Store;
  /// The whole library, cached. Small enough to hold -- a transcript is
  /// kilobytes -- and re-reading IndexedDB on every render made the library
  /// list flicker.
  notes: Note[];
  /// Non-null while a recording is in progress, wherever the user has
  /// navigated to.
  recorder: Recorder | null;
  /// A meeting the detector extension has offered to record, waiting for the
  /// consent screen to accept or drop it. Null in every browser without the
  /// extension, which is most of them.
  handoff: Handoff | null;
  /// What happened at start-up that the user should know: notes expired, the
  /// store fell back to memory. Shown once, on the first view drawn.
  startupNotice: string | null;
  refresh(): Promise<void>;
  save(note: Note): Promise<void>;
  remove(id: string): Promise<void>;
  go(route: string): void;
  render(): void;
}

const routes: Record<string, (app: App, rest: string) => Node | Promise<Node>> = {
  "": renderHome,
  record: renderRecord,
  note: renderNote,
  library: renderLibrary,
  ask: renderAsk,
  privacy: renderPrivacy,
  account: renderAccount,
};

async function boot(): Promise<void> {
  const root = document.getElementById("app");
  if (!root) return;

  // Before anything is drawn: every view reads `t()` at render time, and a
  // view rendered before the locale is chosen would be English for one frame.
  setLocale(initialLocale());
  mount(root, el("main", el("p.muted", t("shell.starting"))));

  // Before the engine, which takes seconds: the extension may have opened this
  // tab specifically to hand a meeting over, and its message is posted at
  // document_start whether or not anything is listening yet.
  connectDetector();

  // The engine first: every view calls into it, and a view that renders before
  // the wasm module is instantiated throws from inside the generated glue with
  // a message naming nothing a reader could act on.
  await engine.load();

  const settings = loadSettings();
  const store = await openStore(settings.retention);
  const notices: string[] = [];
  if (!store.durable && settings.retention !== "session") {
    notices.push(t("shell.noticeStorage"));
  }
  const expired = await enforceRetention(store, settings.retention);
  if (expired > 0) {
    notices.push(t("shell.noticeExpired", { count: expired }));
  }

  const app: App = {
    settings,
    store,
    notes: await store.all(),
    recorder: null,
    handoff: null,
    startupNotice: notices.join(" ") || null,
    async refresh() {
      app.notes = await app.store.all();
    },
    async save(note) {
      note.updated = Date.now();
      await app.store.put(note);
      await app.refresh();
    },
    async remove(id) {
      await app.store.remove(id);
      await app.refresh();
    },
    go(route) {
      // Assigning the hash rather than calling render directly, so the back
      // button and a pasted link behave identically to a click.
      if (location.hash === route) void draw(app, root);
      else location.hash = route;
    },
    render() {
      void draw(app, root);
    },
  };

  // Settings are written back whenever a view changes them, and every view
  // mutates `app.settings` directly rather than threading a callback.
  const persist = () => saveSettings(app.settings);
  window.addEventListener("beforeunload", persist);
  window.addEventListener("pagehide", persist);
  // Also on a timer's worth of idleness, because `beforeunload` is not fired
  // for a tab a mobile browser discards in the background.
  setInterval(persist, 15_000);

  // A handover can arrive at any moment -- the user may have been reading
  // their library when they accepted the prompt in the meeting tab. It always
  // lands on the consent screen, never straight into a recording.
  onHandoff((handoff) => {
    if (!app.recorder?.active) app.handoff = handoff;
    app.go("#/record");
  });

  // The copy is for someone who has just arrived. Once they are in the
  // library or the account screen it goes -- still in the HTML for a
  // crawler, just not on screen underneath their notes.
  // Derived, never assumed. Setting it to "" at boot regardless of the hash
  // meant a deep link -- opennotetaker.app/#/record, which is what the hero
  // button and every shared link are -- loaded with the marketing copy drawn
  // over the app, and only corrected itself on a later hash *change*.
  const showRoute = () => {
    document.body.dataset.route = routeName(location.hash);
  };
  showRoute();
  window.addEventListener("hashchange", showRoute);
  window.addEventListener("hashchange", () => void draw(app, root));
  await draw(app, root);

  if (__OPENNOTETAKER_E2E__) {
    // The smoke test drives the engine and the store directly: the file picker
    // and the microphone permission prompt are browser UI and cannot be
    // automated from a page. Eliminated entirely from a shipped build.
    //
    // `transcribe` is here for its pure parts -- the language grid, the cut
    // finder, the text cleaner. Those decide whether a bilingual meeting comes
    // out in two languages or in confident nonsense, and testing them by
    // running a recogniser would mean downloading a model per run.
    const transcribe = await import("./lib/transcribe");
    const decode = await import("./lib/decode");
    const script = await import("./lib/script");
    (window as unknown as { __test: unknown }).__test = { app, engine, transcribe, decode, script };
  }
}

async function draw(app: App, root: HTMLElement): Promise<void> {
  // Routes are `#/name`. A bare `#anchor` links into the marketing copy
  // that now shares this document -- `#how`, `#pricing`, `#faq` -- and
  // without this the router reads those as route names, matches nothing
  // and redraws the app over the section the reader was going to.
  const raw = location.hash;
  const hash = raw.startsWith("#/") ? raw.slice(2) : "";
  const [name = "", ...rest] = hash.split("/");
  // Leaving the record screen answers the extension's offer with "no". Held
  // any longer, a meeting the user walked away from would arm the next
  // recording they started, hours later, with a dead stream id and the wrong
  // meeting's name.
  if (name !== "record") app.handoff = null;
  const view = routes[name] ?? routes[""]!;

  const body = el("div");
  const shell = el(
    "div.shell",
    app.recorder?.active ? recordingBar(app) : null,
    topbar(app, name),
    body,
    // No `siteFooter()` here any more. The app and the product page are one
    // document, and that document ends with the site's own footer below the
    // marketing copy -- two of them, one stacked inside the other, read as
    // the page ending twice.
  );
  mount(root, shell);

  try {
    mount(body, await view(app, rest.join("/")));
  } catch (error) {
    mount(
      body,
      el(
        "main",
        el("div.note.bad", (error as Error).message || t("shell.somethingWrong")),
        el("p", el("a", { href: "#/" }, t("shell.startAgain"))),
      ),
    );
  }

  if (app.startupNotice) {
    const notice = el("div.note.info", { style: "margin-bottom:1rem" }, app.startupNotice);
    body.querySelector("main")?.prepend(notice);
    app.startupNotice = null;
  }
  // A hash change scrolls nowhere by default when the target does not exist,
  // leaving the reader halfway down the previous view.
  window.scrollTo({ top: 0 });
}

/// The bar that says "this is recording", visible on every view.
function recordingBar(app: App): Node {
  return el(
    "div.recording-bar",
    { role: "status" },
    el("span.dot", { "aria-hidden": "true" }),
    el("span", app.recorder?.paused ? t("shell.paused") : t("shell.recording")),
    el("span.clock", { id: "bar-elapsed" }, "0:00"),
    el(
      "button.tiny",
      {
        style: "margin-inline-start:auto;background:rgba(255,255,255,.15);border-color:transparent;color:#fff",
        onclick: () => app.go("#/record"),
      },
      t("shell.goToRecorder"),
    ),
  );
}

function topbar(app: App, route: string): Node {
  const link = (href: string, name: string, label: string) =>
    el("a", { href, ...(route === name ? { "aria-current": "page" } : {}) }, label);

  return el(
    "header.topbar",
    el(
      "a.brand",
      { href: "#/" },
      logo(),
      el("span", t("app.name")),
    ),
    el(
      "nav.tabs",
      link("#/", "", t("nav.start")),
      link("#/library", "library", t("nav.library")),
      link("#/ask", "ask", t("nav.ask")),
      link("#/privacy", "privacy", t("nav.privacy")),
      link("#/account", "account", t("nav.account")),
      languagePicker(app),
    ),
  );
}

/// The language switch, in the header rather than buried in settings.
///
/// A reader who cannot read the interface cannot navigate to a settings page
/// to fix that, so the control has to be somewhere they can find without
/// reading anything: a fixed position, and every option written in its own
/// script. Changing it redraws the whole app, because `t()` is read at render
/// time and nothing caches a translated string.
function languagePicker(app: App): Node {
  const select = el(
    "select.lang",
    {
      "aria-label": t("nav.language"),
      onchange: (event: Event) => {
        setLocale((event.target as HTMLSelectElement).value as LocaleCode);
        app.render();
      },
    },
    ...LOCALES.map((locale) =>
      el("option", { value: locale.code, selected: locale.code === current().code }, locale.label),
    ),
  );
  return select;
}

function logo(): Node {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "22");
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML =
    '<rect width="32" height="32" rx="8" fill="var(--brand)"/>' +
    '<g fill="none" stroke="var(--brand-contrast)" stroke-width="2.4" stroke-linecap="round">' +
    '<path d="M10 11v10M16 8v16M22 13v6"/></g>';
  return svg;
}

/// Which route the address bar is on, or "" for the landing page.
///
/// Routes are `#/name`. A bare `#anchor` links into the marketing copy and is
/// not a route: reading those as route names matches nothing and would hide
/// the very copy the anchor points at.
export function routeName(hash: string): string {
  return hash.startsWith("#/") ? hash.slice(2).split("/")[0]! : "";
}


void boot();

export { DEFAULT_SETTINGS };
