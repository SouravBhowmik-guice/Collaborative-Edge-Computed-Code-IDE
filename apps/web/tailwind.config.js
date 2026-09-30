/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'var(--app-bg)',
          editor: 'var(--editor-bg)',
          sidebar: 'var(--sidebar-bg)',
        },
        accent: 'var(--accent)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        ai: 'var(--ai)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}