export type { ConvertOptions } from './types.js';

import { loadRuntime } from './runtime.js';
import type { ConvertOptions } from './types.js';

/**
 * Converts a DWG binary buffer to a DXF byte array entirely in the browser
 * using ACadSharp compiled to WebAssembly.
 *
 * The .NET runtime is initialised lazily on the first call and reused
 * for all subsequent calls — warm conversions are significantly faster.
 *
 * @param dwg  The DWG file contents as `Uint8Array` or `ArrayBuffer`.
 * @param options  Optional configuration (e.g. a custom `wasmBase` URL).
 * @returns  The DXF file contents as a `Uint8Array`.
 *
 * @example
 * import { convertDwgToDxf } from 'dwgdxf';
 *
 * const response = await fetch('/models/drawing.dwg');
 * const dwgBytes = new Uint8Array(await response.arrayBuffer());
 * const dxfBytes = await convertDwgToDxf(dwgBytes);
 *
 * // Download the result
 * const blob = new Blob([dxfBytes], { type: 'application/dxf' });
 * const url  = URL.createObjectURL(blob);
 * Object.assign(document.createElement('a'), { href: url, download: 'drawing.dxf' }).click();
 * URL.revokeObjectURL(url);
 */
export async function convertDwgToDxf(
  dwg: Uint8Array | ArrayBuffer,
  options?: ConvertOptions,
): Promise<Uint8Array> {
  const exports = await loadRuntime(options);
  const input = dwg instanceof Uint8Array ? dwg : new Uint8Array(dwg);
  // ConvertDwgToDxf returns a Uint8Array view into WASM-managed memory.
  // We copy it immediately before the GC can reclaim the underlying buffer.
  const result = exports.DwgDxf.Converter.ConvertDwgToDxf(input);
  return new Uint8Array(result);
}

/**
 * Pre-initialises the .NET WASM runtime without performing a conversion.
 * Call this during application startup to eliminate cold-start latency on
 * the first {@link convertDwgToDxf} invocation.
 *
 * @param options  Optional configuration (e.g. a custom `wasmBase` URL).
 */
export async function init(options?: ConvertOptions): Promise<void> {
  await loadRuntime(options);
}
