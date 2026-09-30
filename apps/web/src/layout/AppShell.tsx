import { ActivityBar } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { EditorGroup } from '@/editor/EditorGroup';
import { BottomPanel } from './BottomPanel';

export function AppShell() {
  return (
    <div className="h-screen w-screen bg-[var(--app-bg)] text-[var(--text)] font-mono overflow-hidden">
      {/* CSS Grid Layout */}
      <div className="grid h-full w-full" style={{
        gridTemplateRows: '48px 1fr 30vh',
        gridTemplateColumns: '48px 250px 1fr',
        gridTemplateAreas: `
          "nav nav nav"
          "activity sidebar editor"
          "activity panel panel"
        `
      }}>
        {/* Top Nav Bar */}
        <nav className="bg-[var(--sidebar-bg)] border-b border-[var(--muted)]/20 flex items-center justify-between px-4" style={{ gridArea: 'nav' }}>
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg text-[var(--accent)]">IDE</span>
            <span className="text-sm text-[var(--muted)]">main.cpp</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-3 py-1.5 bg-[var(--accent)]/20 text-[var(--accent)] rounded text-sm hover:bg-[var(--accent)]/30 transition-colors">
              Run
            </button>
            <div className="w-8 h-8 rounded-full bg-[var(--muted)]/30 flex items-center justify-center text-sm">
              SB
            </div>
          </div>
        </nav>

        {/* Left Activity Bar */}
        <div style={{ gridArea: 'activity' }}>
          <ActivityBar />
        </div>

        {/* Sidebar */}
        <div style={{ gridArea: 'sidebar' }}>
          <Sidebar />
        </div>

        {/* Editor Area */}
        <div style={{ gridArea: 'editor' }}>
          <EditorGroup />
        </div>

        {/* Bottom Panel */}
        <div style={{ gridArea: 'panel' }}>
          <BottomPanel />
        </div>
      </div>
    </div>
  );
}