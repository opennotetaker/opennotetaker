// The library: everything this app has ever recorded, on this device only.
//
// IndexedDB, because a meeting recording is tens of megabytes and
// `localStorage` is a five-megabyte string store. Nothing here syncs, and
// there is no server-side copy to fall back on -- which is the point, and also
// the obligation: if this is the only copy, then losing it is unforgivable and
// exporting must always work.
//
// # Retention is a feature, not a setting
//
// §10's third candidate tagline is "录什么、存多久，你说了算" -- you decide what
// is recorded and how long it is kept. A product that says that and then keeps
// everything for ever by default has not delivered it. So retention is chosen
// on first run, enforced on every load, and "delete everything" is one button
// that actually drops the database rather than marking rows.
//
// The `session` policy is the strongest of them: the library is held in memory
// and never written to disk at all.

import { t } from "./i18n";
import type { Note, Retention, Settings } from "../types";

const DATABASE = "opennotetaker";
const VERSION = 1;
const NOTES = "notes";
const SETTINGS_KEY = "opennotetaker.settings";

export const DEFAULT_SETTINGS: Settings = {
  // Ninety days rather than for ever. A default of "keep everything" is the
  // one a product picks when it benefits from the data; this one does not.
  retention: "90d",
  // Off by default. The transcript is what the product is for, and the audio
  // is the part that is sensitive, large, and rarely opened again. A user who
  // wants it can say so.
  keepAudio: false,
  redactBeforeSending: true,
  model: "onnx-community/whisper-base",
  language: "",
  secondLanguage: "",
  translateToEnglish: false,
  diarize: true,
};

/// A function, not a constant: the labels are re-read after a language change,
/// and a module-level array freezes whichever locale loaded first.
export function retentions(): { value: Retention; label: string; hint: string }[] {
  return [
    {
      value: "session",
      label: t("library.retention.session"),
      hint: t("library.retention.sessionHint"),
    },
    { value: "7d", label: t("library.retention.7d"), hint: "" },
    { value: "30d", label: t("library.retention.30d"), hint: "" },
    { value: "90d", label: t("library.retention.90d"), hint: t("library.retention.90dHint") },
    {
      value: "forever",
      label: t("library.retention.forever"),
      hint: t("library.retention.foreverHint"),
    },
  ];
}

function maxAgeMs(retention: Retention): number | null {
  switch (retention) {
    case "7d":
      return 7 * 86_400_000;
    case "30d":
      return 30 * 86_400_000;
    case "90d":
      return 90 * 86_400_000;
    default:
      return null;
  }
}

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(stored) as Partial<Settings>) };
  } catch {
    // A private window, cleared site data, or storage disabled entirely. The
    // app must work with defaults rather than fail to start.
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Nothing to do and nothing worth interrupting the user over; the settings
    // simply do not persist, which the privacy centre reports.
  }
}

/// What a store must do, independently of where it puts things.
///
/// Two implementations: one on IndexedDB, one purely in memory for the
/// `session` retention policy. Making them the same interface is what lets
/// "never write to disk" be a real guarantee rather than a flag that some code
/// path forgets to check.
export interface Store {
  readonly durable: boolean;
  all(): Promise<Note[]>;
  get(id: string): Promise<Note | null>;
  put(note: Note): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
  /// Approximate bytes held, for the privacy centre.
  size(): Promise<number>;
}

class MemoryStore implements Store {
  readonly durable = false;
  private readonly notes = new Map<string, Note>();

  async all(): Promise<Note[]> {
    return [...this.notes.values()].sort((a, b) => b.created - a.created);
  }
  async get(id: string): Promise<Note | null> {
    return this.notes.get(id) ?? null;
  }
  async put(note: Note): Promise<void> {
    this.notes.set(note.id, note);
  }
  async remove(id: string): Promise<void> {
    this.notes.delete(id);
  }
  async clear(): Promise<void> {
    this.notes.clear();
  }
  async size(): Promise<number> {
    let total = 0;
    for (const note of this.notes.values()) {
      total += note.audio?.size ?? 0;
      total += JSON.stringify(note.transcript).length;
    }
    return total;
  }
}

class IndexedStore implements Store {
  readonly durable = true;
  private opened: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    this.opened ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(NOTES)) {
          const store = db.createObjectStore(NOTES, { keyPath: "id" });
          store.createIndex("created", "created");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(t("error.libraryOpen")));
      // Firefox in private browsing rejects the open with no error at all.
      request.onblocked = () => reject(new Error(t("error.libraryBlocked")));
    });
    return this.opened;
  }

  private async transaction<T>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(NOTES, mode);
      const request = work(tx.objectStore(NOTES));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(t("error.libraryWrite")));
    });
  }

  async all(): Promise<Note[]> {
    const notes = await this.transaction<Note[]>("readonly", (store) => store.getAll());
    return notes.sort((a, b) => b.created - a.created);
  }
  async get(id: string): Promise<Note | null> {
    return (await this.transaction<Note | undefined>("readonly", (store) => store.get(id))) ?? null;
  }
  async put(note: Note): Promise<void> {
    await this.transaction("readwrite", (store) => store.put(note));
  }
  async remove(id: string): Promise<void> {
    await this.transaction("readwrite", (store) => store.delete(id));
  }
  async clear(): Promise<void> {
    await this.transaction("readwrite", (store) => store.clear());
  }
  async size(): Promise<number> {
    // The browser's own accounting where it has it, since it counts the
    // overhead an application cannot see; otherwise add up what we stored.
    const estimate = await navigator.storage?.estimate?.().catch(() => null);
    if (estimate?.usage) return estimate.usage;
    let total = 0;
    for (const note of await this.all()) {
      total += note.audio?.size ?? 0;
      total += JSON.stringify(note.transcript).length;
    }
    return total;
  }
}

/// Open the library appropriate to the retention policy.
///
/// A `session` policy gets a store that cannot write to disk, rather than a
/// disk store that is emptied later: "deleted on close" and "never written"
/// are different promises, and only the second survives a browser crash.
export async function openStore(retention: Retention): Promise<Store> {
  if (retention === "session" || typeof indexedDB === "undefined") {
    return new MemoryStore();
  }
  const store = new IndexedStore();
  try {
    await store.all();
    return store;
  } catch {
    // Private browsing, a disabled storage setting, or a quota refusal. Fall
    // back rather than fail: the app still works for this session, and the
    // privacy centre reports that nothing is being kept.
    return new MemoryStore();
  }
}

/// Drop anything past its retention date. Returns how many went.
///
/// Run on every load rather than on a timer: a timer only fires while the tab
/// is open, which for this app means a note could outlive its policy by weeks
/// simply because nobody visited.
export async function enforceRetention(store: Store, retention: Retention): Promise<number> {
  const maximum = maxAgeMs(retention);
  if (maximum === null) return 0;
  const cutoff = Date.now() - maximum;
  let removed = 0;
  for (const note of await store.all()) {
    if (note.created < cutoff) {
      await store.remove(note.id);
      removed += 1;
    }
  }
  return removed;
}

/// When a note will be deleted, or null if it will not.
export function expiresAt(note: Note, retention: Retention): number | null {
  const maximum = maxAgeMs(retention);
  return maximum === null ? null : note.created + maximum;
}

/// Everything, as one JSON file.
///
/// The escape hatch, and it exists because of the promise the rest of this
/// module makes: if this device is the only copy, a user must be able to take
/// it elsewhere at any moment without asking us. Audio is excluded -- it would
/// make the file gigabytes -- and each note's audio is downloadable on its own.
export function exportAll(notes: Note[]): string {
  return JSON.stringify(
    {
      app: "opennotetaker",
      version: 1,
      exported: new Date().toISOString(),
      note: t("library.exportFileNote"),
      notes: notes.map(({ audio: _audio, ...rest }) => rest),
    },
    null,
    2,
  );
}

/// Read back a file written by `exportAll`.
///
/// Ids are kept, so re-importing a file is idempotent rather than producing a
/// second copy of every meeting.
export function parseImport(text: string): Note[] {
  const parsed = JSON.parse(text) as { app?: string; notes?: unknown };
  if (parsed.app !== "opennotetaker" || !Array.isArray(parsed.notes)) {
    throw new Error(t("library.notAnExport"));
  }
  return (parsed.notes as Note[]).map((note) => ({
    ...note,
    audio: null,
    audioType: null,
  }));
}
