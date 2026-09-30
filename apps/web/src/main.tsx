import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppShell } from './layout/AppShell';
import { AuthProvider } from './hooks/useAuth';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
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

if (typeof document !== 'undefined') {
  mount();
}

export { App };