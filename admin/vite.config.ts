import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** Resolve a single React copy so shared/ contexts share the same dispatcher as the app. */
function resolvePkg(name: string): string {
  try {
    return path.dirname(require.resolve(`${name}/package.json`));
  } catch {
    // fallback: monorepo root node_modules
    return path.resolve(__dirname, '../node_modules', name);
  }
}

const reactRoot = resolvePkg('react');
const reactDomRoot = resolvePkg('react-dom');

export default defineConfig({
  server: {
    port: 5174,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@shared': path.resolve(__dirname, '../shared'),
      react: reactRoot,
      'react-dom': reactDomRoot,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },
  },
});
