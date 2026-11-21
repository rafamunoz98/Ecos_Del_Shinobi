import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Ruta relativa: sirve para GitHub Pages y para un futuro empaquetado con Capacitor.
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    include: ['src/tests/**/*.test.ts'],
    environment: 'node',
    // Las pruebas que recorren cientos de semillas del generador tardan más en los servidores de CI.
    testTimeout: 60_000,
  },
});
