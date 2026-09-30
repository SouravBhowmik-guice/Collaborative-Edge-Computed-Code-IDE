# Wasm Core

C++ source code and Emscripten build script for WebAssembly module that powers the in-browser code execution terminal.

## Features

- **C++ to Wasm** — Compiled with Emscripten to run C++/Python in the browser sandbox
- **Exported Functions** — `_run_code` and `_free_result` for executing code and freeing memory
- **Memory Management** — Linear memory with manual allocation/deallocation
- **Secure Sandbox** — Runs in browser with no access to host system (except via explicit imports)
- **Performance Optimized** — Aggressive optimization flags, stripped symbols

## Project Structure

```
packages/wasm-core/
├── src/
│   └── executor.cpp          # Main C++ source
├── build/                    # Build output (executor.js, executor.wasm)
├── include/                  # Header files (if any)
├── build.sh                  # Emscripten build script
├── package.json              # npm scripts
└── ...                       # Additional sources
```

## Quick Start (Local)

```bash
# Install Emscripten SDK (if not installed)
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh

# Build Wasm module (from repo root)
npm run build:wasm

# Output: apps/web/public/wasm/executor.js and .wasm
```

## Build Script Details

The `build.sh` script:

1. Creates `build/` and `../../apps/web/public/wasm/` directories
2. Compiles `src/executor.cpp` with Emscripten flags:
   - `-s EXPORTED_FUNCTIONS='["_run_code", "_free_result"]'`
   - `-s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "stringToUTF8", "UTF8ToString"]'`
   - `-s ALLOW_MEMORY_GROWTH=1`
   - `-s MODULARIZE=1`
   - `-s 'EXPORT_NAME="createWasmModule"'`
   - `-O3` (optimization)
   - `--closure 1` (Google Closure Compiler for JS minification)
   - `-s ASSERTIONS=0` (disable assertions in production)
   - `-s STRIP=1` (strip debug symbols)
   - `-s SAFE_HEAP=1` (enable heap protection)

## Usage in Web App

The Wasm module is loaded dynamically in `apps/web/src/wasm/loader.ts`:

```typescript
import createWasmModule from '/wasm/createWasmModule';

// Initialize module
const wasmModule = await createWasmModule({
  // Optional: wasmBinary, wasmBinaryFile, etc.
});

// Execute code
const resultPtr = wasmModule._run_code(code);
const result = wasmModule.UTF8ToString(resultPtr);
wasmModule._free_result(resultPtr);
```

## Development

```bash
# Run tests (if any)
npm run test --filter=wasm-core

# Lint (none currently, but you can add clang-tidy, cpplint, etc.)

# Build
npm run build:wasm --filter=wasm-core

# Clean
rm -rf packages/wasm-core/build/*
rm -rf apps/web/public/wasm/*
```

## C++ Source (executor.cpp)

The executor provides:

```cpp
// Allocate memory for input string
char* allocate(int size) {
  char* ptr = (char*)_malloc(size);
  return ptr;
}

// Free memory allocated by _malloc
void deallocate(char* ptr) {
  _free(ptr);
}

// Execute code (simplified - actual implementation depends on language)
extern "char* _run_code(const char* code)" {
  // For demo: just echo back
  int len = strlen(code);
  char* out = allocate(len + 1);
  strcpy(out, code);
  return out;
}

// Free result string
extern "void _free_result(char* ptr)" {
  _free(ptr);
}
```

In practice, the executor would:
1. Parse the code to determine language (C++ vs Python)
2. For C++: Compile with Emscripten's `embind` or run via pre-compiled runtime
3. For Python: Use Pyodide or micropython port (currently placeholder)
4. Capture stdout/stderr
5. Return formatted output

## Deployment

The Wasm module is built as part of the CI/CD pipeline (GitHub Actions) and uploaded as an artifact, then served by Vercel from `apps/web/public/wasm/`.

See [root DEPLOYMENT.md](../DEPLOYMENT.md) for full deployment guide.

## License

MIT — see [../../LICENSE](../LICENSE) for details.