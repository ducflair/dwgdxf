import type { ConvertOptions, WasmModule } from './types.js';

// Injected at bundle-time by Bun's `define` option (see build.ts).
// Falls back to 'latest' when the source is imported directly (e.g. in tests).
declare const __DWGDXF_VERSION__: string;
const _version = typeof __DWGDXF_VERSION__ !== 'undefined' ? __DWGDXF_VERSION__ : 'latest';

/**
 * Local WASM base URL — resolves to the `dist/wasm/` directory shipped with
 * this package, relative to the consuming app's bundle output.
 *
 * This is the **default** used by `init()` when no `wasmBase` is provided.
 * Bundlers (Vite, webpack ≥ 5, Rollup) detect the `new URL(…)` call and
 * automatically copy all files from `dist/wasm/` into your app's output.
 *
 * @example
 * import { init } from 'dwgdxf';
 * await init(); // LOCAL_WASM_BASE used automatically
 */
export const LOCAL_WASM_BASE = new URL('./wasm', import.meta.url).href;

/**
 * jsDelivr CDN base URL for this exact package version's WASM assets.
 *
 * Opt-in alternative to the local default. The browser fetches all `.wasm`
 * and loader files from jsDelivr's edge network — nothing is copied
 * into the user's bundle or deployment.
 *
 * @example
 * import { init, CDN_WASM_BASE } from 'dwgdxf';
 * await init({ wasmBase: CDN_WASM_BASE });
 */
export const CDN_WASM_BASE =
  `https://cdn.jsdelivr.net/npm/dwgdxf@${_version}/dist/wasm`;

const DEFAULT_WASM_BASE = LOCAL_WASM_BASE;

// Global singleton — the runtime is expensive to initialise; load it once.
let _runtimePromise: Promise<WasmModule> | null = null;

/**
 * Initialises (or returns the already-initialised) Rust WASM runtime.
 * Safe to call multiple times — subsequent calls are instant no-ops.
 */
export function loadRuntime(options?: ConvertOptions): Promise<WasmModule> {
  if (!_runtimePromise) {
    _runtimePromise = _boot(options?.wasmBase ?? DEFAULT_WASM_BASE);
  }
  return _runtimePromise;
}

async function _boot(wasmBase: string): Promise<WasmModule> {
  // Trim trailing slash for consistent path joining.
  const base = wasmBase.replace(/\/+$/, '');

  const wasmModule = await import(`${base}/dwgdxf.js`);

  // Detect if we are in a Node.js/Bun filesystem environment where fetch()
  // on file:// URLs fails.
  const isFileURL = base.startsWith('file:') || (!base.startsWith('http:') && !base.startsWith('https:') && typeof window === 'undefined');

  if (isFileURL && typeof process !== 'undefined') {
    // Dynamic imports of Node.js modules to avoid bundler issues
    const fsName = ['node', 'fs'].join(':');
    const pathName = ['node', 'path'].join(':');
    const urlName = ['node', 'url'].join(':');
    const fs = await import(fsName);
    const path = await import(pathName);
    const { fileURLToPath } = await import(urlName);

    let wasmDir = base;
    if (wasmDir.startsWith('file:')) {
      wasmDir = fileURLToPath(wasmDir);
    }
    const fullWasmPath = path.join(wasmDir, 'dwgdxf_bg.wasm');
    const wasmBuffer = fs.readFileSync(fullWasmPath);
    await wasmModule.default({ module_or_path: new WebAssembly.Module(wasmBuffer) });
  } else {
    // Browser environment / standard URL
    await wasmModule.default({ module_or_path: `${base}/dwgdxf_bg.wasm` });
  }

  return wasmModule as WasmModule;
}

/** Reset the singleton — useful in unit tests that mock the runtime. */
export function _resetRuntime(): void {
  _runtimePromise = null;
}
