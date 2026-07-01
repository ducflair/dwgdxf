import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { convertDwgToDxf } from './index.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(`
Usage: npx dwgdxf <input-file.dwg> [output-file.dxf]

Options:
  -h, --help     Show this help message
  -v, --version  Show version number
    `);
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('dwgdxf CLI v1.0.0');
    process.exit(0);
  }

  const inputPath = args[0];
  if (!inputPath) {
    console.error('Error: Missing input file path.');
    process.exit(1);
  }

  const resolvedInput = resolve(inputPath);
  if (!existsSync(resolvedInput)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  let outputPath = args[1];
  if (!outputPath) {
    const ext = extname(inputPath);
    outputPath = inputPath.slice(0, inputPath.length - ext.length) + '.dxf';
  }

  const resolvedOutput = resolve(outputPath);

  try {
    console.log(`Reading: ${inputPath}...`);
    const dwgBuffer = readFileSync(resolvedInput);

    console.log('Converting to DXF...');
    const start = performance.now();
    const dxfBuffer = await convertDwgToDxf(dwgBuffer);
    const duration = ((performance.now() - start) / 1000).toFixed(2);

    console.log(`Writing: ${outputPath}...`);
    writeFileSync(resolvedOutput, dxfBuffer);

    console.log(`✓ Success! Converted in ${duration}s.`);
  } catch (err: any) {
    console.error('Conversion failed:', err.message || err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
