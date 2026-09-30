import { useState, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useInlineCompletion, InlineCompletionDecoration } from '@/ai/InlineCompletion';
import { useContextService } from '@/ai/ContextService';
import { useAuth } from '@/hooks/useAuth';

export function EditorGroup() {
  const { token } = useAuth();
  const [code, setCode] = useState(`#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`);
  const [language, setLanguage] = useState('cpp');

  const editorRef = useRef<any>(null); // Use 'any' to avoid typing issues

  // AI Features
  const { suggestion, isLoading: completionLoading } =
    useInlineCompletion({
      editor: editorRef.current!,
      language,
      token: token || '',
    });

  const { formatContextForChat, queryRAG } =
    useContextService({
      editor: editorRef.current,
      openTabs: [],
      projectId: 'default-project',
    });

  // Handle editor mount
  const handleEditorMount = useCallback((editorInstance: any) => {
    if (editorInstance) {
      editorRef.current = editorInstance;
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[var(--editor-bg)]">
      {/* Tab Bar */}
      <div className="flex items-center px-4 py-2 border-b border-[var(--muted)]/20 bg-[var(--sidebar-bg)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-[var(--accent)]/20 rounded text-sm text-[var(--accent)]">
            <span>main.cpp</span>
            <button className="hover:text-[var(--error)] text-[var(--muted)]">✕</button>
          </div>
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-[var(--app-bg)] border border-[var(--muted)]/30 rounded px-2 py-1 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="cpp">C++</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
          </select>

          {/* AI Context Button */}
          <button
            onClick={() => {
              const context = formatContextForChat();
              navigator.clipboard.writeText(context);
              // Show toast notification
            }}
            className="px-3 py-1.5 bg-[var(--ai)]/20 text-[var(--ai)] rounded text-xs hover:bg-[var(--ai)]/30 transition-colors"
            title="Copy context for AI"
          >
            📋 Copy Context
          </button>

          {/* RAG Query Button */}
          <button
            onClick={async () => {
              const query = prompt('Enter your technical question:');
              if (query) {
                const context = await queryRAG(query);
                if (context) {
                  alert('RAG Context found:\n\n' + context.slice(0, 500) + '...');
                } else {
                  alert('No relevant context found');
                }
              }
            }}
            className="px-3 py-1.5 bg-[var(--success)]/20 text-[var(--success)] rounded text-xs hover:bg-[var(--success)]/30 transition-colors"
            title="Query project documentation (RAG)"
          >
            🔍 Query Docs
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(value) => value && setCode(value)}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            fontFamily: 'JetBrains Mono',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            // Enable inline completion suggestions
            inlineSuggest: { enabled: true },
            // Custom word wrap
            wordWrap: 'on',
            // Bracket matching
            matchBrackets: 'always',
            // Auto closing
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
          }}
        />

        {/* Ghost text decoration for inline completion */}
        {suggestion && (
          <InlineCompletionDecoration
            editor={editorRef.current}
            suggestion={suggestion}
          />
        )}

        {/* Loading indicator */}
        {completionLoading && (
          <div className="absolute bottom-4 right-4 bg-[var(--app-bg)]/90 backdrop-blur-sm px-3 py-1 rounded text-xs text-[var(--muted)] flex items-center gap-1">
            <span className="w-2 h-2 bg-[var(--ai)] rounded-full animate-pulse" />
            <span>AI thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}