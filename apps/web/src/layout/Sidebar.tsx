
export function Sidebar() {
  return (
    <div className="w-64 h-full bg-[var(--sidebar-bg)] border-r border-[var(--muted)]/20 flex flex-col">
      <div className="p-4 border-b border-[var(--muted)]/20">
        <h3 className="text-[var(--text)] font-medium text-sm uppercase tracking-wider">EXPLORER</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <SidebarRow name="main.cpp" />
        <SidebarRow name="utils.h" />
        <SidebarRow name="README.md" />
      </div>
    </div>
  );
}

function SidebarRow({ name }: { name: string }) {
  return (
    <div className="px-2 py-1.5 rounded text-sm text-[var(--text)] hover:bg-[var(--muted)]/10 cursor-pointer flex items-center gap-2">
      <span className="text-[var(--muted)]">📄</span>
      <span>{name}</span>
    </div>
  );
}