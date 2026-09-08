//! Grouping segment embeddings into speakers.
//!
//! Agglomerative clustering with average linkage over cosine distance. Every
//! segment starts as its own cluster; the closest two merge; repeat until the
//! closest pair is further apart than the threshold, or until the requested
//! number of speakers remains.
//!
//! # Why not k-means
//!
//! k-means needs k, and the number of people in a meeting is exactly what the
//! user does not want to have to tell us. Agglomerative clustering with a
//! stopping threshold discovers it -- and when the user *does* know, the same
//! algorithm takes the count instead of the threshold, so both modes share one
//! implementation and cannot disagree.
//!
//! # Why average linkage
//!
//! Single linkage chains: one ambiguous segment between two speakers welds
//! their clusters together, which in this domain means two people becoming one
//! for the whole meeting. Complete linkage is the opposite failure -- one
//! shouted sentence splits a speaker in half. Average linkage is the
//! compromise, and it is what speaker-diarization systems have used for as
//! long as they have existed.

/// Cosine distance, 0 (identical direction) to 2 (opposite).
///
/// Cosine rather than Euclidean because embedding magnitude tracks how *loud*
/// and how *long* a segment was, not who said it -- and two sentences from the
/// same person at different volumes must not be pushed apart by that.
pub fn cosine_distance(a: &[f32], b: &[f32]) -> f32 {
    let mut dot = 0.0;
    let mut na = 0.0;
    let mut nb = 0.0;
    for (x, y) in a.iter().zip(b.iter()) {
        dot += x * y;
        na += x * x;
        nb += y * y;
    }
    if na <= f32::EPSILON || nb <= f32::EPSILON {
        // One of them carries no information; call it maximally far so it is
        // merged last rather than pulling an arbitrary cluster towards it.
        return 1.0;
    }
    1.0 - dot / (na.sqrt() * nb.sqrt())
}

/// How to decide when to stop merging.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Stop {
    /// Merge while the closest pair is nearer than this. Discovers the count.
    Threshold(f32),
    /// Merge until exactly this many clusters remain, however far apart.
    Speakers(usize),
}

/// The whole merge sequence, recorded once and cut afterwards.
///
/// Agglomeration is run to a single cluster every time and the *cut* is a
/// separate decision. That is what lets the automatic mode look at the shape
/// of the whole sequence -- how much each merge cost relative to the ones
/// before it -- instead of comparing one distance against a constant it can
/// only be right about for one recording.
pub struct Tree {
    n: usize,
    /// `(a, b, height)` in merge order: cluster `b` folded into `a` at that
    /// average-linkage distance. There are `n - 1` of them.
    merges: Vec<(usize, usize, f32)>,
}

impl Tree {
    /// The cost of each merge, in the order they happened.
    ///
    /// Non-decreasing, because average linkage cannot invert: this is what the
    /// automatic cut reads.
    pub fn heights(&self) -> Vec<f32> {
        self.merges.iter().map(|(_, _, h)| *h).collect()
    }

    /// Labels if the tree is cut to leave `k` clusters.
    ///
    /// Replayed from the merge list rather than stored per level: the list is
    /// `n - 1` triples and every cut is derivable from it, so keeping a label
    /// vector per level would be the same information `n` times over.
    pub fn labels_for(&self, k: usize) -> Vec<usize> {
        let k = k.clamp(1, self.n.max(1));
        let mut parent: Vec<usize> = (0..self.n).collect();
        fn find(parent: &mut [usize], mut i: usize) -> usize {
            while parent[i] != i {
                parent[i] = parent[parent[i]];
                i = parent[i];
            }
            i
        }
        for &(a, b, _) in self.merges.iter().take(self.n.saturating_sub(k)) {
            let (ra, rb) = (find(&mut parent, a), find(&mut parent, b));
            parent[rb] = ra;
        }

        // Renumber by first appearance, so the speaker who talks first is 0.
        // Without it the ids follow merge order, and re-running diarization on
        // the same audio would shuffle "Speaker 1" and "Speaker 2" for no
        // reason a user could see.
        let mut seen: Vec<usize> = Vec::new();
        (0..self.n)
            .map(|i| {
                let root = find(&mut parent, i);
                match seen.iter().position(|s| *s == root) {
                    Some(p) => p,
                    None => {
                        seen.push(root);
                        seen.len() - 1
                    }
                }
            })
            .collect()
    }
}

/// Merge everything into one tree, recording what each step cost.
///
/// Cosine over plain vectors; [`build_with`] takes any distance, which is how
/// the diarizer clusters Gaussian fingerprints without this file knowing what
/// one is.
pub fn build(embeddings: &[Vec<f32>]) -> Tree {
    build_with(embeddings, |a, b| cosine_distance(a, b))
}

/// Merge everything into one tree under an arbitrary distance.
pub fn build_with<T>(items: &[T], distance: impl Fn(&T, &T) -> f32) -> Tree {
    let n = items.len();
    let mut tree = Tree { n, merges: Vec::new() };
    if n < 2 {
        return tree;
    }

    let mut members: Vec<Vec<usize>> = (0..n).map(|i| vec![i]).collect();
    let mut alive: Vec<bool> = vec![true; n];

    // Pairwise distances, computed once. n is the number of transcript
    // segments -- hundreds, not millions -- so the full matrix is cheap and
    // avoids recomputing a distance every merge.
    let mut distances = vec![0.0f32; n * n];
    for i in 0..n {
        for j in i + 1..n {
            let d = distance(&items[i], &items[j]);
            distances[i * n + j] = d;
            distances[j * n + i] = d;
        }
    }

    for _ in 1..n {
        let mut best = f32::INFINITY;
        let mut pair = None;
        for i in 0..n {
            if !alive[i] {
                continue;
            }
            for j in i + 1..n {
                if !alive[j] {
                    continue;
                }
                let d = average_linkage(&members[i], &members[j], &distances, n);
                if d < best {
                    best = d;
                    pair = Some((i, j));
                }
            }
        }
        let Some((i, j)) = pair else { break };
        let moved = std::mem::take(&mut members[j]);
        members[i].extend(moved);
        alive[j] = false;
        tree.merges.push((i, j, best));
    }
    tree
}

/// Cluster labels, one per input embedding.
pub fn cluster(embeddings: &[Vec<f32>], stop: Stop, max_speakers: usize) -> Vec<usize> {
    cluster_tree(&build(embeddings), embeddings.len(), stop, max_speakers)
}

/// Cut an already-built tree.
pub fn cluster_tree(tree: &Tree, n: usize, stop: Stop, max_speakers: usize) -> Vec<usize> {
    if n == 0 {
        return Vec::new();
    }
    let k = match stop {
        Stop::Speakers(k) => k.clamp(1, n),
        Stop::Threshold(limit) => {
            // Merge while the closest pair is nearer than the limit: the count
            // is the number of merges that were never made.
            let heights = tree.heights();
            let merged = heights.iter().take_while(|h| **h <= limit).count();
            (n - merged).clamp(1, max_speakers.max(1))
        }
    };
    tree.labels_for(k)
}

fn average_linkage(a: &[usize], b: &[usize], distances: &[f32], n: usize) -> f32 {
    let mut sum = 0.0;
    for &i in a {
        for &j in b {
            sum += distances[i * n + j];
        }
    }
    sum / (a.len() * b.len()) as f32
}

#[cfg(test)]
mod tests {
    use super::*;

    fn point(x: f32, y: f32) -> Vec<f32> {
        vec![x, y]
    }

    #[test]
    fn two_obvious_groups_are_found_without_being_told_how_many() {
        let embeddings = vec![
            point(1.0, 0.05),
            point(1.0, -0.05),
            point(0.05, 1.0),
            point(-0.05, 1.0),
        ];
        let labels = cluster(&embeddings, Stop::Threshold(0.3), 8);
        assert_eq!(labels[0], labels[1]);
        assert_eq!(labels[2], labels[3]);
        assert_ne!(labels[0], labels[2]);
    }

    #[test]
    fn a_known_speaker_count_is_honoured_however_far_apart_they_are() {
        let embeddings = vec![
            point(1.0, 0.0),
            point(0.99, 0.1),
            point(0.98, -0.1),
            point(0.0, 1.0),
        ];
        assert_eq!(
            cluster(&embeddings, Stop::Speakers(2), 8)
                .iter()
                .collect::<std::collections::BTreeSet<_>>()
                .len(),
            2
        );
        assert_eq!(
            cluster(&embeddings, Stop::Speakers(4), 8)
                .iter()
                .collect::<std::collections::BTreeSet<_>>()
                .len(),
            4
        );
    }

    #[test]
    fn labels_are_numbered_by_who_spoke_first_so_a_rerun_is_stable() {
        let embeddings = vec![point(0.0, 1.0), point(1.0, 0.0), point(0.02, 1.0)];
        let labels = cluster(&embeddings, Stop::Threshold(0.3), 8);
        assert_eq!(labels[0], 0, "the first segment must be speaker 0");
        assert_eq!(labels[2], 0);
        assert_eq!(labels[1], 1);
    }

    /// Average linkage exists to prevent exactly this: a bridging point
    /// welding two speakers into one.
    #[test]
    fn a_single_ambiguous_point_does_not_chain_two_groups_together() {
        let embeddings = vec![
            point(1.0, 0.0),
            point(1.0, 0.02),
            point(0.72, 0.70), // the bridge, between both
            point(0.0, 1.0),
            point(0.02, 1.0),
        ];
        let labels = cluster(&embeddings, Stop::Threshold(0.06), 8);
        assert_ne!(
            labels[0], labels[3],
            "the two groups were chained through the bridging point: {labels:?}"
        );
    }

    #[test]
    fn the_speaker_cap_overrides_the_threshold() {
        // Four mutually distant points would be four speakers by threshold.
        let embeddings = vec![
            point(1.0, 0.0),
            point(0.0, 1.0),
            point(-1.0, 0.0),
            point(0.0, -1.0),
        ];
        let capped = cluster(&embeddings, Stop::Threshold(0.1), 2);
        assert_eq!(
            capped
                .iter()
                .collect::<std::collections::BTreeSet<_>>()
                .len(),
            2
        );
    }

    #[test]
    fn degenerate_inputs_return_something_usable() {
        assert!(cluster(&[], Stop::Threshold(0.5), 4).is_empty());
        assert_eq!(
            cluster(&[point(1.0, 1.0)], Stop::Threshold(0.5), 4),
            vec![0]
        );
        // A zero vector carries no direction; it must not panic on the norm.
        let labels = cluster(&[point(0.0, 0.0), point(1.0, 0.0)], Stop::Threshold(0.5), 4);
        assert_eq!(labels.len(), 2);
    }
}
