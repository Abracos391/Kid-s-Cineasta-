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
      // Aumenta o limite de aviso para chunks grandes, comum em apps com muitas deps
      chunkSizeWarningLimit: 1600,
    },
    define: {
      // Garante que process.env.API_KEY funcione no navegador sem quebrar o build
      // Se env.API_KEY não existir, define como undefined para não quebrar a sintaxe
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});