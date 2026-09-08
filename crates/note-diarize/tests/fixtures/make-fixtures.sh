#!/usr/bin/env bash
# Regenerate the diarizer's speech fixtures.
#
# macOS `say` voices rather than recordings of real people: regenerable by
# anyone with a Mac, inspectable, and carrying nobody's actual voice. What
# matters for the test is only that they are articulated speech -- a segment of
# real speech has within-segment spread, and a held synthetic vowel does not,
# which is the whole difference these files exist to capture.
#
#   bash crates/note-diarize/tests/fixtures/make-fixtures.sh
set -euo pipefail
cd "$(dirname "$0")"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

turn() { # voice, text -> appends 16 kHz mono f32 to $work/$1.pcm
  say -v "$2" -o "$work/t.aiff" "$3"
  ffmpeg -v error -y -i "$work/t.aiff" -ac 1 -ar 16000 -f f32le "$work/t.raw"
  cat "$work/t.raw" >> "$work/$1.pcm"
  # 300 ms between turns, as in real speech.
  python3 -c "import sys;sys.stdout.buffer.write(b'\0'*4*4800)" >> "$work/$1.pcm"
}

finish() { # name, seconds
  ffmpeg -v error -y -f f32le -ar 16000 -ac 1 -i "$work/$1.pcm" \
    -t "$2" -c:a pcm_s16le "$1.wav"
  printf '%-20s %s\n' "$1.wav" "$(du -h "$1.wav" | cut -f1)"
}

turn one-speaker Samantha "Right, so this is just me talking through the week on my own, with no one else in the room at all."
turn one-speaker Samantha "The hosting bill came in higher than we expected, about eleven percent up on last quarter."
turn one-speaker Samantha "I think the main driver is the staging environment, which nobody has turned off since March."
turn one-speaker Samantha "I will take a look at the billing console this afternoon and work out what can go."
finish one-speaker 16

turn two-speakers Samantha "Right, let us look at the burn rate for this quarter before we do anything else today."
turn two-speakers Daniel   "Sure. Hosting is up about eleven percent, and most of that is the staging environment."
turn two-speakers Samantha "That matches what I saw. Nobody has turned staging off since March, as far as I can tell."
finish two-speakers 16

turn three-speakers Samantha "Let us look at the burn rate for this quarter before we do anything else, please."
turn three-speakers Daniel   "Hosting is up about eleven percent, and most of that is the staging environment."
turn three-speakers Karen    "I agree with that reading, and I think the fix is fairly small in practice."
turn three-speakers Samantha "Nobody has turned staging off since March, so it has been running the whole time."
finish three-speakers 18
