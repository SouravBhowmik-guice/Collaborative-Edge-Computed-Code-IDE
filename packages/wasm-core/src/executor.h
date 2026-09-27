/**
 * Wasm Executor - C++ Code Execution Engine
 * Compiled to WebAssembly via Emscripten
 */

#ifndef EXECUTOR_H
#define EXECUTOR_H

#include <string>
#include <cstdint>

extern "C" {

struct ExecutionResult {
    int exit_code;
    char* stdout_output;
    char* stderr_output;
    uint64_t execution_time_ms;
    bool memory_limit_exceeded;
    bool time_limit_exceeded;
};

ExecutionResult* run_code(const char* code, const char* language);
void free_result(ExecutionResult* result);

} // extern "C"

#endif // EXECUTOR_H