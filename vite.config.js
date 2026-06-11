import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Plugin to fix the built HTML for CEP compatibility
function cepCompatPlugin() {
  return {
    name: 'cep-compat',
    closeBundle() {
      const htmlPath = resolve('dist/index.html');
      let html = readFileSync(htmlPath, 'utf-8');
      // Remove type="module" and crossorigin — CEP's old Chromium may not support them
      html = html.replace(/ type="module"/g, '');
      html = html.replace(/ crossorigin/g, '');
      // Move the app script to end of body so DOM is ready when it runs
      // (without type="module"/defer, scripts in <head> execute before <body> is parsed)
      const scriptMatch = html.match(/<script src="\.\/assets\/index\.js"><\/script>/);
      if (scriptMatch) {
        html = html.replace(scriptMatch[0], '');
        html = html.replace('</body>', scriptMatch[0] + '\n</body>');
      }
      writeFileSync(htmlPath, html);
    },
  };
}

export default defineConfig({
  plugins: [react(), cepCompatPlugin()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  publicDir: 'public',
});
