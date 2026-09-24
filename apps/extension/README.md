# OpenNoteTaker — meeting detector

An optional browser extension that notices when you are in a **Google Meet,
Zoom, Microsoft Teams or VooV / 腾讯会议** call and offers to record it in
OpenNoteTaker.

It exists because of one browser rule: **a page cannot see another tab.** The
app itself can record a meeting perfectly well — you press record and pick the
tab — but it can never *notice* one. That takes an extension, and this is the
smallest one that does the job.

## What it does, exactly

1. Watches the URL of tabs on the four meeting platforms. Where the URL stops
   changing once you are in a call -- Teams for a signed-in user, VooV's web
   client -- it also watches the page for a leave-the-call button, in the
   languages those interfaces are shipped in (`src/leave.js`). Their
   interface follows the user's own language, not this extension's, so a
   guest joining a German meeting was invisible to an English word list
   (APP-165). A Teams invitation link is caught by its address instead, which
   reads the same in every language; the prompt then appears on the pre-join
   screen rather than once you are in.
2. Draws a prompt in the corner of the meeting: **record this meeting?**
3. If you accept, opens OpenNoteTaker and tells it which meeting it came
   from. When you press start, Chrome asks once which tab to share: pick the
   meeting tab. "Share tab audio" is already on in that dialog.
4. Leaves you on the consent screen. It never starts a recording by itself.

## What it does not do

- **It does not read pages.** The only thing it looks at is the URL, plus —
  on a meeting host only — whether a leave-call control exists. No page
  content is read, stored or sent.
- **It does not touch audio.** The recording happens in the app's tab, in the
  app's own code. The extension names the meeting and stops.
- **It talks to no server.** There is no telemetry and no network code in it
  at all; `grep -r fetch src/` comes back empty.
- **It cannot see native apps.** The Zoom, Teams and VooV *desktop*
  applications are not browser tabs, and nothing running in a browser can
  detect them. Join in the browser, or start the recording by hand.
- **Chrome and Edge only.** Firefox has no `chrome.tabCapture`, and Safari
  does not give a page tab audio at all. The app works in both without this.

## Install it (unpacked, while it is not in a store)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. **Load unpacked**, and choose this folder (`apps/extension`).
4. Click the extension's icon and set the address of your copy of the app —
   `https://opennotetaker.app/`, or `http://localhost:5182/` if you are
   running it yourself.

The toolbar icon lists every meeting tab you have open, with a **Record**
button on each — the same handover, for a meeting whose prompt you dismissed.

It does not skip Chrome's share picker, and neither does the prompt. An
earlier build tried, with a `chrome.tabCapture` stream id; Chrome issues one
only for a toolbar click and expires it within seconds, so by the time the
consent screen was read it had failed and the picker opened anyway (APP-124).

## Permissions, and why each one is needed

| Permission | Why |
|---|---|
| `tabs` | To read the URL of tabs, which is the whole detector, and to find or open the app's tab |
| `storage` | Two things: which sites you said "never ask" on, and where your copy of the app is |
| The four meeting hosts | To draw the prompt in the page |
| The app's own origin | To hand the meeting over to it |

## Tests

```
npm test -w opennotetaker-extension        # the URL rules, the manifest, the messages
npm run test:e2e -w opennotetaker-extension  # the whole path, in a real browser
```

The end-to-end test builds the web app, loads this extension unpacked, serves a
page *from `meet.google.com`* by intercepting the request, and then does what a
user does: waits for the prompt, presses Record, and checks that OpenNoteTaker
opens on the consent screen knowing which meeting it came from and with the
right source already ticked. It also checks that "never ask here" is obeyed.
