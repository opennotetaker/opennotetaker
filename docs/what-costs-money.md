# The free/paid line, and where the prices come from

## The rule

**If it runs on your hardware, it is free. If it is a bill we pay a model
vendor, it costs credits.**

That is not a positioning choice, it is arithmetic. Transcription, speaker
separation, search, exports and the extracted summary consume our electricity
in exactly zero quantity. Charging for them would be charging for the login —
and since the source is MIT, a client-side "unlocked" check is a suggestion
anyway: deleting it is a recompile.

| | Costs us nothing | Costs us money |
|---|---|---|
| Transcription (Whisper, in your tab) | ✓ | |
| Timeline, speakers, search, exports | ✓ | |
| Recording without a bot | ✓ | |
| The summary picked out of what was said | ✓ | |
| Translating into English while transcribing | ✓ | |
| AI-written minutes and action items | | ✓ |
| Answering a question across your library | | ✓ |
| Translating a transcript into any language | | ✓ |

The competitor research found this line drawn in exactly the same place by the
market: nine of the eleven products that have generative summarisation put it
behind a paywall, and it was the most-cited reason people pay.

## The one deviation from the research, and why

The research recommended **$8–15 a month** and warned against per-use pricing
as a cognitive burden. OpenApps has no subscription rail — accounts are
credit-based, $5 for 1,000 credits.

Rather than build a second billing system, this app uses credits and delivers
the underlying goal more literally than a subscription would. The complaint the
research actually found — four of nine competitors with reviewable feedback are
complained at over billing, with "was charged after I thought I cancelled" as
the representative quote — is about *surprise*. Here:

- every paid job shows its exact price before you commit;
- nothing renews, so there is nothing to cancel;
- a failed job charges nothing;
- credits do not expire.

The research's objection to per-use pricing is a cognitive-load objection, and
the answer to cognitive load is one number on the button — not a billing
period.

## Where a price comes from

`crates/note-credits` and nowhere else. It is compiled twice: to WebAssembly
for the figure the browser shows, and natively into `openapps-gateway` for the
figure it charges. The request carries no price, and the gateway would ignore
one if it did.

The margin lives in one constant:

```rust
pub const COST_SHARE: f64 = 0.30;   // a $0.30 vendor bill sells for $1.00
pub const CREDIT_USD:  f64 = 0.005; // $5 buys 1,000 credits
```

Every estimate rounds **against us** — up on what the vendor will charge, up
again converting to credits — because the promise is that the quoted price is
the charged price, and we absorb the difference. Being wrong in the user's
favour is the only direction that does not produce a complaint.

> **The vendor token rates in `Rates` are placeholders.** They must be
> confirmed against the provider's current price list before anyone is charged,
> and re-confirmed when the model changes. A rate that has drifted silently
> turns a 70% margin negative with no symptom any test would catch.

## Typical prices

| Job | About |
|---|---|
| AI minutes, 30-minute meeting | 3 credits — $0.015 |
| AI minutes, 60-minute meeting | 4 credits — $0.020 |
| One question across your library | 1 credit — $0.005 |

Those are computed from `note_credits` at the placeholder rates below, for a
transcript of roughly 150 spoken words a minute. They will move when the rates
do, which is why the Account page derives its table from the same functions
rather than hard-coding it.

A question costs the same whether you have five meetings or five hundred: the
number of passages sent is capped, not proportional. That is deliberate, so
that "what a question costs" is something you learn once.

The exact price for your actual transcript is on the button, computed from the
same code that does the charging.

## Charging order

```rust
credits.ensure_affordable(&token, cost).await?;   // a read, not a GPU minute
let output = call_the_vendor().await?;            // the work
credits.charge(APP_ID, &token, cost, reason, &job_id).await?;
```

After, never before. There is no app-facing refund in the ledger — reversing
needs an operator adjustment — so charging first would leave a user out of
pocket for a job that failed on our side. Charging last means our worst case is
one unbilled summary, which is the cheaper mistake and the one that needs no
apology.

The idempotency key identifies the *job*, not the attempt, so a retry after a
dropped response bills once.
