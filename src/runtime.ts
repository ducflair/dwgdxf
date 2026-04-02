import type { AssemblyExports, ConvertOptions, DotnetHostBuilder } from './types.js';

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
 * Opt-in alternative to the local default. The browser fetches all `.wasm`,
 * `.dll`, and loader files from jsDelivr's edge network — nothing is copied
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
let _runtimePromise: Promise<AssemblyExports> | null = null;

/**
 * Initialises (or returns the already-initialised) .NET WASM runtime.
 * Safe to call multiple times — subsequent calls are instant no-ops.
 */
export function loadRuntime(options?: ConvertOptions): Promise<AssemblyExports> {
  if (!_runtimePromise) {
    _runtimePromise = _boot(options?.wasmBase ?? DEFAULT_WASM_BASE);
  }
  return _runtimePromise;
}

async function _boot(wasmBase: string): Promise<AssemblyExports> {
  // Trim trailing slash for consistent path joining.
  const base = wasmBase.replace(/\/+$/, '');

  // Use `new Function` to create an indirect dynamic import.
  // This prevents bundlers from attempting to statically analyse or inline
  // the dotnet.js module, which is a runtime-loaded binary asset.
  const indirectImport = new Function('url', 'return import(url)') as (
    url: string,
  ) => Promise<{ dotnet: DotnetHostBuilder }>;

  const { dotnet } = await indirectImport(`${base}/dotnet.js`);

  const runtime = await dotnet
    .withDiagnosticTracing(false)
    .withModuleConfig({
      // Tell the Emscripten / .NET runtime layer where to locate WASM assets
      // relative to the dotnet.js script.  This is equivalent to the
      // `locateFile` callback used in older .NET WASM builds.
      locateFile: (path: string) => `${base}/${path}`,
    })
    .create();

  const config = runtime.getConfig();
  const assemblyName = config.mainAssemblyName ?? 'DwgDxf';
  const exports = await runtime.getAssemblyExports(assemblyName);

  return exports as AssemblyExports;
}

/** Reset the singleton — useful in unit tests that mock the runtime. */
export function _resetRuntime(): void {
  _runtimePromise = null;
}
