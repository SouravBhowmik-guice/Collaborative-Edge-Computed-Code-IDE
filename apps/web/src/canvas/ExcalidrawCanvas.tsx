import { useState, useEffect } from 'react';

interface ExcalidrawCanvasProps {
  projectId: string;
  fileId: string;
}

// This component provides a placeholder for the Excalidraw canvas
// The actual Excalidraw integration will be activated when dependencies are installed
export function ExcalidrawCanvas({ projectId, fileId }: ExcalidrawCanvasProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if Excalidraw is available
    const checkExcalidraw = async () => {
      try {
        // Dynamic import - will fail if not installed
        await import('@excalidraw/excalidraw');
        await import('y-excalidraw');
        setIsReady(true);
      } catch {
        // Dependencies not installed yet
        console.log('Excalidraw dependencies not installed');
      }
    };
    checkExcalidraw();
  }, []);

  if (!isReady) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--app-bg)]">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🎨</div>
          <h3 className="text-[var(--text)] text-xl mb-2">Architecture Canvas</h3>
          <p className="text-[var(--muted)] mb-4">
            Excalidraw canvas ready for integration
          </p>
          <p className="text-sm text-[var(--muted)] max-w-xs mx-auto">
            Will connect to Yjs provider for real-time collaborative diagramming
          </p>
          <div className="mt-6 p-4 bg-[var(--sidebar-bg)] rounded text-xs text-[var(--muted)] max-w-md mx-auto">
            <strong>Pending integration:</strong>
            <ul className="mt-2 space-y-1 text-left pl-4 list-disc">
              <li>@excalidraw/excalidraw + y-excalidraw</li>
              <li>Yjs binding for real-time sync</li>
              <li>PNG/SVG/Mermaid export</li>
              <li>Shape tools, sticky notes, connectors</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // When ready, render the actual canvas (placeholder for now)
  return (
    <div className="h-full w-full bg-[var(--app-bg)]">
      <p className="p-4 text-center text-[var(--muted)]">Excalidraw canvas loaded</p>
    </div>
  );
}