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
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pkg from './package.json';

const root = import.meta.dir;

// Injected into every bundle so cdn.ts can expose the package version
// without requiring a JSON import at runtime (keeps the bundle lean).
const versionDefine = { __DWGDXF_VERSION__: JSON.stringify(pkg.version) };
const distWasm = join(root, 'dist', 'wasm');

// Verify the WASM build has been run first.
if (!existsSync(distWasm)) {
  console.error(
    '✗ dist/wasm/ not found.\n  Run `bun run build:wasm` before `build:ts`.',
  );
  process.exit(1);
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
await $`bun x tsc --emitDeclarationOnly --declaration --declarationMap --outDir dist`.cwd(root);

console.log('✓ Build complete → dist/');
