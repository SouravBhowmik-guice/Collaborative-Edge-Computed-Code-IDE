import type { Position } from 'monaco-editor';

interface RemoteCursorProps {
  userId: string;
  userName: string;
  color: string;
  position: Position | null;
}

export function RemoteCursor({ userName, color, position }: RemoteCursorProps) {
  if (!position) {
    return null;
  }

  // Convert Monaco position to pixel coordinates (approximation)
  const lineHeight = 20;
  const charWidth = 10;

  const left = position.column * charWidth + 2;
  const top = position.lineNumber * lineHeight + 2;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left,
        top,
        width: 2,
        height: lineHeight,
        backgroundColor: color,
        zIndex: 1000,
      }}
      title={`${userName}'s cursor`}
    >
      <div className="absolute -top-4 left-0 bg-[color] text-white text-xs px-1 py-0 rounded">
        {userName[0].toUpperCase()}
      </div>
    </div>
  );
}