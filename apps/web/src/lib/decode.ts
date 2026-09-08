// Turning whatever the user gave us into what Whisper and the diarizer want.
//
// Both need the same thing: 16 kHz mono float samples. Decoding once and
// handing the same buffer to both is not just an optimisation -- the
// diarizer's segment timings index into this array by the transcript's
// milliseconds, so a second decode at a different rate would silently
// misalign every speaker label.

import { t } from "./i18n";

/// Whisper's native input rate. Anything else is resampled to it.
export const TARGET_SAMPLE_RATE = 16_000;

export interface DecodeProgress {
  fraction: number;
  note: string;
}

/// Decode a media file's audio to 16 kHz mono.
///
/// `decodeAudioData` handles every container the browser can play, which is
/// every container it could have recorded -- so no demuxer is needed here, and
/// none of the file's bytes leave the tab.
export async function decodeToPcm(
  file: File | Blob,
  onProgress?: (progress: DecodeProgress) => void,
): Promise<Float32Array> {
  onProgress?.({ fraction: 0.05, note: t("run.reading") });
  const bytes = await file.arrayBuffer();
  onProgress?.({ fraction: 0.35, note: t("run.decoding") });

  // A short-lived context purely to decode. The sample rate is set on the
  // second context so the browser resamples during rendering rather than us
  // writing an interpolator.
  const probe = new OfflineAudioContext(1, 1, TARGET_SAMPLE_RATE);
  let decoded: AudioBuffer;
  try {
    decoded = await probe.decodeAudioData(bytes);
  } catch {
    throw new Error(t("error.undecodable"));
  }
  if (decoded.duration <= 0) {
    throw new Error(t("error.noAudioInFile"));
  }

  onProgress?.({ fraction: 0.7, note: t("run.decoding") });
  const frames = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  onProgress?.({ fraction: 1, note: t("run.ready") });
  // `.slice()` detaches from the AudioBuffer, which is otherwise kept alive
  // for as long as the samples are -- an hour of audio held twice.
  return rendered.getChannelData(0).slice();
}

/// How long a decoded buffer runs, in milliseconds.
export function durationMs(pcm: Float32Array): number {
  return Math.round((pcm.length / TARGET_SAMPLE_RATE) * 1000);
}

/// A rough loudness envelope, for drawing a waveform.
///
/// Peak rather than RMS per bucket: a waveform is a navigation aid, and peaks
/// are what makes the gaps between turns visible at a glance.
export function envelope(pcm: Float32Array, buckets: number): Float32Array {
  const out = new Float32Array(buckets);
  if (pcm.length === 0) return out;
  const per = pcm.length / buckets;
  for (let i = 0; i < buckets; i += 1) {
    const from = Math.floor(i * per);
    const to = Math.min(pcm.length, Math.floor((i + 1) * per));
    let peak = 0;
    for (let j = from; j < to; j += 1) {
      const value = Math.abs(pcm[j] ?? 0);
      if (value > peak) peak = value;
    }
    out[i] = peak;
  }
  return out;
}
