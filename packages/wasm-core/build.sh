#!/bin/bash
# Emscripten Build Script for Wasm Core

set -e

echo "🔧 Building Wasm module with Emscripten..."

# Check for emsdk
if ! command -v emcc &> /dev/null; then
    echo "❌ Emscripten not found. Please install emsdk:"
    echo "   git clone https://github.com/emscripten-core/emsdk.git"
    echo "   cd emsdk && ./emsdk install latest && ./emsdk activate latest"
    echo "   source ./emsdk_env.sh"
    exit 1
fi

# Build directory
BUILD_DIR="build"
OUTPUT_DIR="../../apps/web/public/wasm"

mkdir -p "$BUILD_DIR"
mkdir -p "$OUTPUT_DIR"

cd "$BUILD_DIR"

# Compile with Emscripten
emcc ../src/executor.cpp \
    -o executor.js \
    -s EXPORTED_FUNCTIONS='["_run_code", "_free_result"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "stringToUTF8", "UTF8ToString"]' \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='ExecutorModule' \
    -s ENVIRONMENT='web' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=128MB \
    -s MAXIMUM_MEMORY=512MB \
    -s STACK_SIZE=5MB \
    -s EXPORT_ES6=0 \
    -O3 \
    -Wall \
    -Wextra

# Copy output files
cp executor.js "$OUTPUT_DIR/"
cp executor.wasm "$OUTPUT_DIR/"

echo "✅ Wasm build complete!"
echo "   Output: $OUTPUT_DIR/executor.js"
echo "   Output: $OUTPUT_DIR/executor.wasm"

# Show file sizes
ls -lh "$OUTPUT_DIR/"