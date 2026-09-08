//! What a summary *is*, independent of who produced it.
//!
//! Two very different things fill this structure: the free extractive
//! summariser in `note-summary`, which runs in the tab and picks sentences
//! that are already there, and the paid generative one behind the gateway,
//! which writes new sentences with a model.
//!
//! They share a shape on purpose. The export formats, the library and the
//! interface all handle "a summary" once, so upgrading from the free tier to
//! the paid one changes the *contents* of the panel and nothing else -- no
//! second layout, no second exporter, and no way for the two to drift into
//! looking like different features.
//!
//! [`Summary::origin`] is the one field that distinguishes them, and it
//! exists so the interface can always say which one a user is looking at.
//! A generated summary presented as though it were extracted -- or the
//! reverse -- would be exactly the kind of quiet ambiguity this product is
//! positioned against.

use serde::{Deserialize, Serialize};

/// Which tier produced a summary.
///
/// This is the one field that distinguishes them, and it exists so the
/// interface can always say which one a user is looking at -- and so renderers
/// can pick the right heading. Extraction finds sentences that *are*
/// questions but cannot know whether one was answered thirty seconds later,
/// so it gets "Questions asked" where a written summary, which is asked
/// specifically for unanswered ones, earns "Open questions". Those strings
/// live in `note_export::Labels` rather than here, because they also have to
/// be translatable and this crate holds no English.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Origin {
    /// Picked out of the transcript on this machine, for free.
    #[default]
    Extracted,
    /// Written by a model, paid for in credits.
    Generated,
}

/// The countable facts about a transcript, for an extracted summary's header.
///
/// Structured rather than a finished sentence, because that sentence has to be
/// written in the reader's language and this crate has no business knowing
/// which one that is. The extractive summariser fills this and leaves
/// [`Summary::overview`] empty; the generative one writes prose into
/// `overview` and leaves this `None`. Every renderer handles both.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct SummaryStats {
    pub sentences: usize,
    /// Rounded up, and never zero -- "about 0 minutes" reads as a bug.
    pub minutes: i64,
    pub speakers: usize,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Summary {
    #[serde(default)]
    pub origin: Origin,
    /// Prose, from the generative summariser. Empty for an extracted summary,
    /// which reports [`Summary::stats`] instead.
    #[serde(default)]
    pub overview: String,
    /// Counts, from the extractive summariser. `None` for a written one.
    #[serde(default)]
    pub stats: Option<SummaryStats>,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default)]
    pub key_points: Vec<String>,
    #[serde(default)]
    pub decisions: Vec<String>,
    #[serde(default)]
    pub action_items: Vec<ActionItem>,
    #[serde(default)]
    pub questions: Vec<String>,
}

impl Summary {
    pub fn is_empty(&self) -> bool {
        self.overview.trim().is_empty()
            && self.stats.is_none()
            && self.keywords.is_empty()
            && self.key_points.is_empty()
            && self.decisions.is_empty()
            && self.action_items.is_empty()
            && self.questions.is_empty()
    }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ActionItem {
    pub text: String,
    #[serde(default)]
    pub owner: Option<String>,
    #[serde(default)]
    pub due: Option<String>,
    /// Where in the recording this came from, so a reader can check it.
    ///
    /// A summary you cannot verify against the audio is one you have to take
    /// on faith, which is the opposite of this product's argument. The
    /// extractive summariser always knows this; the generative one is asked
    /// for it and is not always right, which is why it is an `Option` rather
    /// than a promise.
    #[serde(default)]
    pub at_ms: Option<i64>,
}
