import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import type { editor } from 'monaco-editor';

export function bindMonacoYjs(
  monacoEditor: editor.IStandaloneCodeEditor,
  yjsDoc: Y.Text,
  _filePath: string
): () => void {
  // Bind Yjs document to Monaco editor
  const binding = new MonacoBinding(yjsDoc, monacoEditor.getModel()!, new Set());

  // Return dispose function
  return () => {
    binding.destroy();
  };
}