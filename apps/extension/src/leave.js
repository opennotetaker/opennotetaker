// Does this label mean "leave the call"?
//
// Its own file because it is a table, and a table wants a test: the languages
// below are the ones the products' own interfaces speak, and nobody re-checks
// a word list that can only be exercised by joining a call in German. See
// test/leave.test.mjs.
//
// A content script, not a module -- MV3 loads these as plain scripts -- so it
// hands `content.js` a single function on `self`.

/// Leaving a call, in the eight languages this product ships and in French.
///
/// Two lists, because a word is not always safe on its own. Teams' German
/// hang-up button is labelled exactly "Verlassen", and the same word sits
/// inside "Team verlassen" on the chat page -- leaving a *team*, which must
/// never prompt. So a bare word has to *be* the whole label, while a phrase
/// that can only mean ending a call is matched anywhere inside one.
///
/// This is the fallback, not the main path: where the URL names a meeting the
/// extension never gets here. It is what covers Teams v2 for a signed-in user
/// and VooV's web client, whose URLs keep their own counsel (APP-165).
const LEAVE_PHRASES =
  /leave (the )?(call|meeting)|hang ?up|end (the )?(call|meeting)|disconnect|挂断|掛斷|结束会议|結束會議|退出会议|退出會議|离开会议|離開會議|anruf beenden|(besprechung|meeting) verlassen|finalizar (la )?llamada|salir de la (reunión|llamada)|encerrar (a )?chamada|sair da reunião|terminer l'appel|quitter la réunion|raccrocher|通話を終了|通話終了|会議から退出|통화 종료|회의 나가기/i;

/// Labels that mean "leave the call" when they are the whole label.
const LEAVE_WORDS = new Set([
  "leave",
  "verlassen",
  "auflegen",
  "salir",
  "colgar",
  "sair",
  "desligar",
  "quitter",
  "raccrocher",
  "退出",
  "退室",
  "離開",
  "离开",
  "挂断",
  "掛斷",
  "나가기",
  "종료",
]);

/// True when `label` is a leave-the-call control's name.
///
/// One name at a time, never several joined together: a bare word has to *be*
/// the whole label, and concatenating a title with a text node would invent
/// "Team verlassen" out of two harmless halves.
function looksLikeLeaving(label) {
  const name = (label ?? "").trim().toLowerCase();
  if (!name) return false;
  return LEAVE_WORDS.has(name) || LEAVE_PHRASES.test(name);
}

self.opennotetakerLooksLikeLeaving = looksLikeLeaving;
