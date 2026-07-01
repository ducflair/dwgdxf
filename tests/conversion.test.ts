import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { init, convertDwgToDxf } from '../dist/index.js';

const FIXTURES_DIR = join(import.meta.dirname, 'fixtures');
const OUTPUT_DIR = join(import.meta.dirname, 'output');

beforeAll(async () => {
  // Initialize using the default local assets shipped with the package
  await init();
});

describe('convertDwgToDxf', () => {
  it('converts all fixtures to valid ASCII DXF', async () => {
    const dwgFiles = readdirSync(FIXTURES_DIR).filter((f) => f.toLowerCase().endsWith('.dwg'));
    expect(dwgFiles.length).toBeGreaterThan(0);

    for (const filename of dwgFiles) {
      const dwgPath = join(FIXTURES_DIR, filename);
      const dwg = readFileSync(dwgPath);
      expect(dwg.length).toBeGreaterThan(0);

      const dxf = await convertDwgToDxf(dwg);
      expect(dxf.length).toBeGreaterThan(512);

      const header = new TextDecoder('ascii').decode(dxf.subarray(0, 128));
      expect(header).toContain('SECTION');

      const tail = new TextDecoder('ascii').decode(dxf.subarray(Math.max(0, dxf.length - 16)));
      expect(tail).toContain('EOF');

      const name = filename.replace(/\.dwg$/i, '');
      mkdirSync(OUTPUT_DIR, { recursive: true });
      writeFileSync(join(OUTPUT_DIR, `${name}.dxf`), dxf);
    }
  });
});
