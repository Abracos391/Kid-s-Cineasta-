
import { Story } from '../types';

// Endpoint de Edição (Mais robusto que o /stage/render)
const SHOTSTACK_API = 'https://api.shotstack.io/edit/v1';

// @ts-ignore
const API_KEY = process.env.SHOTSTACK_API_KEY || import.meta.env.VITE_SHOTSTACK_API_KEY;

interface ShotstackResponse {
  success: boolean;
  message: string;
  response: {
    message: string;
    id: string;
    status?: string;
    url?: string;
  };
}

export const videoService = {
  
  /**
   * Estima o tempo de leitura (em segundos)
   * Velocidade média de leitura infantil: ~80-100 palavras por minuto.
   * Ajustado para ser mais lento.
   */
  calculateDuration: (text: string): number => {
    const words = text.split(' ').length;
    // Divide por 2.5 para dar mais tempo de leitura (leitura pausada)
    // Mínimo 6s (para apreciar a imagem), Máximo 20s
    const estimated = Math.max(6, Math.min(words / 2.0, 20)); 
    return estimated;
  },

  /**
   * Constrói o JSON do Shotstack e envia para a API
   */
  generateStoryVideo: async (story: Story): Promise<string> => {
    if (!API_KEY) {
      throw new Error("Chave de API do Shotstack não configurada (.env).");
    }

    const clips = [];
    const textClips = [];
    let startTime = 0;

    // --- FAIXA 1 e 2: IMAGENS e TEXTO ---
    for (let i = 0; i < story.chapters.length; i++) {
      const chapter = story.chapters[i];
      const duration = videoService.calculateDuration(chapter.text);
      
      // Asset de Imagem (Do Pollinations AI ou Fallback genérico colorido)
      clips.push({
        asset: {
          type: 'image',
          src: chapter.generatedImage || 'https://images.unsplash.com/photo-1606092195730-5d7b9af1ef4d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1280&q=80',
        },
        start: startTime,
        length: duration,
        effect: i % 2 === 0 ? 'zoomIn' : 'slideRight', // Alterna efeitos de movimento (Ken Burns effect)
        transition: {
          in: 'fade',
          out: 'fade',
        },
      });

      // Asset de Texto (Título do Capítulo)
      textClips.push({
        asset: {
          type: 'html',
          html: `<div style="font-family: 'Montserrat', sans-serif; text-align: center; width: 100%;">
                    <h1 style="font-size: 48px; color: #FFD700; text-shadow: 4px 4px 0 #000; margin-bottom: 20px; font-weight: 900;">${chapter.title.toUpperCase()}</h1>
                 </div>`,
          css: "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap');",
          width: 1000,
          height: 200,
          background: 'transparent',
          position: 'bottom'
        },
        start: startTime + 0.5, // Entra um pouco depois da imagem
        length: Math.min(duration - 1, 6), // Fica no máximo 6 segundos
        transition: {
          in: 'slideUp',
          out: 'fade',
        },
      });

      // Avança o cursor do tempo
      startTime += duration;
    }

    // --- FAIXA 3: MÚSICA DE FUNDO ---
    const audioTrack = {
      clips: [
        {
          asset: {
            type: 'audio',
            src: 'https://github.com/shotstack/test-media/raw/main/audio/happy.mp3',
            volume: 0.5,
            effect: 'fadeOut'
          },
          start: 0,
          length: startTime // Duração total do vídeo
        }
      ]
    };

    // --- PAYLOAD ---
    const payload = {
      timeline: {
        background: '#000000',
        tracks: [
          { clips: textClips }, // Camada Superior: Texto
          { clips: clips },     // Camada do Meio: Imagens
          audioTrack            // Camada Inferior: Áudio
        ],
      },
      output: {
        format: 'mp4',
        resolution: 'sd', // SD para economizar créditos e renderizar rápido
        fps: 25,
      },
    };

    // --- CHAMADA API ---
    try {
      const response = await fetch(`${SHOTSTACK_API}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify(payload),
      });

      const data: ShotstackResponse = await response.json();

      if (!response.ok || (data.response.message !== 'Render Successfully Queued' && data.response.message !== 'OK')) {
        console.error("Shotstack Error Response:", data);
        throw new Error(data.message || 'Erro ao enviar para renderização.');
      }

      return data.response.id;

    } catch (error) {
      console.error('Shotstack Service Error:', error);
      throw error;
    }
  },

  /**
   * Verifica o status da renderização (Polling)
   */
  checkStatus: async (renderId: string): Promise<{ status: string; url?: string }> => {
    if (!API_KEY) throw new Error("API Key missing");

    try {
        const response = await fetch(`${SHOTSTACK_API}/render/${renderId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
        },
        });

        const data: ShotstackResponse = await response.json();
        
        return {
        status: data.response.status || 'failed',
        url: data.response.url,
        };
    } catch (e) {
        console.error("Erro no polling:", e);
        return { status: 'failed' };
    }
  }
};
