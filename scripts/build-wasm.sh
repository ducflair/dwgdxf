#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# build-wasm.sh — Publish the C# WASM project and copy assets to dist/wasm/
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
WASM_PROJECT="$PACKAGE_DIR/wasm/DwgDxf.csproj"
DIST_WASM="$PACKAGE_DIR/dist/wasm"

# Optional: set DWGDXF_AOT=true to enable AOT compilation (larger binary,
# faster runtime startup — useful for production deployments).
export DWGDXF_AOT="${DWGDXF_AOT:-false}"

echo "▶ dotnet publish — RID=browser-wasm  AOT=$DWGDXF_AOT"
dotnet publish "$WASM_PROJECT" \
  -c Release \
  -r browser-wasm \
  --self-contained true \
  -o "$PACKAGE_DIR/wasm/publish"

# The publish output structure for Microsoft.NET.Sdk + browser-wasm in .NET 9
# outputs everything directly into the publish folder (no AppBundle subdir).
# In older SDK versions it was publish/AppBundle/ — check both layouts.
PUBLISH_OUT="$PACKAGE_DIR/wasm/publish"
if [[ -d "$PUBLISH_OUT/AppBundle" ]]; then
  APP_BUNDLE="$PUBLISH_OUT/AppBundle"
else
  APP_BUNDLE="$PUBLISH_OUT"
fi

if [[ ! -d "$APP_BUNDLE" ]] || [[ -z "$(ls -A "$APP_BUNDLE")" ]]; then
  echo "Error: publish output directory not found or empty at $APP_BUNDLE" >&2
  echo "Run \`dotnet workload install wasm-tools\` if this is the first build." >&2
  exit 1
fi

echo "▶ Copying runtime assets → dist/wasm/"
rm -rf "$DIST_WASM"
mkdir -p "$DIST_WASM"

# ── Managed assemblies ────────────────────────────────────────────────────────
# Copy every .dll from the publish output.  With PublishTrimmed=false the full
# transitive closure of ACadSharp's references is present and all are required.
cp "$APP_BUNDLE"/*.dll "$DIST_WASM/"

# ── Compiled WebAssembly binary ───────────────────────────────────────────────
# The static libs (*.a) are already linked inside this file — they are not
# needed separately and must not be shipped.
cp "$APP_BUNDLE/dotnet.native.wasm" "$DIST_WASM/"

# ── JavaScript runtime layers ─────────────────────────────────────────────────
for js in dotnet.js dotnet.native.js dotnet.runtime.js \
           dotnet.es6.extpost.js dotnet.es6.lib.js dotnet.es6.pre.js; do
  [[ -f "$APP_BUNDLE/$js" ]] && cp "$APP_BUNDLE/$js" "$DIST_WASM/"
done
# dotnet.globalization.js is only emitted when InvariantGlobalization is false.
[[ -f "$APP_BUNDLE/dotnet.globalization.js" ]] && \
  cp "$APP_BUNDLE/dotnet.globalization.js" "$DIST_WASM/"

# ── Runtime configuration manifests ──────────────────────────────────────────
for cfg in DwgDxf.deps.json DwgDxf.runtimeconfig.json; do
  [[ -f "$APP_BUNDLE/$cfg" ]] && cp "$APP_BUNDLE/$cfg" "$DIST_WASM/"
done

# Intentionally excluded — present in publish output but not needed at runtime:
#   *.a                  Emscripten/Mono static libs (already in dotnet.native.wasm)
#   *.c / *.h            C source and header files
#   *.rsp                Emscripten linker response files
#   *.js.symbols         Profiling symbol tables
#   *.js.map             Developer source maps (not needed by end users)
#   *.d.ts               TypeScript host-API declarations
#   icudt*.dat           ICU locale data (unused with InvariantGlobalization=true)
#   package.json         Inner WASM package manifest
#   segmentation-rules.json / wasm-props.json / wasm-config.h  build metadata

# ---------------------------------------------------------------------------
# Generate blazor.boot.json
#
# .NET 9 browser-wasm (Microsoft.NET.Sdk, not BlazorWebAssembly) no longer
# emits blazor.boot.json automatically, but dotnet.js looks for it by default
# to discover what assemblies and WASM files to fetch.
# We generate the file from the publish output so the browser runtime can boot.
# ---------------------------------------------------------------------------
echo "▶ Generating blazor.boot.json"
python3 - "$DIST_WASM" <<'PYEOF'
import json, os, sys

wasm_dir = sys.argv[1]

assembly = {}
for f in sorted(os.listdir(wasm_dir)):
    if f.endswith('.dll'):
        assembly[f] = ''

has_globalization = os.path.exists(os.path.join(wasm_dir, 'dotnet.globalization.js'))

resources = {
    'assembly': assembly,
    'jsModuleNative':  {'dotnet.native.js':  ''},
    'jsModuleRuntime': {'dotnet.runtime.js': ''},
    'wasmNative':      {'dotnet.native.wasm': ''},
}
if has_globalization:
    resources['jsModuleGlobalization'] = {'dotnet.globalization.js': ''}

config = {
    'mainAssemblyName': 'DwgDxf',
    'globalizationMode': 'invariant',
    'resources': resources,
}

out = os.path.join(wasm_dir, 'blazor.boot.json')
with open(out, 'w') as fh:
    json.dump(config, fh, indent=2)
print(f'  wrote {out}')
PYEOF

echo "✓ WASM assets written to $DIST_WASM"
