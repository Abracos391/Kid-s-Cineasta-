
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
    progress?: number;
  };
}

/**
 * Auxiliar para fazer upload de imagens em base64 para o backend local do Express,
 * permitindo que o Shotstack as acesse por um link público e estável.
 */
const uploadBase64Image = async (base64Data: string, index: number): Promise<string> => {
  try {
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data,
        filename: `story_img_${Date.now()}_${index}.png`
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image. Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.url) {
      // Retorna a URL pública completa com base no window.location.origin
      return window.location.origin + data.url;
    }
    throw new Error("Upload did not return success or url.");
  } catch (error) {
    console.error("Error uploading image to local backend:", error);
    return base64Data;
  }
};

/**
 * Garante uma URL estável e pública para a renderização do Shotstack.
 * Se a imagem for base64 ou um link dinâmico do Pollinations, baixa o conteúdo
 * e hospeda estaticamente no nosso servidor do Cloud Run.
 */
const ensurePublicImageUrl = async (imageUrl: string, index: number, chapterInfo: any): Promise<string> => {
  if (!imageUrl) {
    return 'https://images.unsplash.com/photo-1606092195730-5d7b9af1ef4d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1280&q=80';
  }

  // 1. Se for base64 (gerada na hora pela IA no cliente), sobe pro nosso Express
  if (imageUrl.startsWith('data:')) {
    return await uploadBase64Image(imageUrl, index);
  }

  // 2. Se for link do Pollinations ou outro link dinâmico, tenta baixar e hospedar localmente
  // para blindar contra timeouts e instabilidades de APIs de terceiros.
  if (imageUrl.includes('pollinations.ai') || imageUrl.includes('image.pollinations.ai')) {
    try {
      const res = await fetch(imageUrl);
      if (res.ok) {
        const blob = await res.blob();
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(blob);
        const base64Data = await base64Promise;
        return await uploadBase64Image(base64Data, index);
      }
    } catch (e) {
      console.warn("Could not download/cache pollinations image, using direct URL as fallback", e);
    }
  }

  return imageUrl;
};

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
      
      // Garante uma imagem estática e estável no nosso próprio servidor do Cloud Run!
      let rawImage = chapter.generatedImage;
      
      // Fallback caso não tenha imagem gerada
      if (!rawImage) {
        const seed = Math.floor(Math.random() * 99999);
        const visualDesc = chapter.visualDescription || chapter.title || "children illustration";
        const visualPrompt = `children book illustration, vector art, colorful, cute, flat style, ${visualDesc}`;
        rawImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=1024&height=600&seed=${seed}&nologo=true&model=flux`;
      }

      // Converte para link estático local hospedado por nós
      const imageUrl = await ensurePublicImageUrl(rawImage, i, chapter);
      
      // Asset de Imagem
      clips.push({
        asset: {
          type: 'image',
          src: imageUrl,
        },
        start: startTime,
        length: duration,
        effect: i % 2 === 0 ? 'zoomIn' : 'slideRight', // Alterna efeitos de movimento (Ken Burns effect)
        transition: {
          in: 'fade',
          out: 'fade',
        },
      });

      // Asset de Texto (Título do Capítulo e Legendas completas)
      textClips.push({
        asset: {
          type: 'html',
          html: `<div style="font-family: 'Comic Neue', sans-serif; text-align: center; width: 100%;">
                    <h1 style="font-size: 36px; color: #FFD700; text-shadow: 3px 3px 0 #000; margin-bottom: 10px; font-weight: 900;">${chapter.title.toUpperCase()}</h1>
                    <p style="font-size: 20px; color: #FFFFFF; text-shadow: 2px 2px 0 #000; font-weight: 700; line-height: 1.4; max-width: 90%; margin: 0 auto;">${chapter.text}</p>
                 </div>`,
          css: "@import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&display=swap');",
          width: 1100,
          height: 320,
          background: 'transparent',
          position: 'bottom'
        },
        start: startTime + 0.5, // Entra um pouco depois da imagem
        length: Math.max(duration - 1, 3), // Garante tempo para a criança ler inteira
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
            src: 'https://cdn.jsdelivr.net/gh/shotstack/test-media@main/audio/happy.mp3',
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
  checkStatus: async (renderId: string): Promise<{ status: string; url?: string; progress?: number }> => {
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
        progress: data.response.progress || 0,
        };
    } catch (e) {
        console.error("Erro no polling:", e);
        return { status: 'failed', progress: 0 };
    }
  }
};
