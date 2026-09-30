import { useState } from 'react';
import { executeCode } from '@/wasm/loader';

export function WasmTerminal() {
  const [code, setCode] = useState('int main(){return 42;}');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const res = await executeCode(code, 'cpp');
    const out = `exit: ${res.exit_code}\nstdout:\n${res.stdout_output}\nstderr:\n${res.stderr_output}`;
    setOutput(out);
    setRunning(false);
  };

  return (
    <div className="h-full w-full p-4 font-mono" style={{ background: 'var(--editor-bg)', color: 'var(--text)' }}>
      <h3 className="mb-2">Wasm Terminal</h3>
      <textarea
        rows={4}
        className="w-full mb-2 p-2 rounded"
        style={{ background: 'var(--app-bg)', color: 'var(--text)' }}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button
        onClick={run}
        disabled={running}
        className="px-4 py-2 bg-[var(--accent)]/20 text-[var(--accent)] rounded hover:bg-[var(--accent)]/30 transition-colors disabled:opacity-50"
      >
        {running ? 'Running…' : 'Run'}
      </button>
      <pre className="mt-4 p-2 rounded whitespace-pre-wrap" style={{ background: 'var(--app-bg)' }}>{output}</pre>
    </div>
  );
}