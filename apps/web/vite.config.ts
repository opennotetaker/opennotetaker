import { defineConfig } from "vite";

// One page, no router, no framework. The whole product is a tab that does
// signal processing, so every kilobyte of framework runtime is a kilobyte
// competing with the model download -- and "these are static files" is the
// self-hosting story (see docs/self-hosting.md), which a server-rendering
// framework would complicate for nothing.
//
// OPENNOTETAKER_E2E gates one test-only affordance: a `__test` hook exposing
// the engine and the store, so the smoke test can drive them without the file
// picker and the microphone permission prompt, neither of which is automatable
// from a page. Unset, `if (false)` eliminates the hook from the shipped bundle.
const e2e = process.env.OPENNOTETAKER_E2E === "1";

export default defineConfig({
  define: {
    __OPENNOTETAKER_E2E__: JSON.stringify(e2e),
  },
  // Relative asset URLs so the built site works from any path -- a
  // subdirectory, a static host's root, or a file:// URL -- without a rebuild.
  // That is what makes "download the release and open it" a real answer for
  // somebody who does not trust our hosting either.
  base: "./",
  build: {
    target: "es2022",
    // The wasm is imported as a URL and fetched at runtime; never inline it as
    // a base64 data URI, which would inflate it by a third and block streaming
    // compilation.
    assetsInlineLimit: 4096,
  },
  worker: { format: "es" },
  server: { port: 5182, strictPort: false },
});
