import { defineConfig } from 'vite';
import { terminologyVitePlugin } from '@forschungsgruppe-digital-health/terminology/vite';

const ENABLE_PACKAGE_DISCOVERY = false;

export default defineConfig({
  base: '/bpmn-js-clinical-semantics/',
  resolve: {
    preserveSymlinks: true
  },
  plugins: [
    ENABLE_PACKAGE_DISCOVERY ? terminologyVitePlugin() : null
  ].filter(Boolean),
  build: {
    outDir: '../../site',
    emptyOutDir: true,
    sourcemap: true
  }
});
