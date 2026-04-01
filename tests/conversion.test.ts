import { commands } from '@vitest/browser/context';
import { init, convertDwgToDxf } from '../src/index.js';

declare module '@vitest/browser/context' {
  interface BrowserCommands {
    listFixtures(): Promise<string[]>;
    saveDxf(name: string, content: string): Promise<void>;
  }
}

const WASM_BASE = '/dist/wasm';
const FIXTURES_BASE = '/tests/fixtures';

// Discovered server-side so filenames with spaces or special chars work fine.
let dwgFiles: string[] = [];

beforeAll(async () => {
  [dwgFiles] = await Promise.all([
    commands.listFixtures(),
    init({ wasmBase: WASM_BASE }),
  ]);
}, 90_000);

describe('convertDwgToDxf', () => {
  it('converts all fixtures to valid ASCII DXF', async () => {
    expect(dwgFiles.length).toBeGreaterThan(0);

    for (const filename of dwgFiles) {
      const url = `${FIXTURES_BASE}/${encodeURIComponent(filename)}`;
      const res = await fetch(url);
      expect(res.ok, `fixture fetch failed: ${res.status} ${res.url}`).toBe(true);

      const dwg = new Uint8Array(await res.arrayBuffer());
      expect(dwg.length).toBeGreaterThan(0);

      const dxf = await convertDwgToDxf(dwg, { wasmBase: WASM_BASE });

      expect(dxf.length).toBeGreaterThan(512);

      const header = new TextDecoder('ascii').decode(dxf.subarray(0, 128));
      expect(header).toContain('SECTION');

      const tail = new TextDecoder('ascii').decode(dxf.subarray(Math.max(0, dxf.length - 16)));
      expect(tail).toContain('EOF');

      const name = filename.replace(/\.dwg$/i, '');
      await commands.saveDxf(name, new TextDecoder('ascii').decode(dxf));
    }
  }, 5 * 60_000);
});
