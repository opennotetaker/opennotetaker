//! Clock formatting, in the three spellings this product needs.
//!
//! SRT and WebVTT disagree about the decimal separator and about whether the
//! hour field may be dropped, and a player is entitled to reject a file that
//! gets it wrong. Both are written here rather than in the exporters so that
//! "the timestamp format" is one thing with one set of tests.

/// `01:23:45,678` -- SRT, comma separator, hours always present.
pub fn format_srt(ms: i64) -> String {
    let (h, m, s, milli) = parts(ms);
    format!("{h:02}:{m:02}:{s:02},{milli:03}")
}

/// `01:23:45.678` -- WebVTT, full stop separator.
///
/// WebVTT permits `mm:ss.mmm` too, but always writing the hour keeps cues
/// column-aligned in a text editor and is never wrong.
pub fn format_vtt(ms: i64) -> String {
    let (h, m, s, milli) = parts(ms);
    format!("{h:02}:{m:02}:{s:02}.{milli:03}")
}

/// `1:23:45` or `23:45` -- for reading, not for parsing.
///
/// The hour is dropped under an hour because a 4-minute voice note showing
/// `00:04:12` reads as a fragment of something longer.
pub fn format_clock(ms: i64) -> String {
    let (h, m, s, _) = parts(ms);
    if h > 0 {
        format!("{h}:{m:02}:{s:02}")
    } else {
        format!("{m}:{s:02}")
    }
}

/// Read back any of the three spellings above, plus bare seconds.
///
/// Needed because a user may type a time into the clip range box, and
/// because re-importing an exported file should be lossless.
pub fn parse_clock(text: &str) -> Option<i64> {
    let text = text.trim().replace(',', ".");
    if text.is_empty() {
        return None;
    }
    let mut total_ms: i64 = 0;
    let fields: Vec<&str> = text.split(':').collect();
    if fields.len() > 3 {
        return None;
    }
    for (position, field) in fields.iter().enumerate() {
        // The last field is the only one that may carry a fraction; an hour
        // field of "1.5" is a typo, not 90 minutes, and guessing would put
        // silent errors into exported timings.
        let last = position + 1 == fields.len();
        let value: f64 = field.trim().parse().ok()?;
        if value < 0.0 || (!last && value.fract() != 0.0) {
            return None;
        }
        let scale = match fields.len() - position {
            3 => 3_600_000.0,
            2 => 60_000.0,
            _ => 1_000.0,
        };
        total_ms += (value * scale).round() as i64;
    }
    Some(total_ms)
}

fn parts(ms: i64) -> (i64, i64, i64, i64) {
    let ms = ms.max(0);
    (
        ms / 3_600_000,
        (ms / 60_000) % 60,
        (ms / 1_000) % 60,
        ms % 1_000,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn srt_uses_a_comma_and_vtt_a_full_stop() {
        assert_eq!(format_srt(5_025_678), "01:23:45,678");
        assert_eq!(format_vtt(5_025_678), "01:23:45.678");
    }

    #[test]
    fn a_negative_time_clamps_rather_than_writing_a_minus_sign() {
        // No subtitle format has a representation for this, and a player
        // rejecting the whole file over one cue is the worst outcome.
        assert_eq!(format_srt(-1), "00:00:00,000");
    }

    #[test]
    fn the_reading_clock_drops_an_hour_it_does_not_have() {
        assert_eq!(format_clock(252_000), "4:12");
        assert_eq!(format_clock(5_025_678), "1:23:45");
    }

    #[test]
    fn every_written_form_reads_back_to_the_same_instant() {
        for ms in [0, 999, 1_000, 61_500, 5_025_678] {
            assert_eq!(parse_clock(&format_srt(ms)), Some(ms), "srt {ms}");
            assert_eq!(parse_clock(&format_vtt(ms)), Some(ms), "vtt {ms}");
        }
    }

    #[test]
    fn shorthand_a_user_would_actually_type_is_accepted() {
        assert_eq!(parse_clock("90"), Some(90_000));
        assert_eq!(parse_clock("1:30"), Some(90_000));
        assert_eq!(parse_clock("2:03.5"), Some(123_500));
    }

    #[test]
    fn nonsense_is_refused_rather_than_guessed_at() {
        assert_eq!(parse_clock(""), None);
        assert_eq!(parse_clock("soon"), None);
        assert_eq!(parse_clock("1:2:3:4"), None);
        assert_eq!(parse_clock("-5"), None);
        // A fraction in the minutes field is a typo; reading it as 90 seconds
        // would put a wrong timing into an export with no warning.
        assert_eq!(parse_clock("1.5:00"), None);
    }
}
