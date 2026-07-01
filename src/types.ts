// ---------------------------------------------------------------------------
// Types shared between runtime.ts and the public index.ts
// ---------------------------------------------------------------------------

/** Options accepted by {@link init} and {@link convertDwgToDxf}. */
export interface ConvertOptions {
  /**
   * Base URL of the directory containing the published WASM assets
   * (`dwgdxf.js`, `dwgdxf_bg.wasm`).
   *
   * **Default** — assets are loaded from `./wasm/` relative to the JS bundle,
   * which is where the npm package ships them. Most bundler setups (Vite,
   * Rollup, webpack ≥ 5) copy the `dist/wasm/` directory to your output
   * folder automatically when they process `new URL('./wasm', import.meta.url)`.
   * ```ts
   * await init({ wasmBase: '/assets/dwgdxf-wasm' });
   * ```
   */
  wasmBase?: string;
}

// ---------------------------------------------------------------------------
// Internal types for the Rust WASM runtime
// ---------------------------------------------------------------------------

/** Shape of the exports produced by dwgdxf wasm-pack bindings. */
export interface WasmModule {
  convertDwgToDxf(dwg: Uint8Array): Uint8Array;
}

