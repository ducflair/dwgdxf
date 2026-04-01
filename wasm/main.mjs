/**
 * main.mjs — WasmMainJSPath entry point.
 *
 * This file is bundled into the AppBundle by `dotnet publish`. It is NOT
 * imported by the npm package's runtime loader — the TypeScript side
 * initialises the runtime directly from dotnet.js using the same API.
 *
 * It exists so `dotnet publish` has a valid JS entry point and so the
 * module can be exercised standalone (e.g. in tests or Playwright).
 */
import { dotnet } from './dotnet.js';

const { getAssemblyExports, getConfig } = await dotnet
  .withDiagnosticTracing(false)
  .create();

const config = getConfig();
const exports = await getAssemblyExports(config.mainAssemblyName);

// Re-export so standalone callers can tree-shake what they need.
export const ConvertDwgToDxf = exports['DwgDxf']['Converter']['ConvertDwgToDxf'];
