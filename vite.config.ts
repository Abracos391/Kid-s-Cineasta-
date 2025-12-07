
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 1. Carrega variáveis de arquivos .env (se existirem)
  const envFile = loadEnv(mode, (process as any).cwd(), '');

  // 2. Estratégia de Prioridade para Chaves:
  // Tenta pegar do ambiente do sistema (Render) PRIMEIRO (process.env)
  // Verifica tanto SHOTSTACK_API_KEY quanto VITE_SHOTSTACK_API_KEY
  const shotstackKey = 
    process.env.SHOTSTACK_API_KEY || 
    process.env.VITE_SHOTSTACK_API_KEY || 
    envFile.SHOTSTACK_API_KEY || 
    envFile.VITE_SHOTSTACK_API_KEY || 
    '';

  const geminiKey = 
    process.env.API_KEY || 
    process.env.VITE_API_KEY ||
    envFile.API_KEY || 
    envFile.VITE_API_KEY || 
    '';

  // Logs visíveis apenas no terminal de build do Render
  console.log('--- VITE BUILD CONFIG ---');
  console.log(`Mode: ${mode}`);
  console.log(`Shotstack Key encontrada? ${shotstackKey ? 'SIM (Len: ' + shotstackKey.length + ')' : 'NÃO'}`);
  console.log(`Gemini Key encontrada? ${geminiKey ? 'SIM' : 'NÃO'}`);
  console.log('-------------------------');

  return {
    plugins: [react()],
    root: '.',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    define: {
      // Injeta as variáveis no código final do navegador
      // JSON.stringify é crucial para que virem strings literais no bundle
      'process.env.API_KEY': JSON.stringify(geminiKey),
      'process.env.SHOTSTACK_API_KEY': JSON.stringify(shotstackKey),
    }
  };
});
