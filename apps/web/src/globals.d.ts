// Set by Vite's `define` (see vite.config.ts). `false` in a shipped build, so
// the test hook it guards is eliminated entirely rather than merely unused.
declare const __OPENNOTETAKER_E2E__: boolean;

declare module "*?url" {
  const url: string;
  export default url;
}
