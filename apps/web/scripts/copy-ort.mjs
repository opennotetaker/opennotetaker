// Copy ONNX Runtime's WebAssembly backend into public/ort/.
//
// Left alone, transformers.js points ONNX Runtime at a public CDN and fetches
// its runtime from there the first time a model runs. This product's claim is
// that nothing leaves your machine except the model weights you chose to
// download -- and a silent runtime dependency on a third party would make that
// claim false, in a way a user could only discover with a network panel open.
//
// So the runtime is served from our own origin, and `transcribe.ts` points
// `wasmPaths` here. That also makes the offline and self-hosted cases work:
// once the model is cached, the app needs no network at all.
import { cp, mkdir, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const to = join(here, "..", "public", "ort");

// Resolved rather than assumed at `node_modules/onnxruntime-web`: this app is
// an npm workspace, so the dependency is hoisted to the repository root and a
// hard-coded relative path finds nothing while looking perfectly reasonable.
//
// Resolved via the package's *entry point* rather than its package.json,
// because its `exports` map does not expose package.json -- so the obvious
// spelling fails with ERR_PACKAGE_PATH_NOT_EXPORTED on a package that is
// installed and working.
let from;
try {
  const require = createRequire(import.meta.url);
  from = dirname(require.resolve("onnxruntime-web"));
} catch {
  // Not fatal. `npm install` runs this before the dependency tree is
  // necessarily complete, and a missing runtime shows up as a clear message at
  // transcription time rather than as a broken build here.
  console.warn("copy-ort: onnxruntime-web is not installed yet — skipping.");
  process.exit(0);
}

// Only the runtime binaries and their loaders. The `ort.*.mjs` bundles in the
// same directory are the ONNX Runtime *library*, which Vite bundles from
// node_modules -- copying those too would put 20 MB of duplicate JavaScript in
// the published directory for nothing.
//
// All four variants are copied, not just the two we expect to be used: which
// one gets requested depends on the browser's WebGPU and JSPI support, and a
// missing variant fails at model-load time with an opaque fetch error. They
// are fetched on demand, so a session pulls exactly one.
await mkdir(to, { recursive: true });
const wanted = (await readdir(from)).filter(
  (name) =>
    name.startsWith("ort-wasm-") && (name.endsWith(".wasm") || name.endsWith(".mjs")),
);
for (const name of wanted) {
  await cp(join(from, name), join(to, name));
}
console.log(`copy-ort: ${wanted.length} files into public/ort/`);
