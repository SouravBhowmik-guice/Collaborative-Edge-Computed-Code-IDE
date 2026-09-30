import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

describe('Web frontend stub', () => {
  beforeEach(() => {
    // Create a root element for React to mount to
    const rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders the app shell', async () => {
    // Import the App component directly (lazy import to avoid DOM mount)
    const { App } = await import('./main');

    render(React.createElement(App));

    const heading = screen.getByRole('heading', { name: /Collaborative IDE/i });
    expect(heading).toBeInTheDocument();
  });

  it('health check fetch mock works', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ status: 'ok' }),
      })
    );

    const response = await fetch('http://localhost:3001/api/v1/health');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/v1/health');
  });
});