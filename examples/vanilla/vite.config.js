import { defineConfig } from 'vite';

export default defineConfig({
  base: '/bpmn-js-clinical-semantics/',
  resolve: {
    preserveSymlinks: true
  },
  build: {
    outDir: '../../site',
    emptyOutDir: true,
    sourcemap: true
  }
});
