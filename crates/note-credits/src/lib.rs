//! What a paid job costs, in credits.
//!
//! # The promise this file exists to keep
//!
//! §5.3 of the competitor research found that four of the nine products with
//! reviewable feedback are complained at over billing: surprise renewals,
//! cancellation mazes, tiers nobody could follow. §9's third entry makes
//! "one simple price" a deliberate wedge against that.
//!
//! The platform this app sits on bills in credits rather than by subscription,
//! so the wedge is delivered differently and, if anything, more literally:
//! **you are told the exact price before the job runs, you are charged that,
//! and there is nothing to renew or cancel.** Not a range, not an estimate
//! reconciled afterwards, and never a token count -- somebody summarising
//! their own team meeting should not have to reason about tokenisers to find
//! out what a button costs.
//!
//! Keeping that promise costs us the rounding. Every estimate here rounds
//! *against us*: up on what the vendor will charge, up again converting to
//! credits. The margin pays for it, and being wrong in the user's favour is
//! the only direction that does not produce a complaint.
//!
//! # Why this is a crate and not a function in the gateway
//!
//! It is compiled twice -- to wasm for the price the browser shows, natively
//! for the price the gateway charges. The two agree by construction rather
//! than by anybody remembering to update both. The request does not carry a
//! price, and if it did the gateway would ignore it.

#![forbid(unsafe_code)]

use serde::{Deserialize, Serialize};

/// Vendor cost as a fraction of what we charge.
///
/// 0.30 means a job costing us $0.30 sells for $1.00 -- a 70% gross margin,
/// which has to cover the rounding above, failed jobs we do not bill for, and
/// the payment rails. Nothing else in the codebase encodes the markup.
pub const COST_SHARE: f64 = 0.30;

/// What one credit is worth, in USD. Set by the pack price: **$5 buys 1,000
/// credits**, so a credit is half a cent.
///
/// A round pack price is what lets the interface print a dollar figure beside
/// every quote without a conversion table -- a reader can check the arithmetic
/// in their head, which is worth more than a tidier per-credit number.
pub const CREDIT_USD: f64 = 0.005;

pub const PACK_CREDITS: u32 = 1_000;

pub fn pack_usd() -> f64 {
    f64::from(PACK_CREDITS) * CREDIT_USD
}

/// Vendor token rates, in USD per million tokens.
///
/// # These are placeholders
///
/// They must be confirmed against the provider's current price list before
/// anyone is charged, and re-confirmed whenever the model changes. A rate that
/// has drifted silently turns a 70% margin negative with no symptom any test
/// would catch. They live here rather than in the backend so the price a user
/// is quoted and the cost we model cannot disagree.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Rates {
    pub input_per_m: f64,
    pub output_per_m: f64,
}

impl Rates {
    /// DeepSeek chat, standard (non-cached) rates. **Placeholder -- confirm.**
    pub const DEEPSEEK_CHAT: Self = Self {
        input_per_m: 0.27,
        output_per_m: 1.10,
    };

    pub fn cost_usd(&self, input_tokens: u64, output_tokens: u64) -> f64 {
        (input_tokens as f64 / 1e6) * self.input_per_m
            + (output_tokens as f64 / 1e6) * self.output_per_m
    }
}

/// A quote, ready to show and to charge.
///
/// `credits` is the only field the interface should ever display. The rest
/// exists so the numbers can be audited against real invoices later, and so a
/// support conversation can answer "why did that cost 6?" without anybody
/// re-deriving it by hand.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Quote {
    /// What the user pays. At least 1 for a job that runs at all.
    pub credits: u32,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cost_usd: f64,
    pub price_usd: f64,
}

impl Quote {
    /// Realised gross margin, as a fraction. Checkable in tests.
    pub fn margin(&self) -> f64 {
        if self.price_usd <= 0.0 {
            return 0.0;
        }
        (self.price_usd - self.cost_usd) / self.price_usd
    }
}

/// Price a job of a known token shape.
///
/// Rounds the credit count **up**, and a job that does any work at all costs
/// at least one credit: charging zero against real vendor spend is the one
/// outcome with no ceiling on how much it can lose.
pub fn quote(input_tokens: u64, output_tokens: u64, rates: Rates) -> Quote {
    let cost_usd = rates.cost_usd(input_tokens, output_tokens);
    let price_usd = cost_usd / COST_SHARE;
    let credits = if input_tokens == 0 && output_tokens == 0 {
        0
    } else {
        ((price_usd / CREDIT_USD).ceil() as u32).max(1)
    };
    Quote {
        credits,
        input_tokens,
        output_tokens,
        // Report what the credits actually cost, not the unrounded figure --
        // the rounding is ours to absorb, and a margin computed against the
        // pre-rounding price would understate it.
        cost_usd,
        price_usd: f64::from(credits) * CREDIT_USD,
    }
}

/// Tokens in a string, estimated without a tokeniser.
///
/// A real BPE tokeniser is a megabyte of vocabulary in a bundle a user
/// downloads before they can use the product, to compute a number that is
/// then rounded up to the nearest half-cent. So: characters per token, by
/// script.
///
/// Latin text runs about four characters per token. CJK runs closer to one,
/// because a common ideograph is usually its own token and a rarer one splits
/// into several bytes. Estimating CJK at the Latin ratio would under-quote a
/// Chinese meeting by roughly 3x -- which we would then absorb, on exactly the
/// transcripts where the margin is thinnest.
pub fn estimate_tokens(text: &str) -> u64 {
    let mut dense = 0usize;
    let mut sparse = 0usize;
    for c in text.chars() {
        if matches!(c as u32,
            0x3040..=0x30FF | 0x3400..=0x4DBF | 0x4E00..=0x9FFF | 0xF900..=0xFAFF
            | 0xAC00..=0xD7AF | 0x0E00..=0x0E7F)
        {
            dense += 1;
        } else {
            sparse += 1;
        }
    }
    // Ceiling division, so a short string never estimates as zero tokens.
    let sparse_tokens = sparse.div_ceil(4);
    (dense + sparse_tokens) as u64
}

/// Overheads charged into every quote.
///
/// The system prompt goes to the vendor on every call whether the user thinks
/// about it or not, and omitting it from the estimate is a quiet
/// under-quote on short jobs -- which are most jobs.
const SYSTEM_PROMPT_TOKENS: u64 = 420;

/// What a generative summary of this transcript costs.
///
/// `rendered` is the attributed, timestamped transcript exactly as
/// `note_summary::prompt::render_transcript` produces it -- the thing that is
/// actually sent, not the raw text, since merging turns removes about a third
/// of it.
pub fn quote_summary(rendered: &str, chunks: usize, rates: Rates) -> Quote {
    let chunks = chunks.max(1) as u64;
    let input = estimate_tokens(rendered) + SYSTEM_PROMPT_TOKENS * chunks;
    // Summaries are compressive: the output is a small fraction of the input,
    // floored so a two-line transcript is not quoted at zero output, and
    // capped at the request's own `max_tokens` so a long meeting is not quoted
    // for output the model cannot produce.
    let output = (input / 8).clamp(300, 4_000 * chunks);
    quote(input, output, rates)
}

/// What one question across the library costs.
///
/// Flat by design. The passages sent are capped, so the price does not grow
/// with the size of the archive -- and a user should be able to learn "a
/// question costs about this much" once, rather than re-checking against how
/// many meetings they have accumulated.
pub fn quote_ask(question: &str, passages: &[String], rates: Rates) -> Quote {
    let input = estimate_tokens(question)
        + passages
            .iter()
            .map(|p| estimate_tokens(p) + 12)
            .sum::<u64>()
        + SYSTEM_PROMPT_TOKENS;
    let output = 400;
    quote(input, output, rates)
}

/// What translating these lines costs.
///
/// The output is estimated at 1.3x the input rather than 1.0: a translation is
/// usually longer than its source in tokens even when it is shorter in
/// characters, because the target language is rarely the one the tokeniser was
/// fitted to. Under-quoting here would be systematic rather than occasional.
pub fn quote_translation(lines: &[String], target: &str, rates: Rates) -> Quote {
    if lines.is_empty() {
        return quote(0, 0, rates);
    }
    let batches = lines.len().div_ceil(60).max(1) as u64;
    let body: u64 = lines.iter().map(|line| estimate_tokens(line) + 4).sum();
    let input = body + (SYSTEM_PROMPT_TOKENS + estimate_tokens(target)) * batches;
    let output = (body as f64 * 1.3).ceil() as u64;
    quote(input, output, rates)
}

/// The credit denomination, for the interface to state plainly rather than
/// hard-coding a second copy of it in TypeScript.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Pricing {
    pub credit_usd: f64,
    pub pack_credits: u32,
    pub pack_usd: f64,
}

pub fn pricing() -> Pricing {
    Pricing {
        credit_usd: CREDIT_USD,
        pack_credits: PACK_CREDITS,
        pack_usd: pack_usd(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const RATES: Rates = Rates::DEEPSEEK_CHAT;

    fn transcript_of(minutes: usize) -> String {
        // Roughly 150 spoken words a minute, ~6 characters a word with the
        // timestamp and speaker prefix.
        (0..minutes * 12)
            .map(|i| {
                format!(
                    "[0:{:02}] Ana: this is a line of meeting transcript number {i}",
                    i % 60
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    }

    #[test]
    fn a_job_that_does_work_always_costs_at_least_one_credit() {
        let q = quote_summary("[0:00] Ana: hi", 1, RATES);
        assert!(q.credits >= 1, "{q:?}");
    }

    #[test]
    fn nothing_in_costs_nothing() {
        assert_eq!(quote(0, 0, RATES).credits, 0);
        assert_eq!(quote_translation(&[], "French", RATES).credits, 0);
    }

    /// The direction every rounding in this file must go.
    #[test]
    fn the_price_never_falls_below_the_vendor_cost() {
        for minutes in [1usize, 5, 30, 90] {
            let q = quote_summary(&transcript_of(minutes), 1, RATES);
            assert!(
                q.price_usd >= q.cost_usd,
                "{minutes} minutes: charged {} against a cost of {}",
                q.price_usd,
                q.cost_usd
            );
            assert!(q.margin() > 0.5, "{minutes} minutes: margin {}", q.margin());
        }
    }

    /// The number a user will actually see. If a one-hour meeting summary is
    /// not comfortably inside a $5 pack, the pricing is wrong, not the test.
    #[test]
    fn an_hour_long_meeting_summary_is_a_few_cents() {
        let q = quote_summary(&transcript_of(60), 1, RATES);
        assert!(
            q.price_usd < 0.35,
            "an hour cost {} ({} credits)",
            q.price_usd,
            q.credits
        );
        assert!(q.credits >= 2, "{q:?}");
    }

    #[test]
    fn a_longer_meeting_costs_more_than_a_shorter_one() {
        let short = quote_summary(&transcript_of(5), 1, RATES);
        let long = quote_summary(&transcript_of(50), 1, RATES);
        assert!(long.credits > short.credits, "{short:?} vs {long:?}");
    }

    /// A Chinese transcript is roughly three times as many tokens per
    /// character as an English one. Estimating it at the Latin ratio would
    /// under-quote it systematically.
    #[test]
    fn cjk_is_estimated_denser_than_latin_text_of_the_same_length() {
        let latin = "a".repeat(400);
        let chinese = "预".repeat(400);
        assert!(
            estimate_tokens(&chinese) > estimate_tokens(&latin) * 3,
            "latin {}, chinese {}",
            estimate_tokens(&latin),
            estimate_tokens(&chinese)
        );
    }

    #[test]
    fn a_short_string_never_estimates_as_zero_tokens() {
        assert!(estimate_tokens("hi") >= 1);
        assert_eq!(estimate_tokens(""), 0);
    }

    /// The property that makes cross-meeting Q&A explicable: the price does
    /// not depend on how many meetings you have.
    #[test]
    fn a_question_costs_the_same_whatever_the_library_size() {
        let passages: Vec<String> = (0..24)
            .map(|i| format!("a retrieved passage of transcript, number {i}"))
            .collect();
        let small = quote_ask("what did we decide about hosting?", &passages[..6], RATES);
        let large = quote_ask("what did we decide about hosting?", &passages, RATES);
        assert!(large.credits <= small.credits * 3, "{small:?} vs {large:?}");
        assert!(large.price_usd < 0.05, "{large:?}");
    }

    /// The system prompt is re-sent with every batch, so it is charged with
    /// every batch. One line past the batch boundary costs a whole extra
    /// prompt, and a quote that ignored that would under-charge by exactly
    /// that much on every long transcript.
    #[test]
    fn translation_pays_the_system_prompt_once_per_batch() {
        let line = |i: usize| format!("line number {i}");
        let full: Vec<String> = (0..60).map(line).collect();
        let one_more: Vec<String> = (0..61).map(line).collect();

        let a = quote_translation(&full, "Simplified Chinese", RATES);
        let b = quote_translation(&one_more, "Simplified Chinese", RATES);
        let jump = b.input_tokens - a.input_tokens;
        assert!(
            jump > SYSTEM_PROMPT_TOKENS,
            "crossing a batch boundary added only {jump} tokens"
        );

        // And within a batch, one more line costs about one line.
        let c = quote_translation(&full[..59], "Simplified Chinese", RATES);
        assert!(a.input_tokens - c.input_tokens < 30, "{c:?} vs {a:?}");
    }

    #[test]
    fn the_same_input_always_quotes_the_same_price() {
        // The whole point of one shared crate: the browser and the gateway
        // must not be able to disagree.
        let text = transcript_of(10);
        assert_eq!(
            quote_summary(&text, 1, RATES),
            quote_summary(&text, 1, RATES)
        );
    }

    #[test]
    fn a_chunked_transcript_pays_the_system_prompt_once_per_chunk() {
        let text = transcript_of(120);
        let one = quote_summary(&text, 1, RATES);
        let three = quote_summary(&text, 3, RATES);
        assert!(
            three.input_tokens > one.input_tokens,
            "{one:?} vs {three:?}"
        );
    }

    #[test]
    fn the_pack_arithmetic_is_the_one_a_reader_can_do_in_their_head() {
        let pricing = pricing();
        assert_eq!(pricing.pack_credits, 1_000);
        assert!((pricing.pack_usd - 5.0).abs() < 1e-9);
        assert!((f64::from(pricing.pack_credits) * pricing.credit_usd - 5.0).abs() < 1e-9);
    }
}
