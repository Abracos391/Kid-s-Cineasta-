
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis do arquivo .env ou do ambiente do sistema
  // O terceiro argumento '' garante que carregue todas as vars, não só as VITE_
  const env = loadEnv(mode, '.', '');

  // Recupera as chaves com várias estratégias de fallback
  const shotstackKey = env.SHOTSTACK_API_KEY || env.VITE_SHOTSTACK_API_KEY || process.env.SHOTSTACK_API_KEY || '';
  const geminiKey = env.API_KEY || env.VITE_API_KEY || process.env.API_KEY || '';

  // Logs de build para debug (não aparecem no browser, apenas no terminal de build/deploy)
  console.log(`[Vite Build] Mode: ${mode}`);
  console.log(`[Vite Build] Shotstack Key definida? ${shotstackKey ? 'SIM (Len: ' + shotstackKey.length + ')' : 'NÃO'}`);
  console.log(`[Vite Build] Gemini Key definida? ${geminiKey ? 'SIM' : 'NÃO'}`);

  return {
    plugins: [react()],
    root: '.',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    define: {
      // Injeção de variáveis globais via substituição de texto
      // Isso permite usar process.env.VAR no código cliente sem erro
      'process.env.API_KEY': JSON.stringify(geminiKey),
      'process.env.SHOTSTACK_API_KEY': JSON.stringify(shotstackKey),
    }
  };
});
