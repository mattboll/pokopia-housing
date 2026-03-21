import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pokopia-housing/',
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
