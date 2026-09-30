import { run_code, ExecutionResult } from './executor';

/**
 * Wasm execution loader.
 * In a real build this would import the Emscripten-generated module
 * from the public wasm folder. For Phase 2 we use a TypeScript mock.
 */
export async function executeCode(code: string, language: string): Promise<ExecutionResult> {
  // The mock run_code is synchronous, but we wrap it for API consistency.
  return run_code(code, language);
}