// The leave-button word list, against the labels these products actually show.
//
// This is the fallback path: where the URL names a meeting, the extension
// never asks the page. It carries Teams for a signed-in user, whose address
// bar says `/v2/` from the first ring to the last, and VooV's web client —
// and those interfaces speak the *user's* language, not the extension's. A
// German guest got no prompt at all because the list was English and Chinese
// only (APP-165).
//
// The negative half matters more than the positive half: "Team verlassen" is
// leaving a team, "Desligar câmera" is turning the camera off, and neither is
// leaving a call. Prompting on the chat page is how an extension gets
// uninstalled.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));

// A content script, not a module: it is loaded the way Chrome loads it, with
// a `self` to hang the function on.
const sandbox = { self: {} };
runInNewContext(readFileSync(join(here, "../src/leave.js"), "utf8"), sandbox);
const leaving = sandbox.self.opennotetakerLooksLikeLeaving;

/// Labels measured on, or matching, the real controls.
const LEAVING = [
  // Teams, the guest and signed-in clients. "Verlassen" is what the reporter
  // read off the German button: no aria-label, no data-tid, just this.
  ["Leave", "Teams, English"],
  ["Verlassen", "Teams, German"],
  ["Anruf beenden", "Teams, German, hang up"],
  ["Besprechung verlassen", "Teams, German, longer form"],
  ["Salir", "Teams, Spanish"],
  ["Finalizar llamada", "Teams, Spanish, hang up"],
  ["Sair", "Teams, Portuguese"],
  ["Encerrar chamada", "Teams, Portuguese, hang up"],
  ["Quitter", "Teams, French"],
  ["Raccrocher", "Teams, French, hang up"],
  ["退出", "Teams, Japanese"],
  ["通話を終了", "Teams, Japanese, hang up"],
  ["나가기", "Teams, Korean"],
  ["통화 종료", "Teams, Korean, hang up"],
  // Google Meet and Zoom, which the URL already catches — kept so a change
  // here cannot quietly break the platforms that also rely on this.
  ["Leave call", "Meet, English"],
  ["Leave Meeting", "Zoom, English"],
  ["hangup-button", "a data-tid rather than a word"],
  ["End call", "English, hang up"],
  // VooV / 腾讯会议, whose web client is on this path too.
  ["离开会议", "VooV, Simplified"],
  ["结束会议", "VooV, Simplified, end"],
  ["挂断", "VooV, Simplified, hang up"],
  ["離開會議", "VooV, Traditional"],
  ["離開", "VooV, Traditional, on its own"],
];

/// Labels that are on these pages and are not leaving a call.
const STAYING = [
  ["Team verlassen", "German: leaving a team, on the chat page"],
  ["Desligar câmera", "Portuguese: turning the camera off"],
  ["Desligar o microfone", "Portuguese: muting"],
  ["Stummschalten", "German: mute"],
  ["Besprechung planen", "German: schedule a meeting"],
  ["Salir de la cuenta", "Spanish: signing out"],
  ["Quitter l'équipe", "French: leaving a team"],
  ["Leave team", "English: leaving a team"],
  ["Leave feedback", "English: the feedback button"],
  ["Join", "English: the join button"],
  ["退出团队", "Simplified: leaving a team"],
  ["Chat", "a tab"],
  ["", "no label at all"],
];

test("a leave-the-call control is recognised in every interface language", () => {
  for (const [label, why] of LEAVING) {
    assert.equal(leaving(label), true, `${why}: ${label}`);
  }
});

test("a word that merely contains one is not", () => {
  for (const [label, why] of STAYING) {
    assert.equal(leaving(label), false, `${why}: ${label}`);
  }
});

test("case and stray whitespace do not decide it", () => {
  for (const label of ["  VERLASSEN ", "\nleave call\t", " 통화 종료 "]) {
    assert.equal(leaving(label), true, label);
  }
});

test("a missing label is not a call", () => {
  for (const label of [null, undefined]) {
    assert.equal(leaving(label), false, String(label));
  }
});
