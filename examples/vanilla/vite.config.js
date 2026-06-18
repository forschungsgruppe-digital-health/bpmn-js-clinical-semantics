import { defineConfig } from 'vite';

export default defineConfig({
  base: '/bpmn-js-clinical-semantics/',
  build: {
    outDir: '../../site',
    emptyOutDir: true,
    sourcemap: true
  }
});
