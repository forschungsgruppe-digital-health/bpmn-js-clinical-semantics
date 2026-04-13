import { defineConfig } from 'vite';

export default defineConfig({
  base: '/bpmn-js-clinical-semantics/',
  build: {
    outDir: '../../docs',
    emptyOutDir: true,
    sourcemap: true
  }
});
