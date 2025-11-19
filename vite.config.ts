import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // Configuração padrão da raiz para funcionar com arquivos no diretório base
    root: '.', 
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    define: {
      // Garante que process.env.API_KEY funcione no navegador
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});