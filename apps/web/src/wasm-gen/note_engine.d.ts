/* tslint:disable */
/* eslint-disable */

/**
 * A BM25 index over one transcript or the whole library.
 *
 * Held across calls rather than rebuilt per query: a library of a hundred
 * meetings is tens of thousands of passages, and rebuilding that for every
 * keystroke would make search feel broken.
 */
export class Library {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Add one stored note.
     */
    addNote(note_id: string, transcript: string): void;
    /**
     * The passages a paid question would be answered from, already tagged and
     * titled -- so the interface can show exactly what will be sent before
     * anything is sent.
     */
    askPassages(question: string, titles: string): string;
    constructor();
    passageCount(): number;
    /**
     * The best matching passages, best first. Free, local, and the whole of
     * what most searches need.
     */
    search(query: string, limit: number): string;
}

/**
 * What a credit is worth and what a pack costs, read from the core rather
 * than written twice.
 */
export function creditPricing(): string;

/**
 * The languages whose action items, decisions and deadlines the free
 * summariser can actually find.
 *
 * Exposed so the interface can name them. Topics and key sentences work in
 * any language Whisper transcribes -- they are word frequency -- but cue
 * detection is phrase matching and is per-language. Finding no action items
 * in a Finnish meeting and letting the reader conclude their meeting had none
 * is indistinguishable from a correct empty result, which is why this is on
 * screen rather than in a changelog.
 */
export function cueLanguages(): string;

/**
 * Label every line with a speaker, from the audio it was transcribed from.
 *
 * `pcm` must be the same 16 kHz mono samples Whisper was given. It crosses as
 * a typed-array view rather than as JSON -- see the module doc.
 */
export function diarize(transcript: string, pcm: Float32Array, options: string): string;

/**
 * The default diarization settings, so the interface does not carry a second
 * copy of them that can drift from the core's.
 */
export function diarizeDefaults(): string;

/**
 * A clip's transcript, with the clock rebased to the start of the clip.
 */
export function excerptTranscript(transcript: string, from_ms: number, to_ms: number): string;

/**
 * Every format, with the label, extension and MIME type the download needs.
 */
export function exportFormats(): string;

export function exportTranscript(transcript: string, format: string, options: string): string;

export function formatClock(ms: number): string;

/**
 * Sort, clamp and de-overlap a transcript, and rebuild its speaker legend.
 */
export function normaliseTranscript(transcript: string): string;

export function parseClock(text: string): number | undefined;

export function quoteAsk(question: string, passages: string): string;

/**
 * What a generative summary of this transcript will cost.
 *
 * Computed here, from the same crate the gateway charges with, so the figure
 * on the button and the figure on the invoice cannot disagree.
 */
export function quoteSummary(rendered: string): string;

export function quoteTranslation(lines: string, target: string): string;

/**
 * Strip the obvious secrets from a transcript, and report what was found.
 *
 * Runs before a paid request is built, never after -- redacting the copy that
 * has already been sent would be theatre.
 */
export function redactTranscript(transcript: string, redactor: string): string;

/**
 * The redaction kinds, with the labels the interface shows.
 */
export function redactionKinds(): string;

/**
 * The transcript as the paid summariser will send it: attributed,
 * timestamped, turns merged.
 *
 * Exposed because the browser prices the job against exactly this string.
 */
export function renderForModel(transcript: string): string;

/**
 * Which line is playing at `at_ms`, or `null` before the first one starts.
 */
export function segmentAt(transcript: string, at_ms: number): number | undefined;

/**
 * Split the line playing at `at_ms` in two. Returns the new transcript and
 * the index of the second half, so the editor can put the caret there.
 */
export function splitSegment(transcript: string, at_ms: number): string;

/**
 * The free summary: topics, key points, actions, decisions and questions, all
 * picked out of the transcript on this machine.
 */
export function summariseLocally(transcript: string, options: string): string;

/**
 * How many requests a transcript this long will take.
 */
export function summaryChunks(rendered: string): number;

/**
 * Who held the floor for how long, most talkative first.
 */
export function talkTime(transcript: string): string;

/**
 * Build a transcript from Whisper's raw chunks.
 */
export function transcriptFromChunks(chunks: string, language: string | null | undefined, recorded: boolean): string;

/**
 * How translation is batched, so the interface can show progress against the
 * same batches the gateway will be asked for.
 */
export function translationBatchSize(): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_library_free: (a: number, b: number) => void;
    readonly creditPricing: (a: number) => void;
    readonly cueLanguages: (a: number) => void;
    readonly diarize: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly diarizeDefaults: (a: number) => void;
    readonly excerptTranscript: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly exportFormats: (a: number) => void;
    readonly exportTranscript: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly formatClock: (a: number, b: number) => void;
    readonly library_addNote: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly library_askPassages: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly library_new: () => number;
    readonly library_passageCount: (a: number) => number;
    readonly library_search: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly normaliseTranscript: (a: number, b: number, c: number) => void;
    readonly parseClock: (a: number, b: number, c: number) => void;
    readonly quoteAsk: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly quoteSummary: (a: number, b: number, c: number) => void;
    readonly quoteTranslation: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly redactTranscript: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly redactionKinds: (a: number) => void;
    readonly renderForModel: (a: number, b: number, c: number) => void;
    readonly segmentAt: (a: number, b: number, c: number, d: number) => void;
    readonly splitSegment: (a: number, b: number, c: number, d: number) => void;
    readonly summariseLocally: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly summaryChunks: (a: number, b: number) => number;
    readonly talkTime: (a: number, b: number, c: number) => void;
    readonly transcriptFromChunks: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly translationBatchSize: () => number;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export2: (a: number, b: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
