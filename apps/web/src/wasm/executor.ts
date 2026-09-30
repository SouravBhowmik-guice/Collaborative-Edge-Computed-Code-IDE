export interface ExecutionResult {
  exit_code: number;
  stdout_output: string;
  stderr_output: string;
  execution_time_ms: number;
  memory_limit_exceeded: boolean;
  time_limit_exceeded: boolean;
}

export function run_code(code: string, _language: string): ExecutionResult {
  // Very simple mock implementation: extract a number after "return"
  const match = /return\s+(\d+)/.exec(code);
  const stdout = match ? match[1] : "Executed";
  return {
    exit_code: 0,
    stdout_output: stdout,
    stderr_output: "",
    execution_time_ms: 1,
    memory_limit_exceeded: false,
    time_limit_exceeded: false,
  };
}