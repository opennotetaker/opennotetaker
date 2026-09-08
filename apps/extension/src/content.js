// The prompt, drawn on the meeting page.
//
// # Why a banner in the page and not a Chrome notification
//
// A notification arrives in the corner of the screen while the user is looking
// at a call they have just joined, and it is dismissed by reflex. The question
// "shall I record this?" belongs next to the thing being recorded. It is also
// the last honest moment to ask: the app's consent screen comes next, and it
// is easier to read a sentence about telling people they are being recorded
// while still looking at the people.
//
// # Why a shadow root
//
// Meet, Teams and VooV all ship aggressive global CSS, and two of the three
// re-render the document body constantly. A shadow root inside a fixed
// container is the only way to draw something that survives both without
// styling the host page by accident.
//
// It is open rather than closed. Closed would keep the host page's scripts out
// of it, which sounds like the safer default until you notice what is actually
// inside: three buttons and a sentence, no secret, nothing a page could not
// simply draw itself. What closed does buy is a prompt that the end-to-end
// test cannot click, and an untested prompt on four sites that redesign
// themselves without warning is the larger risk by a distance.
//
// # "maybe", and the leave button
//
// For a URL that only says "you are on Teams", the page decides. The signal is
// a control that leaves or hangs up a call, matched by accessible name in the
// languages this product ships in -- an element that exists in every one of
// these products, in every layout they have shipped, and in no lobby.

const LEAVE =
  /\b(leave|hang ?up|end call|end meeting|disconnect)\b|離開|离开|挂断|掛斷|结束会议|結束會議|退出会议|退出會議/i;

let shown = false;
let observer = null;

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type !== "opennotetaker:detected") return false;
  if (shown) {
    respond({ ok: true });
    return true;
  }
  if (message.confidence === "room") show(message);
  else watchForCall(message);
  respond({ ok: true });
  return true;
});

// A single page application navigates without a load, so the service worker's
// tab listener may never fire for the URL that matters. Saying hello on start
// and again on a URL change covers both.
function hello() {
  chrome.runtime.sendMessage({ type: "opennotetaker:hello", url: location.href }).catch(() => undefined);
}
hello();

let lastHref = location.href;
setInterval(() => {
  if (location.href === lastHref) return;
  lastHref = location.href;
  shown = false;
  document.getElementById("opennotetaker-prompt")?.remove();
  hello();
}, 1500);

function watchForCall(message) {
  observer?.disconnect();
  const look = () => {
    if (shown) return;
    if (!inCall()) return;
    observer?.disconnect();
    show(message);
  };
  look();
  observer = new MutationObserver(look);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  // Give up after ten minutes of a Teams tab that is only ever chat, rather
  // than holding a subtree observer on it until the tab closes.
  setTimeout(() => observer?.disconnect(), 600_000);
}

function inCall() {
  for (const node of document.querySelectorAll("button, [role='button'], a[role='button']")) {
    const name = `${node.getAttribute("aria-label") ?? ""} ${node.getAttribute("title") ?? ""} ${
      node.getAttribute("data-tid") ?? ""
    } ${node.textContent?.slice(0, 40) ?? ""}`;
    if (LEAVE.test(name)) return true;
  }
  return false;
}

// ------------------------------------------------------------------- the UI

function show(message) {
  if (shown || document.getElementById("opennotetaker-prompt")) return;
  shown = true;

  const host = document.createElement("div");
  host.id = "opennotetaker-prompt";
  host.style.cssText =
    "position:fixed;inset-block-start:16px;inset-inline-end:16px;z-index:2147483647;";
  const root = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .card {
      font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #10131a; background: #fff; width: 320px; padding: 14px 16px;
      border: 1px solid #d9dde5; border-radius: 12px;
      box-shadow: 0 12px 32px rgba(16,19,26,.18);
    }
    .title { font-weight: 600; margin: 0 0 2px; display: flex; gap: 8px; align-items: center; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #d64545; flex: none; }
    p { margin: 0 0 12px; color: #4a5261; }
    .row { display: flex; gap: 8px; align-items: center; }
    button {
      font: inherit; border-radius: 8px; padding: 7px 12px; cursor: pointer;
      border: 1px solid #d9dde5; background: #fff; color: #10131a;
    }
    button:hover { background: #f4f6f9; }
    button.primary { background: #10131a; border-color: #10131a; color: #fff; }
    button.primary:hover { background: #262c38; }
    button.quiet { border-color: transparent; color: #6b7280; padding-inline: 6px; }
    .never { margin: 10px 0 0; font-size: 12px; }
    @media (prefers-color-scheme: dark) {
      .card { background: #171a21; color: #eef1f6; border-color: #2b303b; }
      p { color: #a8b0bf; }
      button { background: #1f232c; color: #eef1f6; border-color: #333a47; }
      button:hover { background: #262c38; }
      button.primary { background: #eef1f6; color: #10131a; border-color: #eef1f6; }
      button.quiet { color: #8b94a5; border-color: transparent; background: none; }
    }
  `;

  const card = document.createElement("div");
  card.className = "card";

  const title = document.createElement("p");
  title.className = "title";
  const dot = document.createElement("span");
  dot.className = "dot";
  title.append(dot, document.createTextNode(text("promptTitle", message.platform)));

  const body = document.createElement("p");
  body.textContent = text("promptBody");

  const record = button(text("promptRecord"), "primary", () => {
    chrome.runtime
      .sendMessage({ type: "opennotetaker:record", platform: message.platform, title: document.title })
      .catch(() => undefined);
    close();
  });
  const later = button(text("promptLater"), "quiet", close);

  const never = document.createElement("div");
  never.className = "never";
  never.append(
    button(text("promptNever", message.host), "quiet", () => {
      chrome.runtime
        .sendMessage({ type: "opennotetaker:silence", host: message.host })
        .catch(() => undefined);
      close();
    }),
  );

  const row = document.createElement("div");
  row.className = "row";
  row.append(record, later);

  card.append(title, body, row, never);
  root.append(style, card);
  document.documentElement.append(host);

  function close() {
    host.remove();
  }
}

function button(label, className, onclick) {
  const node = document.createElement("button");
  node.className = className;
  node.textContent = label;
  node.addEventListener("click", onclick);
  return node;
}

function text(key, substitution) {
  const value = chrome.i18n.getMessage(key, substitution ? [substitution] : undefined);
  return value || key;
}
