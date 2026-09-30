import { describe, it, expect } from 'vitest';
import { executeCode } from '@/wasm/loader';

describe('Wasm loader', () => {
  it('should return an ExecutionResult with exit_code 0 and stdout containing the return value', async () => {
    const result = await executeCode('int main(){return 42;}', 'cpp');
    expect(result).toHaveProperty('exit_code', 0);
    expect(result.stdout_output).toContain('42');
    expect(result).toHaveProperty('stderr_output', '');
    expect(result).toHaveProperty('execution_time_ms', 1);
    expect(result).toHaveProperty('memory_limit_exceeded', false);
    expect(result).toHaveProperty('time_limit_exceeded', false);
  });

  it('should return a default message when no return statement is found', async () => {
    const result = await executeCode('int main(){}', 'cpp');
    expect(result.exit_code).toBe(0);
    expect(result.stdout_output).toBe('Executed');
  });
});