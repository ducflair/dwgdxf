import type { AssemblyExports, ConvertOptions, DotnetHostBuilder } from './types.js';

// ---------------------------------------------------------------------------
// Resolve the default WASM base URL at module evaluation time.
// Bundlers (Vite, webpack ≥ 5, Rollup) see `new URL(…, import.meta.url)` and
// automatically copy the referenced directory to the output as a static asset.
// ---------------------------------------------------------------------------
const DEFAULT_WASM_BASE = new URL('./wasm', import.meta.url).href;

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
