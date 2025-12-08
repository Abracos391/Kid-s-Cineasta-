
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 1. Carrega variáveis de arquivos .env (se existirem)
  const envFile = loadEnv(mode, (process as any).cwd(), '');

  // 2. Helper para limpar e validar chaves
  const getKey = (keyName: string) => {
    // Tenta process.env (Render/System) e depois envFile (.env local)
    const val = process.env[keyName] || envFile[keyName] || '';
    if (val && val !== 'undefined' && val !== 'null') {
        return val.replace(/"/g, '').trim();
    }
    return '';
  };

  // 3. Busca robusta das chaves
  // Mudamos de SHOTSTACK para JSON2VIDEO
  const videoKey = getKey('JSON2VIDEO_API_KEY') || getKey('VITE_JSON2VIDEO_API_KEY');
  const geminiKey = getKey('API_KEY') || getKey('VITE_API_KEY');

  // Logs visíveis apenas no terminal de build do Render
  console.log('--- VITE BUILD CONFIG ---');
  console.log(`Mode: ${mode}`);
  console.log(`Video API Key detected: ${videoKey ? 'YES' : 'NO'}`);
  console.log(`Gemini Key detected: ${geminiKey ? 'YES' : 'NO'}`);
  console.log('-------------------------');

  return {
    plugins: [react()],
    root: '.',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    define: {
      // Injeta as variáveis no código final
      'process.env.API_KEY': JSON.stringify(geminiKey),
      'process.env.JSON2VIDEO_API_KEY': JSON.stringify(videoKey),
      'process.env.VITE_JSON2VIDEO_API_KEY': JSON.stringify(videoKey),
      
      // Fallbacks
      'import.meta.env.JSON2VIDEO_API_KEY': JSON.stringify(videoKey),
      'import.meta.env.VITE_JSON2VIDEO_API_KEY': JSON.stringify(videoKey)
    }
  };
});
