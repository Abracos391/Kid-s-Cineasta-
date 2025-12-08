
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

export const videoService = {
    renderStoryToVideo: async (story: Story, onProgress: (msg: string) => void, manualKey?: string): Promise<string> => {
        
        // --- 1. RESOLUÇÃO DA CHAVE DE API ---
        let apiKey = manualKey || '';

        if (!apiKey) {
            // Tenta recuperar do ambiente injetado pelo Vite
            // @ts-ignore
            apiKey = process.env.SHOTSTACK_API_KEY || import.meta.env.SHOTSTACK_API_KEY || import.meta.env.VITE_SHOTSTACK_API_KEY;
        }

        // Limpeza final
        if (apiKey) apiKey = apiKey.replace(/"/g, '').trim();

        // Debug Log (mostra apenas os primeiros 4 caracteres por segurança)
        const keyStatus = apiKey ? `Presente (${apiKey.substring(0, 4)}...)` : "AUSENTE";
        console.log(`[VideoService] Status da Chave Shotstack: ${keyStatus}`);

        // Se após todas as tentativas a chave não existir, lançamos o erro específico
        // para que o UI (StoryReader) peça a chave manualmente ao usuário.
        if (!apiKey || apiKey.length < 10) {
            throw new Error("MISSING_KEY");
        }

        console.log("🎬 Iniciando Renderização Cineasta Kids...");
        onProgress("Calculando o tempo do filme...");

        const tracks: ShotstackTrack[] = [];
        let currentTime = 0;

        // Arrays para as faixas
        const imageClips: ShotstackClip[] = [];
        const subtitleClips: ShotstackClip[] = [];

        // --- 2. CONSTRUÇÃO DA TIMELINE ---
        story.chapters.forEach((chapter, index) => {
            // Duração baseada no áudio
            const sceneDuration = calculateAudioDuration(chapter.generatedAudio);
            
            // LAYER 1: IMAGEM (Fundo)
            if (chapter.generatedImage) {
                imageClips.push({
                    asset: { type: 'image', src: chapter.generatedImage },
                    start: currentTime,
                    length: sceneDuration,
                    // Efeito Ken Burns alternado
                    effect: index % 2 === 0 ? 'zoomIn' : 'zoomOut',
                    transition: { in: 'fade', out: 'fade' },
                    fit: 'cover'
                });
            }

            // LAYER 2: LEGENDA (HTML/CSS)
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
                    background-color: #FFD700;
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
                asset: { type: 'html', html, css, width: 1080, height: 1920 },
                start: currentTime,
                length: sceneDuration,
                transition: { in: 'fade', out: 'fade' }
            });

            currentTime += sceneDuration;
        });

        // Adiciona faixas (ordem: topo -> base)
        tracks.push({ clips: subtitleClips });
        tracks.push({ clips: imageClips });

        // --- 3. MÚSICA E CONFIGURAÇÃO ---
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
                resolution: "hd",
                aspectRatio: "9:16",
                fps: 25
            }
        };

        // --- 4. ENVIO PARA API (POST) ---
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
                console.error("Erro Shotstack:", response.status, txt);
                
                if (response.status === 401 || response.status === 403) {
                    throw new Error("MISSING_KEY"); // Força o pedido manual se a chave for inválida
                }
                if (response.status === 402) throw new Error("Créditos insuficientes no Shotstack.");
                
                throw new Error(`Erro na API (${response.status}): ${txt}`);
            }

            const data = await response.json();
            renderId = data.response.id;
            console.log("Job ID criado:", renderId);

        } catch (error: any) {
            console.error("Erro ao enviar vídeo:", error);
            throw error;
        }

        // --- 5. POLLING (GET) ---
        let attempts = 0;
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                attempts++;
                onProgress(`Revelando filme... (${attempts}s)`);

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
                        reject(new Error("Falha no Shotstack: " + data.response.error));
                    } else if (attempts > 120) { // Timeout de 4 min
                        clearInterval(interval);
                        reject(new Error("Demorou muito! Tente novamente mais tarde."));
                    }
                } catch (e) {
                    // Ignora erros de rede temporários no polling
                }
            }, 3000); // Checa a cada 3 segundos
        });
    }
};
