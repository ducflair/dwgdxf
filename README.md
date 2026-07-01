# dwgdxf

Client-side DWG → DXF converter that runs entirely in the browser or server. Powered by [acadrust](https://github.com/hakanaktt/acadrust) compiled to WebAssembly via Rust.

Supports DWG versions R13 through R2018 (AC1012–AC1032).


## Usage

By default, `init()` uses the local WASM assets from `dist/wasm` shipped inside the package. Most bundlers (Vite, Webpack 5, Rollup) automatically copy these assets to your build directory via the `new URL(...)` detection.

If you want to load the WASM assets from a public CDN to keep your application bundle completely free of WASM files, pass the OOTB `CDN_WASM_BASE` URL:

```ts
import { init, convertDwgToDxf, CDN_WASM_BASE } from 'dwgdxf';

// Option A: Initialise using CDN assets (no local configuration required)
await init({ wasmBase: CDN_WASM_BASE });

// Option B: Initialise using local assets (default)
// await init();

// Perform the conversion
const response = await fetch('/models/drawing.dwg');
const dwgBytes = new Uint8Array(await response.arrayBuffer());
const dxfBytes = await convertDwgToDxf(dwgBytes);

// Process the output
console.log('DXF data generated successfully, size:', dxfBytes.length);
```

#### Server Support
The loader automatically detects Node.js/Bun environments and falls back to reading WASM binaries directly using `fs` filesystem APIs since `fetch` on `file://` URLs is not supported out of the box in Node.js.

---

#### Credits

Parsing and serialization logic is handled by [acadrust](https://github.com/hakanaktt/acadrust) (MIT), a type-safe open-source Rust implementation of the DWG/DXF formats.
> `acadrust` and the v1 of this library was implement based on [ACadSharp](https://github.com/DomCR/ACadSharp)
