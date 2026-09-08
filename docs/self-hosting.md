# Running OpenNoteTaker yourself

The competitor research this product came from found that no existing tool
combines a browser-native experience with local processing: the ones that
process locally all require an install, and the ones you open in a browser all
upload your audio. It also warned that "self-hosted" usually means "run a
container", which is not something a non-technical user does — so the *default*
path here is the hosted site, and this page is for people who want more.

## What you are actually running

A static file server. That is all.

There is no backend, no database, no queue, no job runner and no API key. Every
free feature — recording, transcription, speaker separation, summarising,
search, every export — happens in the visitor's browser. This deployment serves
HTML, JavaScript, CSS and two WebAssembly modules.

That matters for the threat model: there is no server-side copy of anybody's
recording to protect, because there is no server-side copy at all.

## The quickest way

```sh
docker compose up --build
# http://localhost:8088
```

## Without Docker

```sh
npm install
npm run build:wasm     # needs Rust + wasm-bindgen 0.2.126, see below
npm run build
# apps/web/dist is now a directory of static files. Serve it with anything.
```

`npm run build:wasm` needs:

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.126   # the version must match exactly
```

The version must match the `wasm-bindgen` crate version in `Cargo.toml`
exactly: the generated JavaScript glue is schema-versioned, and a mismatch
fails at runtime rather than at build time.

The generated glue in `apps/web/src/wasm-gen/` is committed, so a checkout can
`npm run dev` with no Rust toolchain at all.

## Two headers that are not optional

Both are in `deploy/nginx.conf`. If you serve the files some other way, carry
them across.

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

ONNX Runtime's threaded WebAssembly build needs `SharedArrayBuffer`, which
browsers only expose to a cross-origin-isolated document. Without these two
headers the runtime silently drops to a single thread and transcription takes
several times longer — with nothing in the console to say why.

Also serve `.wasm` as `application/wasm`. As `application/octet-stream` it
still works, via a slower non-streaming compilation path, which is exactly the
kind of regression nobody notices.

## Opening it from a disk

The build uses relative asset URLs, so `apps/web/dist/index.html` opens
directly from a `file://` URL. Transcription is slower there — no cross-origin
isolation means no threads — but it works, and it is the most literal possible
demonstration of the claim: no server involved at all.

## Offline

After the first transcription with a given model, the weights are in the
browser's cache and the free tier needs no network whatsoever. Turn off the
Wi-Fi and record a meeting; it works. That is the check worth running once,
because it is the claim the whole product rests on.

## The paid features

They do not work in a self-hosted deployment unless you point them at a
gateway, and that is fine — they are three routes out of a dozen features.

If you want them, `apps/web/src/lib/account.ts` holds two constants:

```ts
export const AUTH_URL = "https://auth.opennotetaker.app";
export const API_URL  = "https://gateway.opennotetaker.app";
```

Point them at your own `openapps-server` and `openapps-gateway`, add your
origin to that server's `allowed_origins`, and add both hosts to the
`connect-src` list in `deploy/nginx.conf`. The gateway needs an app key issued
for `opennotetaker` and a model vendor key; see the `openapps-integration`
skill in the monorepo.

If you want them *gone* rather than broken, delete the two hosts from
`connect-src`. The buttons will then fail visibly rather than silently, which
is the better failure.

## Sizes

| | |
|---|---|
| The app itself | about 250 KB of JavaScript and CSS, gzipped |
| The Rust engine | 380 KB of WebAssembly, 170 KB gzipped |
| ONNX Runtime | 12–25 MB, depending on which variant the browser picks; one per visitor |
| Whisper Base | about 80 MB, fetched from Hugging Face by the visitor, cached thereafter |

`public/ort/` holds all four ONNX Runtime variants because which one a browser
requests depends on its WebGPU and JSPI support, and a missing one fails at
model-load time with an opaque fetch error. A visitor downloads exactly one.
