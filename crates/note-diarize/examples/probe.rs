//! Run the diarizer over a raw 16 kHz mono f32 file and print what it found.
//!
//! Not shipped and not a test: a bench for tuning against real speech, since
//! the synthesised voices in the unit tests are far more stationary than a
//! person is and cannot show over-splitting at all.
//!
//!   ffmpeg -i in.m4a -ac 1 -ar 16000 -f f32le out.raw
//!   cargo run -p note-diarize --example probe -- out.raw [speakers]

use note_core::{Segment, Source, Transcript};
use note_diarize::{diarize, Options, SpeakerCount};

fn main() {
    let mut args = std::env::args().skip(1);
    let path = args.next().expect("usage: probe <raw f32le 16k mono> [speakers]");
    let forced: Option<usize> = args.next().and_then(|a| a.parse().ok());

    let bytes = std::fs::read(&path).expect("read");
    let samples: Vec<f32> = bytes
        .as_chunks::<4>()
        .0
        .iter()
        .map(|c| f32::from_le_bytes(*c))
        .collect();
    println!("{:.1}s of audio", samples.len() as f32 / 16_000.0);

    // Segment the way a transcriber does: on the pauses.
    let analyser = note_diarize::Analyser::new();
    let mut frames = analyser.analyse(&samples);
    note_diarize::mfcc::normalise(&mut frames);
    let voiced = note_diarize::vad::voiced_mask(&frames);

    // A transcriber cuts on pauses and also caps how long a line may run, so
    // do both -- otherwise continuous synthesised speech comes back as one
    // segment and there is nothing to cluster.
    let pause_frames: usize = std::env::var("PAUSE_MS").ok().and_then(|v| v.parse().ok()).unwrap_or(120) / 10;
    let max_frames: usize = std::env::var("MAX_S").ok().and_then(|v| v.parse().ok()).unwrap_or(6) * 100;

    let mut segments = Vec::new();
    let mut start: Option<usize> = None;
    let mut silence = 0usize;
    let cut = |segments: &mut Vec<Segment>, from: usize, to: usize| {
        if to > from {
            let n = segments.len();
            segments.push(Segment::new(from as i64 * 10, to as i64 * 10, format!("line {n}")));
        }
    };
    for (i, &v) in voiced.iter().enumerate() {
        if v {
            silence = 0;
            start.get_or_insert(i);
            if let Some(s) = start {
                if i - s >= max_frames {
                    cut(&mut segments, s, i);
                    start = Some(i);
                }
            }
        } else if let Some(s) = start {
            silence += 1;
            if silence >= pause_frames {
                cut(&mut segments, s, i - silence);
                start = None;
            }
        }
    }
    if let Some(s) = start {
        cut(&mut segments, s, voiced.len());
    }
    println!("{} segments", segments.len());

    // The merge sequence, which is what the automatic cut has to read.
    {
        let analyser2 = note_diarize::Analyser::new();
        let _ = &analyser2;
        let mut t2 = Transcript::from_segments(Source::Recorded, segments.clone());
        let embeddings = note_diarize::embeddings_for(&t2, &samples, min_voiced_ms());
        t2.segments.clear();
        let tree = note_diarize::cluster::build_with(&embeddings, note_diarize::divergence);
        let heights = tree.heights();
        println!("{} embeddings; merge heights (last 10):", embeddings.len());
        let tail: Vec<String> = heights.iter().rev().take(10).rev().map(|h| format!("{h:.3}")).collect();
        println!("  {}", tail.join("  "));
        let ratios: Vec<String> = heights
            .windows(2)
            .rev()
            .take(9)
            .rev()
            .enumerate()
            .map(|(i, w)| format!("k={}:{:.2}", 10 - i, w[1] / w[0].max(1e-6)))
            .collect();
        println!("  ratios {}", ratios.join("  "));
    }

    let mut transcript = Transcript::from_segments(Source::Recorded, segments);
    let options = Options {
        min_voiced_ms: min_voiced_ms(),
        threshold: std::env::var("THRESHOLD").ok().and_then(|v| v.parse().ok()).unwrap_or(0.35),
        max_speakers: std::env::var("MAX_SPEAKERS").ok().and_then(|v| v.parse().ok()).unwrap_or(8),
        speakers: match forced {
            Some(k) => SpeakerCount::Exactly(k),
            None => SpeakerCount::Auto,
        },
    };
    let report = diarize(&mut transcript, &samples, &options);

    for segment in &transcript.segments {
        println!(
            "SEG\t{}\t{}\t{}",
            segment.start_ms,
            segment.end_ms,
            segment.speaker.as_deref().unwrap_or("-")
        );
    }
    println!("{report:?}");
}

fn min_voiced_ms() -> i64 {
    std::env::var("MIN_VOICED_MS").ok().and_then(|v| v.parse().ok()).unwrap_or(400)
}
