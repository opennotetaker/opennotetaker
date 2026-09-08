#!/usr/bin/env bash
# Builds crates/note-wasm for wasm32-unknown-unknown and generates the
# wasm-bindgen JS/TS glue into src/wasm-gen/. Run before `vite build` (see
# package.json) -- Vite never touches Rust, it only imports the already
# generated glue as a normal ES module.
#
# The generated output is committed, following the other apps in this
# monorepo: a checkout should be able to `npm run dev` without a Rust
# toolchain installed.
set -euo pipefail

export PATH="$HOME/.cargo/bin:/opt/homebrew/bin:$PATH"

# The repo lives on a shared mount, which produces spurious archive/GC errors
# when used as the cargo target dir directly. Build off-mount; only the final
# .wasm crosses back, via --out-dir.
: "${CARGO_TARGET_DIR:=/tmp/opennotetaker-target}"
export CARGO_TARGET_DIR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE_DIR="$(dirname "$(dirname "$WEB_DIR")")"
OUT_DIR="$WEB_DIR/src/wasm-gen"

if ! command -v wasm-bindgen >/dev/null 2>&1; then
  echo "error: wasm-bindgen not on PATH." >&2
  echo "  cargo install wasm-bindgen-cli --version 0.2.126" >&2
  echo "(the CLI version must match the wasm-bindgen crate version in" >&2
  echo " Cargo.toml exactly -- the JS glue is schema-versioned)" >&2
  exit 1
fi

cargo build -p note-wasm \
  --target wasm32-unknown-unknown \
  --profile wasm-release \
  --manifest-path "$WORKSPACE_DIR/Cargo.toml"

wasm-bindgen \
  --target web \
  --out-dir "$OUT_DIR" \
  --out-name note_engine \
  "$CARGO_TARGET_DIR/wasm32-unknown-unknown/wasm-release/note_wasm.wasm"

if command -v wasm-opt >/dev/null 2>&1; then
  # The feature flags are not optional. rustc emits bulk-memory and sign
  # extension unconditionally for wasm32 now, and wasm-opt still defaults to
  # the 2019 MVP feature set -- so without these it rejects a perfectly valid
  # module with "error validating input", which reads like a corrupt build
  # rather than a missing flag.
  wasm-opt -O3 \
    --enable-bulk-memory \
    --enable-bulk-memory-opt \
    --enable-reference-types \
    --enable-sign-ext \
    --enable-nontrapping-float-to-int \
    --enable-multivalue \
    -o "$OUT_DIR/note_engine_bg.wasm" "$OUT_DIR/note_engine_bg.wasm"
  echo "wasm-opt: optimized note_engine_bg.wasm"
else
  echo "wasm-opt not found on PATH -- skipping (the glue still works, just larger)"
fi

ls -lh "$OUT_DIR/note_engine_bg.wasm" | awk '{print "wasm build complete: " $9 " (" $5 ")"}'
