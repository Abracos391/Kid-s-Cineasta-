import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do .env (se existir) ou do sistema (Render)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
    },
    define: {
      // Garante que process.env.API_KEY funcione no navegador
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});