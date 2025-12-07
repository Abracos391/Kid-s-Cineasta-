
import { Story } from '../types';

const API_URL = 'https://api.shotstack.io/edit/stage/render'; // Sandbox URL

// Interfaces para a API do Shotstack
interface ShotstackAsset {
    type: 'image' | 'html' | 'audio';
    src?: string;
    html?: string;
    css?: string;
    width?: number;
    height?: number;
    volume?: number;
    effect?: 'fadeOut' | 'fadeIn';
}

interface ShotstackClip {
    asset: ShotstackAsset;
    start: number;
    length: number;
    effect?: 'zoomIn' | 'zoomOut' | 'slideLeft' | 'slideRight';
    transition?: { in?: 'fade'; out?: 'fade' };
    fit?: 'cover' | 'contain' | 'crop';
    scale?: number;
    position?: string;
}

interface ShotstackTrack {
    clips: ShotstackClip[];
}

// Helper para calcular duração do áudio RAW (PCM 24kHz 16bit Mono)
const calculateAudioDuration = (base64: string | undefined): number => {
    if (!base64) return 5; // Duração padrão se não houver áudio
    try {
        const binaryString = atob(base64);
        const bytes = binaryString.length;
        // Taxa: 24000 Hz * 2 bytes (16-bit) * 1 canal = 48000 bytes/segundo
        const duration = bytes / 48000;
        return Math.max(3, duration); // Mínimo de 3 segundos
    } catch (e) {
        console.warn("Erro ao calcular duração do áudio:", e);
        return 5;
    }
};

// Modificamos a assinatura para aceitar uma chave manual opcional
export const videoService = {
    renderStoryToVideo: async (story: Story, onProgress: (msg: string) => void, manualKey?: string): Promise<string> => {
        
        // --- RECUPERAÇÃO DA CHAVE DE API ---
        // Prioridade: 1. Chave Manual (passada pelo UI), 2. Vite Env, 3. Process Env (injetado)
        let apiKey = manualKey || '';

        if (!apiKey) {
            try {
                // Tenta pegar do Vite (maneira padrão moderna)
                // @ts-ignore
                apiKey = import.meta.env.VITE_SHOTSTACK_API_KEY || import.meta.env.SHOTSTACK_API_KEY;
                
                // Se falhar, tenta pegar do objeto injetado pelo define do vite.config
                if (!apiKey) {
                    // @ts-ignore
                    apiKey = process.env.SHOTSTACK_API_KEY;
                }
            } catch (e) {
                // Silently fail env retrieval
            }
        }
        
        // Limpeza
        if (apiKey) apiKey = apiKey.replace(/"/g, '').trim();

        if (!apiKey || apiKey.length < 10) {
            // Lançamos um erro específico que o frontend pode capturar para pedir a chave ao usuário
            throw new Error("MISSING_KEY");
        }

        console.log("🎬 Iniciando Renderização Cineasta Kids...");
        onProgress("Calculando o tempo do filme...");

        const tracks: ShotstackTrack[] = [];
        let currentTime = 0;

        // Arrays para as faixas
        const imageClips: ShotstackClip[] = [];
        const subtitleClips: ShotstackClip[] = [];

        // --- CONSTRUÇÃO DA TIMELINE ---
        story.chapters.forEach((chapter, index) => {
            // 1. Determina duração da cena baseada no áudio (narrativa)
            const sceneDuration = calculateAudioDuration(chapter.generatedAudio);
            
            // 2. CLIP DE IMAGEM (Fundo)
            if (chapter.generatedImage) {
                imageClips.push({
                    asset: { type: 'image', src: chapter.generatedImage },
                    start: currentTime,
                    length: sceneDuration,
                    // Efeito Ken Burns alternado (Zoom In / Zoom Out)
                    effect: index % 2 === 0 ? 'zoomIn' : 'zoomOut',
                    transition: { in: 'fade', out: 'fade' },
                    fit: 'cover'
                });
            }

            // 3. CLIP DE LEGENDA (Estilo Lúdico)
            // Limpa e encurta texto para caber na tela
            let cleanText = chapter.text
                .replace(/"/g, "'")
                .replace(/\n/g, " ")
                .substring(0, 140);
            if (chapter.text.length > 140) cleanText += "...";

            const html = `
                <div class="subtitle-container">
                    <div class="subtitle-box">
                        <p>${cleanText}</p>
                    </div>
                </div>
            `;
            
            const css = `
                .subtitle-container {
                    height: 100%;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    padding-bottom: 80px;
                }
                .subtitle-box {
                    background-color: #FFD700; /* Cartoon Yellow */
                    border: 6px solid #000;
                    border-radius: 30px;
                    padding: 24px;
                    width: 800px;
                    text-align: center;
                    box-shadow: 10px 10px 0px #000;
                    transform: rotate(-1deg);
                }
                p {
                    margin: 0;
                    color: #000;
                    font-family: 'Verdana', sans-serif;
                    font-size: 38px;
                    font-weight: 800;
                    line-height: 1.4;
                    text-transform: uppercase;
                }
            `;

            subtitleClips.push({
                asset: { type: 'html', html, css, width: 1080, height: 1920 }, // Full screen container
                start: currentTime,
                length: sceneDuration,
                transition: { in: 'fade', out: 'fade' }
            });

            // Avança o cursor de tempo
            currentTime += sceneDuration;
        });

        // Adiciona as faixas na ordem correta (Layers: Top -> Bottom)
        tracks.push({ clips: subtitleClips }); // Legendas no topo
        tracks.push({ clips: imageClips });    // Imagens no fundo

        // --- MÚSICA DE FUNDO ---
        // Volume baixo para não brigar com a narração (se houvesse)
        const soundtrack = {
            src: "https://s3.ap-southeast-2.amazonaws.com/shotstack-assets/music/happy.mp3",
            effect: "fadeOut",
            volume: 0.2 
        };

        const payload = {
            timeline: {
                soundtrack: soundtrack,
                background: "#000000",
                tracks: tracks
            },
            output: {
                format: "mp4",
                resolution: "hd",    // 720p (720x1280) - Ideal para mobile e economia de créditos
                aspectRatio: "9:16", // Vertical (Stories/Reels)
                fps: 25
            }
        };

        // --- ENVIO PARA API ---
        onProgress("Enviando rolos de filme...");
        
        let renderId = '';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const txt = await response.text();
                if (response.status === 402) throw new Error("Créditos insuficientes no Shotstack.");
                if (response.status === 403) throw new Error("Chave de API inválida.");
                throw new Error(`Erro Shotstack (${response.status}): ${txt}`);
            }

            const data = await response.json();
            renderId = data.response.id;
            console.log("Job ID:", renderId);

        } catch (error: any) {
            console.error("Erro no POST:", error);
            throw error;
        }

        // --- POLLING ---
        let attempts = 0;
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                attempts++;
                onProgress(`Renderizando mágica... (${attempts}s)`);

                try {
                    const res = await fetch(`${API_URL}/${renderId}`, {
                        headers: { 'x-api-key': apiKey }
                    });
                    
                    if (!res.ok) return;

                    const data = await res.json();
                    const status = data.response.status;

                    if (status === 'done') {
                        clearInterval(interval);
                        resolve(data.response.url);
                    } else if (status === 'failed') {
                        clearInterval(interval);
                        reject(new Error("Falha na renderização: " + data.response.error));
                    } else if (attempts > 90) { // Timeout de 3 min
                        clearInterval(interval);
                        reject(new Error("O vídeo demorou muito para ser criado."));
                    }
                } catch (e) {
                    // Ignora erros de rede temporários no polling
                }
            }, 3000);
        });
    }
};
