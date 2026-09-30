import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return (
    <div className="App">
      <h1>Collaborative IDE</h1>
      <p>Welcome to the IDE frontend</p>
    </div>
  );
}

function mount() {
  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Only mount when run directly (not imported)
if (typeof document !== 'undefined') {
  mount();
}

export { App };