import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: [
        '**/.git/**',
        '**/.agents/**',
        '**/.pytest_cache/**',
        '**/.tmp*',
        '**/.tmp*/**',
        '**/.tmp-test-temp/**',
        '**/.tmp_test_media/**',
        '**/.tmp_test_seed/**',
        '**/.venv/**',
        '**/__pycache__/**',
        '**/apps/**',
        '**/backups/**',
        '**/core/**',
        '**/dist/**',
        '**/docker/**',
        '**/docs/**',
        '**/media/**',
        '**/noramativa_exelencia_academica/**',
        '**/normativa_examen_de_grrado/**',
        '**/normativa_proyecto_de_grado/**',
        '**/normativa_tesis_de_grado/**',
        '**/normativa_trabajo_dirigido/**',
        '**/normativa_via_diplomado/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/__tests__/**',
        '**/testing_backend/**',
        '**/uab/**',
        '**/validation-*.local/**',
        '**/reporte_postulaciones_muestra.html',
      ],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.js',
    clearMocks: true,
  },
})
