/**
 * build.ts — Bun build script for dwgdxf
 *
 * Produces:
 *   dist/index.js   — ESM bundle
 *   dist/index.cjs  — CJS bundle
 *   dist/index.d.ts — TypeScript declarations (via tsc)
 *
 * The WASM assets in dist/wasm/ are written by scripts/build-wasm.sh and
 * are intentionally excluded from the JS bundle (loaded at runtime).
 */

import { $ } from 'bun';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import pkg from './package.json';

const root = import.meta.dir;
const distDir = join(root, 'dist');

// Injected into every bundle so CDN_WASM_BASE in index.ts resolves to the
// correct version string at build time without a JSON import at runtime.
const versionDefine = { __DWGDXF_VERSION__: JSON.stringify(pkg.version) };
const distWasm = join(distDir, 'wasm');

// Verify the WASM build has been run first.
if (!existsSync(distWasm)) {
  console.error(
    '✗ dist/wasm/ not found.\n  Run `bun run build:wasm` before `build:ts`.',
  );
  process.exit(1);
}

// Keep the npm package lean by removing stale top-level dist artifacts while
// preserving the WASM runtime assets produced by build:wasm.
for (const entry of readdirSync(distDir)) {
  if (entry === 'wasm') continue;
  rmSync(join(distDir, entry), { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// ESM bundle
// ---------------------------------------------------------------------------
const esm = await Bun.build({
  entrypoints: [join(root, 'src/index.ts')],
  outdir: join(root, 'dist'),
  format: 'esm',
  target: 'browser',
  // dotnet.js and WASM files are runtime-fetched — never bundle them.
  external: ['*.wasm', 'dotnet.js', 'dotnet.native.*', 'dotnet.runtime.*'],
  naming: {
    entry: 'index.js',
  },
  sourcemap: 'external',
  minify: true,
  define: versionDefine,
});

if (!esm.success) {
  console.error('✗ ESM build failed:', esm.logs);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// CJS bundle
// ---------------------------------------------------------------------------
const cjs = await Bun.build({
  entrypoints: [join(root, 'src/index.ts')],
  outdir: join(root, 'dist'),
  format: 'cjs',
  target: 'browser',
  external: ['*.wasm', 'dotnet.js', 'dotnet.native.*', 'dotnet.runtime.*'],
  naming: {
    entry: 'index.cjs',
  },
  sourcemap: 'external',
  minify: true,
  define: versionDefine,
});

if (!cjs.success) {
  console.error('✗ CJS build failed:', cjs.logs);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// TypeScript declarations (tsc --emitDeclarationOnly)
// ---------------------------------------------------------------------------
console.log('▶ Generating TypeScript declarations…');
await $`bun x tsc --emitDeclarationOnly --declaration --declarationMap --outDir dist --rootDir src --module NodeNext --moduleResolution NodeNext --target ES2022 --lib ES2022,DOM src/index.ts`.cwd(root);

console.log('✓ Build complete → dist/');
