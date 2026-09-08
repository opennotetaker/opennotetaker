//! A radix-2 FFT, written out rather than depended upon.
//!
//! The diarizer needs one transform size (512 points, real input) called a
//! few thousand times per minute of audio. Every FFT crate is a general
//! planner with mixed-radix paths, SIMD variants and a runtime planner
//! cache -- tens of kilobytes of wasm for a single fixed size, in a bundle
//! a user downloads before they can use the product at all.
//!
//! So: forty lines, exact for power-of-two sizes, and tested against a
//! directly-evaluated DFT so "we wrote our own FFT" is a checked claim
//! rather than a hopeful one.

use std::f32::consts::PI;

/// In-place iterative Cooley-Tukey over interleaved (re, im) pairs.
///
/// `len` must be a power of two; the caller is the mel front end, which owns
/// a fixed 512-point buffer, so this is an assertion rather than an error
/// type nobody could act on.
pub fn fft_in_place(re: &mut [f32], im: &mut [f32]) {
    let n = re.len();
    debug_assert_eq!(n, im.len());
    debug_assert!(n.is_power_of_two(), "radix-2 needs a power-of-two length");
    if n < 2 {
        return;
    }

    // Bit-reversal permutation.
    let mut j = 0usize;
    for i in 1..n {
        let mut bit = n >> 1;
        while j & bit != 0 {
            j ^= bit;
            bit >>= 1;
        }
        j |= bit;
        if i < j {
            re.swap(i, j);
            im.swap(i, j);
        }
    }

    let mut len = 2;
    while len <= n {
        let angle = -2.0 * PI / len as f32;
        let (wr, wi) = (angle.cos(), angle.sin());
        let mut i = 0;
        while i < n {
            // The twiddle is advanced by repeated multiplication rather than
            // recomputed with cos/sin per butterfly: at 512 points the drift
            // is far below the resolution of a mel filterbank, and the sin
            // calls dominated the profile otherwise.
            let (mut ur, mut ui) = (1.0f32, 0.0f32);
            for k in 0..len / 2 {
                let (ar, ai) = (re[i + k], im[i + k]);
                let (br, bi) = (re[i + k + len / 2], im[i + k + len / 2]);
                let (tr, ti) = (br * ur - bi * ui, br * ui + bi * ur);
                re[i + k] = ar + tr;
                im[i + k] = ai + ti;
                re[i + k + len / 2] = ar - tr;
                im[i + k + len / 2] = ai - ti;
                let next_ur = ur * wr - ui * wi;
                ui = ur * wi + ui * wr;
                ur = next_ur;
                let _ = k;
            }
            i += len;
        }
        len <<= 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The reference: the definition of the DFT, evaluated directly.
    fn naive_dft(re: &[f32], im: &[f32]) -> (Vec<f32>, Vec<f32>) {
        let n = re.len();
        let mut out_re = vec![0.0; n];
        let mut out_im = vec![0.0; n];
        for k in 0..n {
            for t in 0..n {
                let angle = -2.0 * PI * (k * t) as f32 / n as f32;
                out_re[k] += re[t] * angle.cos() - im[t] * angle.sin();
                out_im[k] += re[t] * angle.sin() + im[t] * angle.cos();
            }
        }
        (out_re, out_im)
    }

    #[test]
    fn it_agrees_with_the_definition_of_the_transform() {
        for n in [2usize, 4, 8, 64] {
            let mut re: Vec<f32> = (0..n)
                .map(|i| (i as f32 * 0.7).sin() + (i as f32 * 0.13).cos())
                .collect();
            let mut im = vec![0.0f32; n];
            let (want_re, want_im) = naive_dft(&re, &im);
            fft_in_place(&mut re, &mut im);
            for k in 0..n {
                assert!(
                    (re[k] - want_re[k]).abs() < 1e-2 && (im[k] - want_im[k]).abs() < 1e-2,
                    "n={n} bin={k}: got ({}, {}), want ({}, {})",
                    re[k],
                    im[k],
                    want_re[k],
                    want_im[k]
                );
            }
        }
    }

    #[test]
    fn a_pure_tone_lands_in_the_bin_it_should() {
        let n = 64;
        let cycles = 8.0;
        let mut re: Vec<f32> = (0..n)
            .map(|i| (2.0 * PI * cycles * i as f32 / n as f32).sin())
            .collect();
        let mut im = vec![0.0f32; n];
        fft_in_place(&mut re, &mut im);
        let power: Vec<f32> = (0..n / 2).map(|k| re[k] * re[k] + im[k] * im[k]).collect();
        let peak = power
            .iter()
            .enumerate()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
            .unwrap()
            .0;
        assert_eq!(peak, cycles as usize);
    }

    #[test]
    fn silence_transforms_to_silence_and_a_single_sample_does_not_panic() {
        let mut re = vec![0.0f32; 16];
        let mut im = vec![0.0f32; 16];
        fft_in_place(&mut re, &mut im);
        assert!(re.iter().all(|v| *v == 0.0));

        let mut one = vec![1.0f32];
        let mut one_im = vec![0.0f32];
        fft_in_place(&mut one, &mut one_im);
        assert_eq!(one[0], 1.0);
    }
}
