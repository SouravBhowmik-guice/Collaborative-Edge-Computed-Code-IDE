import { useState, useCallback } from 'react';
import type { editor } from 'monaco-editor';
import { useAuth } from '@/hooks/useAuth';

interface FileContext {
  path: string;
  content: string;
  language: string;
  isCurrent: boolean;
}

interface AIContext {
  currentFile: FileContext | null;
  openFiles: FileContext[];
  projectStructure?: string;
  selectedText?: string;
}

interface ContextServiceOptions {
  editor: editor.IStandaloneCodeEditor | null;
  openTabs: Array<{ path: string; model: editor.ITextModel }>;
  projectId?: string;
  projectStructure?: string;
  maxTokens?: number;
}

const MAX_CONTEXT_TOKENS = 8000;
const TOKEN_ESTIMATE = 4; // ~4 chars per token for code

export function useContextService({
  editor,
  openTabs,
  projectId,
  projectStructure,
  maxTokens = MAX_CONTEXT_TOKENS,
}: ContextServiceOptions) {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Get current file context
  const getCurrentFileContext = useCallback((): FileContext | null => {
    if (!editor) return null;

    const model = editor.getModel();
    if (!model) return null;

    const path = model.uri.toString();
    const content = model.getValue();
    const language = model.getLanguageId();

    return {
      path,
      content,
      language,
      isCurrent: true,
    };
  }, [editor]);

  // Get all open files context
  const getOpenFilesContext = useCallback((): FileContext[] => {
    if (!openTabs || openTabs.length === 0) return [];

    return openTabs.map(({ path, model }) => ({
      path,
      content: model.getValue(),
      language: model.getLanguageId(),
      isCurrent: false,
    }));
  }, [openTabs]);

  // Build context string for AI requests
  const buildContextString = useCallback((): string => {
    const parts: string[] = [];
    let estimatedTokens = 0;

    // Add project structure if available
    if (projectStructure) {
      const structureTokens = Math.ceil(projectStructure.length / TOKEN_ESTIMATE);
      if (estimatedTokens + structureTokens <= maxTokens) {
        parts.push(`## Project Structure\n${projectStructure}\n`);
        estimatedTokens += structureTokens;
      }
    }

    // Add current file (highest priority)
    const currentFile = getCurrentFileContext();
    if (currentFile) {
      const fileContent = `## Current File: ${currentFile.path}\n\`\`\`${currentFile.language}\n${currentFile.content}\n\`\`\`\n`;
      const fileTokens = Math.ceil(fileContent.length / TOKEN_ESTIMATE);
      if (estimatedTokens + fileTokens <= maxTokens) {
        parts.push(fileContent);
        estimatedTokens += fileTokens;
      }
    }

    // Add other open files (lower priority)
    const openFiles = getOpenFilesContext().filter(f =>
      !currentFile || f.path !== currentFile.path
    );

    for (const file of openFiles) {
      const fileContent = `## Open File: ${file.path}\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n`;
      const fileTokens = Math.ceil(fileContent.length / TOKEN_ESTIMATE);
      if (estimatedTokens + fileTokens <= maxTokens) {
        parts.push(fileContent);
        estimatedTokens += fileTokens;
      } else {
        // Truncate file content to fit
        const remainingTokens = maxTokens - estimatedTokens;
        const maxChars = remainingTokens * TOKEN_ESTIMATE;
        if (maxChars > 200) {
          const truncated = file.content.slice(0, maxChars) + '\n... (truncated)';
          parts.push(`## Open File: ${file.path}\n\`\`\`${file.language}\n${truncated}\n\`\`\`\n`);
        }
        break;
      }
    }

    return parts.join('\n');
  }, [getCurrentFileContext, getOpenFilesContext, projectStructure, maxTokens]);

  // Get selected text in editor
  const getSelectedText = useCallback((): string | undefined => {
    if (!editor) return undefined;
    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) return undefined;
    return editor.getModel()?.getValueInRange(selection);
  }, [editor]);

  // Build full context for AI request
  const buildAIContext = useCallback((): AIContext => {
    return {
      currentFile: getCurrentFileContext(),
      openFiles: getOpenFilesContext(),
      projectStructure,
      selectedText: getSelectedText(),
    };
  }, [getCurrentFileContext, getOpenFilesContext, projectStructure, getSelectedText]);

  // Format context for different AI request types
  const formatContextForChat = useCallback((): string => {
    return buildContextString();
  }, [buildContextString]);

  const formatContextForCompletion = useCallback((): string => {
    const context = buildContextString();
    const currentFile = getCurrentFileContext();
    const selectedText = getSelectedText();

    let result = context;

    if (selectedText) {
      result += `\n## Selected Text\n\`\`\`${currentFile?.language || 'text'}\n${selectedText}\n\`\`\`\n`;
    }

    // Add cursor position context
    if (editor) {
      const position = editor.getPosition();
      if (position) {
        result += `\n## Cursor Position\nLine: ${position.lineNumber}, Column: ${position.column}\n`;
      }
    }

    return result;
  }, [buildContextString, getCurrentFileContext, getSelectedText, editor]);

  // RAG query for project-specific knowledge
  const queryRAG = useCallback(async (query: string): Promise<string | null> => {
    if (!projectId || !token) return null;

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/ai/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
          project_id: projectId,
        }),
      });

      if (!response.ok) {
        throw new Error(`RAG query failed: ${response.status}`);
      }

      const data = await response.json();
      return data.context || null;
    } catch (err) {
      console.error('RAG query error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, token]);

  return {
    getCurrentFileContext,
    getOpenFilesContext,
    buildContextString,
    buildAIContext,
    formatContextForChat,
    formatContextForCompletion,
    getSelectedText,
    queryRAG,
    isLoading,
  };
}

/**
 * Token estimation utilities
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / TOKEN_ESTIMATE);
}

export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * TOKEN_ESTIMATE;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n... (truncated)';
}