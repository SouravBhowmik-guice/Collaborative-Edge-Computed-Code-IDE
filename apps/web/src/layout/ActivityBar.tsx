
export function ActivityBar() {
  const icons = [
    { name: 'Explorer', icon: '📁' },
    { name: 'Search', icon: '🔍' },
    { name: 'Source Control', icon: '📦' },
    { name: 'Run', icon: '▶️' },
    { name: 'Extensions', icon: '🧩' },
  ];

  return (
    <div className="w-12 h-full bg-[var(--sidebar-bg)] border-r border-[var(--muted)]/20 flex flex-col items-center justify-start p-2 gap-2">
      {icons.map(({ name, icon }) => (
        <button
          key={name}
          title={name}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--accent)]/20 text-[var(--text)] text-xl transition-colors"
        >
          {icon}
        </button>
      ))}
    </div>
  );
}