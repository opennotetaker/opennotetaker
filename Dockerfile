# OpenNoteTaker, as a container you can run yourself.
#
# §4 空白1 of the competitor research: of eleven products, none combines a
# browser-native experience with local processing. The ones that process
# locally make you install an application; the ones you open in a browser
# upload your audio. This image is the third option -- and it is deliberately
# *only* a static file server, because there is no backend to run.
#
# Everything the free tier does happens in the visitor's browser. This
# container serves HTML, JavaScript and two WebAssembly modules. It has no
# database, no queue, no API keys and nothing to secure beyond the web server
# itself. That is the whole point: a self-hosted deployment you have to
# operate is not a privacy feature, it is a second job.

# ---------------------------------------------------------------- build stage
FROM rust:1-bookworm AS engine

RUN rustup target add wasm32-unknown-unknown \
 && cargo install wasm-bindgen-cli --version 0.2.126 --locked

WORKDIR /src
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./
COPY crates ./crates
# The toolchain file pins a channel the base image may not have; the image's
# own stable toolchain is what we want here.
RUN rm -f rust-toolchain.toml \
 && cargo build -p note-wasm --target wasm32-unknown-unknown --profile wasm-release \
 && wasm-bindgen --target web --out-dir /out --out-name note_engine \
      target/wasm32-unknown-unknown/wasm-release/note_wasm.wasm

FROM node:22-bookworm AS site

WORKDIR /src
COPY package.json ./
COPY apps/web/package.json ./apps/web/
# The OpenApps client packages are consumed from the surrounding monorepo. A
# standalone build without them still works -- the account surface simply does
# not render -- so the copy is tolerant of their absence.
COPY --from=engine /out ./apps/web/src/wasm-gen
COPY apps/web ./apps/web
RUN npm install --omit=optional --no-audit --no-fund || npm install --no-audit --no-fund
RUN npm run build -w opennotetaker-web

# ----------------------------------------------------------------- run stage
FROM nginx:1.27-alpine

COPY --from=site /src/apps/web/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# WebAssembly threads and the SharedArrayBuffer that ONNX Runtime uses need
# cross-origin isolation, which is a pair of response headers rather than
# anything in the application. Without them the runtime silently falls back to
# a single thread and transcription is several times slower -- so they are set
# in nginx.conf, and this comment exists because that is a non-obvious place
# for a performance characteristic to live.
EXPOSE 80
