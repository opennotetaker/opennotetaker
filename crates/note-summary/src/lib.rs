//! The two summarisers, and the one shape they both fill.
//!
//! [`local`] is free and runs in the tab. [`prompt`] is the request the paid
//! generative summariser sends and the parser for what comes back -- shared
//! between the browser (which quotes the price) and the gateway (which makes
//! the call), so the two can never describe different jobs.

#![forbid(unsafe_code)]

pub mod ask;
pub mod local;
pub mod prompt;
pub mod text;
pub mod translate;

pub use local::summarise;
pub use prompt::{build_summary_request, parse_summary, ParseError, SummaryRequest};
