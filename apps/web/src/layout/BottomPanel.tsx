import { useState } from 'react';
import { WasmTerminal } from '@/terminal/WasmTerminal';
import { AIChatPanel } from '@/ai/AIChatPanel';

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'ai' | 'canvas'>('terminal');

  return (
    <div className="h-[30vh] bg-[var(--sidebar-bg)] border-t border-[var(--muted)]/20 flex flex-col">
      {/* Tab Bar */}
      <div className="flex px-4 border-b border-[var(--muted)]/20">
        {[
          { id: 'terminal', label: 'Terminal', icon: '💻' },
          { id: 'ai', label: 'AI Chat', icon: '🤖' },
          { id: 'canvas', label: 'Canvas', icon: '🎨' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
              activeTab === tab.id
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'terminal' && <WasmTerminal />}
        {activeTab === 'ai' && <AIChatPanel fileId="main.cpp" projectId="default-project" />}
        {activeTab === 'canvas' && <CanvasPanel />}
      </div>
    </div>
  );
}

function CanvasPanel() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-[var(--muted)] text-center">
        Architecture Canvas (Phase 6)
        <div className="text-sm mt-2">Excalidraw integration ready</div>
        <div className="text-xs mt-1 text-[var(--muted)]">
          Connects to Yjs provider for real-time collaboration
        </div>
      </div>
    </div>
  );
}