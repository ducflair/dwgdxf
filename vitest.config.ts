import { writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';
import type { BrowserCommandContext } from 'vitest/node';

export default defineConfig({
  server: {
    // Allow Vite's dev server to serve files from the whole package root,
    // including dist/wasm/ (WASM assets) and tests/fixtures/ (DWG files).
    fs: { allow: ['.'] },
  },
  test: {
    globals: true,
    // Run tests in a real Chromium browser so the .NET WASM runtime works
    // exactly as it would for end users.
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [{ browser: 'chromium' }],
      commands: {
        async listFixtures(_ctx: BrowserCommandContext): Promise<string[]> {
          const dir = join(process.cwd(), 'tests/fixtures');
          const entries = await readdir(dir);
          return entries.filter((f) => f.toLowerCase().endsWith('.dwg'));
        },
        async saveDxf(_ctx: BrowserCommandContext, name: string, content: string) {
          const outDir = join(process.cwd(), 'tests/output');
          await mkdir(outDir, { recursive: true });
          await writeFile(join(outDir, `${name}.dxf`), content, 'ascii');
        },
      },
    },
    // Allow generous timeouts: WASM boot can take several seconds on CI.
    testTimeout: 60_000,
    hookTimeout: 90_000,
  },
});
