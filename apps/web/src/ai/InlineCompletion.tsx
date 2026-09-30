import { useState, useEffect, useRef, useCallback } from 'react';
import * as monaco from 'monaco-editor';

interface InlineCompletionOptions {
  editor: monaco.editor.IStandaloneCodeEditor;
  language: string;
  token: string;
}

interface CompletionSuggestion {
  text: string;
  position: monaco.Position;
}

/**
 * Inline Completion (Ghost Text) for Monaco Editor
 * Shows AI suggestions as gray text ahead of cursor
 * Press Tab to accept, Escape to dismiss
 */
export function useInlineCompletion({
  editor,
  language,
  token,
}: InlineCompletionOptions) {
  const [suggestion, setSuggestion] = useState<CompletionSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestRef = useRef<string>('');
  const disposedRef = useRef(false);

  // Fetch completion from AI API
  const fetchCompletion = useCallback(async (code: string, position: monaco.Position) => {
    if (isLoading || disposedRef.current) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/ai/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: code,
          language,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completionText = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: token')) {
            const dataLine = line.split('\n').find(l => l.startsWith('data: '));
            if (dataLine) {
              try {
                const data = JSON.parse(dataLine.slice(6));
                if (data.token) {
                  completionText += data.token;
                }
                if (data.done) {
                  break;
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }

      if (completionText && !disposedRef.current) {
        setSuggestion({ text: completionText, position });
      }
    } catch (err) {
      console.error('Completion fetch error:', err);
    } finally {
      if (!disposedRef.current) {
        setIsLoading(false);
      }
    }
  }, [language, token, isLoading]);

  // Debounced request trigger
  const triggerCompletion = useCallback((code: string, position: monaco.Position) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Create a request fingerprint to avoid duplicate requests
    const requestKey = `${code}-${position.lineNumber}-${position.column}`;
    if (requestKey === lastRequestRef.current) return;
    lastRequestRef.current = requestKey;

    debounceRef.current = setTimeout(() => {
      fetchCompletion(code, position);
    }, 300); // 300ms debounce
  }, [fetchCompletion]);

  // Handle editor changes
  useEffect(() => {
    if (!editor || disposedRef.current) return;

    const handleCursorPositionChange = () => {
      const position = editor.getPosition();
      if (!position) return;

      // Get surrounding context (50 lines before cursor)
      const model = editor.getModel();
      if (!model) return;

      const startLine = Math.max(1, position.lineNumber - 50);
      const endLine = position.lineNumber;
      const code = model.getValueInRange({
        startLineNumber: startLine,
        startColumn: 1,
        endLineNumber: endLine,
        endColumn: model.getLineMaxColumn(endLine),
      });

      triggerCompletion(code, position);
    };

    // Listen to cursor position changes
    const cursorListener = editor.onDidChangeCursorPosition(handleCursorPositionChange);

    // Also listen to content changes to cancel stale requests
    const contentListener = editor.onDidChangeModelContent(() => {
      if (suggestion) {
        setSuggestion(null); // Clear suggestion when user types
      }
    });

    return () => {
      cursorListener.dispose();
      contentListener.dispose();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [editor, suggestion, triggerCompletion]);

  // Handle keyboard events for accepting/dismissing
  useEffect(() => {
    if (!editor || disposedRef.current) return;

    const keyDownListener = editor.onKeyDown((e) => {
      if (suggestion && e.keyCode === 9 /* Tab */) {
        // Accept completion
        const position = editor.getPosition();
        if (position) {
          editor.executeEdits('inline-completion', [{
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            text: suggestion.text,
            forceMoveMarkers: true,
          }]);
        }
        setSuggestion(null);
        e.preventDefault();
      } else if (suggestion && e.keyCode === 27 /* Escape */) {
        // Dismiss completion
        setSuggestion(null);
        e.preventDefault();
      }
    });

    return () => {
      keyDownListener.dispose();
    };
  }, [editor, suggestion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposedRef.current = true;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    suggestion,
    isLoading,
    acceptCompletion: () => {
      if (suggestion) {
        const position = editor.getPosition();
        if (position) {
          editor.executeEdits('inline-completion', [{
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            text: suggestion.text,
            forceMoveMarkers: true,
          }]);
        }
        setSuggestion(null);
      }
    },
    dismissCompletion: () => setSuggestion(null),
  };
}

/**
 * Component to render ghost text decoration in Monaco Editor
 */
export function InlineCompletionDecoration({
  editor,
  suggestion,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  suggestion: CompletionSuggestion | null;
}) {
  useEffect(() => {
    if (!editor || !suggestion) return;

    const decorationId = editor.deltaDecorations([], [{
      range: {
        startLineNumber: suggestion.position.lineNumber,
        startColumn: suggestion.position.column,
        endLineNumber: suggestion.position.lineNumber,
        endColumn: suggestion.position.column,
      },
      options: {
        beforeContentClassName: 'inline-completion-ghost',
        showIfCollapsed: true,
        zIndex: 100,
      },
    }]);

    return () => {
      if (editor) {
        editor.deltaDecorations(decorationId, []);
      }
    };
  }, [editor, suggestion]);

  return null;
}