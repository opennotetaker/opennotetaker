# What leaves your device

This page is the long form of the in-app privacy centre. Everything here is
checkable with a network panel, which is the point — the app's own smoke test
checks it on every build.

## Every host this application can contact

| Host | When | What is in the request |
|---|---|---|
| `huggingface.co` (and its CDN) | The first time you transcribe with a given model, and never again | Nothing of yours. It is a download: the weights come to you |
| the site itself | Loading the page, and ONNX Runtime's WebAssembly binary | Nothing of yours |
| `auth.opennotetaker.app` | When you open the Account page, and thereafter while signed in | Your sign-in method and your credit balance. No transcripts, ever |
| `gateway.opennotetaker.app` | Only when you press a button that shows a price | The text that button names, and nothing else |

**The meeting detector extension contacts nothing at all.** It has no network
code in it: it reads the URL of tabs on four meeting sites, draws a prompt, and
hands a tab to this app. It does not read page content, does not see audio, and
has no server to report to. Its whole source is four small files in
`apps/extension/src`, and `grep -r fetch` over them comes back empty.

There is no analytics script, no tag manager, no error reporter and no font
CDN. The fonts are served from this origin; so is ONNX Runtime's runtime
binary, specifically so that it is not a second, silent third party.

## Audio never goes anywhere

Not as an upload, not as a sample, not to improve a model. The three paid
routes take text — the transcript you already have and can read on screen.

That is a property of the wire format, not a policy. The request bodies have
no field for audio, the app shows you the exact body before it sends it, and
the gateway's test suite includes a case that smuggles base64 audio into an
extra field and asserts it never reaches the vendor.

## What is stored, and where

In your browser's own IndexedDB, on the device you recorded on. Nothing syncs.
There is no server-side copy to subpoena, breach or lose.

Retention is chosen in the Library and enforced on every load — not on a
timer, because a timer only fires while the tab is open, and a note could
otherwise outlive its policy by weeks simply because you did not visit.

The strongest setting, *until I close this tab*, uses a different store
entirely: an in-memory one that never writes to disk. "Deleted on close" and
"never written" are different promises, and only the second survives a browser
crash.

## Redaction before a paid request

On by default. Before a paid request is built — never after — the transcript is
scanned for email addresses, phone numbers, long digit runs and links, and
those are replaced with a placeholder. Your own copy is untouched.

This catches well-formed patterns and nothing else. A card number read out as
words ("four one one one, one one one one") defeats it entirely. It is a
sensible default for the one moment text leaves your machine, not a compliance
control, and the app says so in those words.

## Consent

Recording is gated on a one-step consent check that cannot be skipped. What was
agreed — when, by whom, by what method, and the exact wording that was on
screen — is stored with the recording and printed into every document export.

The disclosure text is copied into each record verbatim rather than referenced
by version, so that changing our wording later cannot retroactively rewrite
what somebody agreed to.

## What an account does not do

An account holds a sign-in method and a credit balance. It does not store your
recordings, your transcripts, your titles or your speakers' names, and signing
out does not remove anything from this device.
