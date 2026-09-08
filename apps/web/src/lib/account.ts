// Sign-in, balance, and the three paid routes.
//
// Everything else this app does runs in the tab and costs nothing to serve, so
// there is nothing there to meter -- and a client-side "unlocked" check on
// local work would be a suggestion anyway, since the source is MIT and
// deleting the check is a recompile. What is chargeable is work performed with
// a vendor key we hold, which is exactly these three routes.
//
// # The price is not sent
//
// It is computed here for display and computed again by the gateway from the
// same Rust crate compiled natively. The two agree by construction rather than
// by trust, and a tab with an edited bundle cannot talk itself into a
// discount. If a request did carry a price, the gateway would ignore it.
//
// # Nothing but text crosses this boundary
//
// No audio, ever, on any of these routes. That is a property of the wire
// format rather than a promise, and the privacy centre says so with the
// request body on screen.

import type { OpenApps } from "@openapps/sdk";
// Importing the elements registers <openapps-login>, <openapps-buy> and the
// rest as custom elements. The import is a side effect, hence no bindings.
import "@openapps/ui";
import { configure, getClient, onChange } from "@openapps/ui";

import { t } from "./i18n";
import type { Answer, Citation, Summary } from "../types";

/// The accounts server and the paid-feature gateway.
///
/// Both are shared across every OpenApps product, and a user of this app
/// should never have to know that. Every request leaves for an
/// `opennotetaker.app` host, so nothing in this bundle, in a network panel or
/// in a redirect URL names the backend domain.
///
/// If you add a call, add it here. A hard-coded URL somewhere else is how the
/// masking springs a leak nobody notices until someone opens devtools.
export const AUTH_URL = "https://auth.opennotetaker.app";
export const API_URL = "https://gateway.opennotetaker.app";

/// The app id the ledger records this product's revenue under. Matches the key
/// issued as `OPENAPPS_KEY_OPENNOTETAKER` and the gateway's `APP_ID`.
export const APP_ID = "opennotetaker";

// Configured at module load rather than in a lifecycle hook: custom elements
// upgrade as soon as the browser parses them, which is before any of our code
// runs, and an <openapps-login> in the page header would otherwise come up and
// throw "no OpenApps client".
configure({ baseUrl: AUTH_URL });

export function account(): OpenApps {
  return getClient() ?? configure({ baseUrl: AUTH_URL });
}

/// "The session or the balance may have changed." Payload-free by design: a
/// sign-in through one element has to refresh a balance rendered by something
/// else, and neither should have to know the other exists.
export const onAccountChange = onChange;

export function signedIn(): boolean {
  return account().isLoggedIn;
}

export async function balance(signal?: AbortSignal): Promise<number> {
  if (!signedIn()) return 0;
  return account().credits.balance(signal);
}

function bearer(): string | null {
  return account().session?.accessToken ?? null;
}

export class NotSignedIn extends Error {
  constructor() {
    super(t("error.notSignedIn"));
    this.name = "NotSignedIn";
  }
}

export class InsufficientCredits extends Error {
  constructor(
    readonly need: number,
    readonly have: number,
  ) {
    super(t("error.insufficient", { need, have }));
    this.name = "InsufficientCredits";
  }
}

interface Charged {
  charged: number;
  new_balance: number;
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T & Charged> {
  const token = bearer();
  if (!token) throw new NotSignedIn();

  const response = await fetch(`${API_URL}/${APP_ID}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal,
  });

  const raw = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // A proxy error page is HTML, not JSON. Fall through to the status.
  }
  if (!response.ok) throw gatewayError(response.status, parsed);
  return parsed as T & Charged;
}

/// Turn a gateway failure into something with a next step in it.
///
/// Each of these has a different remedy -- sign in, buy credits, wait, use the
/// free version -- so collapsing them into "something went wrong" would leave a
/// user with nothing to do.
function gatewayError(status: number, body: Record<string, unknown>): Error {
  if (status === 401) return new NotSignedIn();
  if (status === 402) {
    return new InsufficientCredits(Number(body.need ?? 0), Number(body.have ?? 0));
  }
  if (status === 503 && body.error === "not_configured") return new Error(t("error.notConfigured"));
  if (body.error === "vendor_miscount") return new Error(t("error.miscount"));
  if (body.error === "empty_reply") return new Error(t("error.emptyReply"));
  if (status === 502) return new Error(t("error.unreachable"));
  if (status === 413) return new Error(t("error.tooLarge"));
  return new Error(t("error.status", { status }));
}

export interface SummaryResult {
  summary: Summary;
  charged: number;
  newBalance: number;
}

/// A generative summary, paid for in credits.
///
/// `idempotencyKey` identifies the job, not the attempt: retrying after a
/// dropped response must replay the same charge rather than bill twice.
export async function summariseOnBackend(
  transcript: string,
  instructions: string,
  language: string | null,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<SummaryResult> {
  const body = await post<{ summary: Summary }>(
    "summarise",
    { transcript, instructions, language, idempotency_key: idempotencyKey },
    signal,
  );
  return {
    summary: body.summary,
    charged: Number(body.charged ?? 0),
    newBalance: Number(body.new_balance ?? 0),
  };
}

export interface AskResult {
  answer: Answer;
  charged: number;
  newBalance: number;
}

export async function askOnBackend(
  question: string,
  passages: Citation[],
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<AskResult> {
  const body = await post<{ answer: Answer }>(
    "ask",
    { question, passages, idempotency_key: idempotencyKey },
    signal,
  );
  return {
    answer: body.answer,
    charged: Number(body.charged ?? 0),
    newBalance: Number(body.new_balance ?? 0),
  };
}

export interface TranslateResult {
  translations: string[];
  charged: number;
  newBalance: number;
}

export async function translateOnBackend(
  lines: string[],
  target: string,
  source: string | null,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<TranslateResult> {
  const body = await post<{ translations: string[] }>(
    "translate",
    { lines, target, source: source ?? "auto", idempotency_key: idempotencyKey },
    signal,
  );
  return {
    translations: body.translations ?? [],
    charged: Number(body.charged ?? 0),
    newBalance: Number(body.new_balance ?? 0),
  };
}

/// A stable id for one job.
///
/// Derived from what is being processed rather than from a random value, so a
/// retry after a dropped response produces the same key and replays the charge
/// instead of billing twice. A random UUID per attempt would defeat the
/// idempotency it looks like it provides.
export function jobKey(kind: string, ...material: string[]): string {
  let hash = 0x811c9dc5;
  const text = material.join(" ");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${APP_ID}-${kind}-${hash.toString(16)}-${text.length}`;
}
