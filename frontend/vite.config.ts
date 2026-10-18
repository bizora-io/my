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
    port: 5173,
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
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
  build: {
    minify: 'esbuild',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
});
