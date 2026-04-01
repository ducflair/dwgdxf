/**
 * scripts/download-fixtures.ts
 *
 * Downloads the ACadSharp sample DWG files used by the Vitest browser tests.
 * Run with:  bun scripts/download-fixtures.ts
 *
 * Files are cached in tests/fixtures/ — already in .gitignore.
 * CI caches the directory between runs so downloads happen at most once per
 * cache key.
 *
 * Source: https://github.com/DomCR/ACadSharp (MIT-licensed)
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REMOTE_BASE =
  'https://github.com/DomCR/ACadSharp/raw/refs/heads/master/samples';

const LOCAL_DIR = join(import.meta.dir, '../tests/fixtures');

const FILES = [
  'sample_AC1014.dwg',
  'sample_AC1015.dwg',
  'sample_AC1018.dwg',
  'sample_AC1021.dwg',
  'sample_AC1024.dwg',
  'sample_AC1027.dwg',
  'sample_AC1032.dwg',
];

mkdirSync(LOCAL_DIR, { recursive: true });

for (const file of FILES) {
  const localPath = join(LOCAL_DIR, file);
  const url = `${REMOTE_BASE}/${file}`;
  console.log(`↓ fetching ${file}`);

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(localPath, buf);
  console.log(`  saved ${file} (${buf.length.toLocaleString()} B)`);
}

console.log(`\nAll fixtures ready in ${LOCAL_DIR}`);
