import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

interface AIChatPanelProps {
  fileId?: string;
  projectId?: string;
  context?: string;
}

export function AIChatPanel({ projectId, context }: AIChatPanelProps) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setError(null);

    // Declare assistantMessage outside try block so it's accessible in catch/finally
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    try {
      setMessages(prev => [...prev, assistantMessage]);

      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [
            ...messages.filter(m => m.role !== 'system'),
            { role: 'user', content: currentInput },
          ],
          project_id: projectId,
          file_context: context,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
                  setMessages(prev => prev.map(m =>
                    m.id === assistantMessage.id
                      ? { ...m, content: m.content + data.token }
                      : m
                  ));
                }
                if (data.done) {
                  setMessages(prev => prev.map(m =>
                    m.id === assistantMessage.id
                      ? { ...m, isStreaming: false }
                      : m
                  ));
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e);
              }
            }
          } else if (line.startsWith('event: error')) {
            const dataLine = line.split('\n').find(l => l.startsWith('data: '));
            if (dataLine) {
              try {
                const data = JSON.parse(dataLine.slice(6));
                setError(data.error?.message || 'Unknown error');
                setMessages(prev => prev.map(m =>
                  m.id === assistantMessage.id
                    ? { ...m, isStreaming: false, content: m.content + '\n\n[Error: ' + (data.error?.message || 'Unknown error') + ']' }
                    : m
                ));
              } catch (e) {
                console.warn('Failed to parse error:', e);
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== assistantMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[var(--editor-bg)] rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[var(--text)] font-medium">AI Pair Programmer</h3>
        {isLoading && (
          <div className="w-4 h-4 border-2 border-[var(--ai)] border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto space-y-4 mb-4"
      >
        {messages.length === 0 && (
          <div className="text-center text-[var(--muted)] py-8">
            <p>Ask me anything about your code...</p>
            <p className="text-sm mt-2">Try: "Explain this function", "Add error handling", "Write tests"</p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageComponent key={msg.id} message={msg} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-2 bg-[var(--error)]/20 border border-[var(--error)] rounded text-[var(--error)] text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          rows={3}
          disabled={isLoading}
          className="flex-1 bg-[var(--app-bg)] border border-[var(--muted)]/30 rounded px-3 py-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)] resize-none disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-[var(--ai)] text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed self-end"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ChatMessageComponent({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-[var(--accent)]/20 text-[var(--text)] rounded-tr-none'
            : 'bg-[var(--app-bg)] text-[var(--text)] rounded-tl-none'
        }`}
      >
        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        {message.isStreaming && (
          <div className="flex items-center gap-1 mt-1 text-xs text-[var(--muted)]">
            <span className="w-3 h-3 bg-[var(--ai)] rounded-full animate-pulse" />
            <span>Generating...</span>
          </div>
        )}
      </div>
    </div>
  );
}