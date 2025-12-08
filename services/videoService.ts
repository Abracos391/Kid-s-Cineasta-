
import { Story } from '../types';

const API_URL = 'https://api.shotstack.io/edit/stage/render'; 

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

const calculateAudioDuration = (base64: string | undefined): number => {
    if (!base64) return 5; 
    try {
        const binaryString = atob(base64);
        const bytes = binaryString.length;
        const duration = bytes / 48000;
        return Math.max(3, duration); 
    } catch (e) {
        console.warn("Erro ao calcular duração do áudio:", e);
        return 5;
    }
};

export const videoService = {
    renderStoryToVideo: async (story: Story, onProgress: (msg: string) => void, manualKey?: string): Promise<string> => {
        
        let apiKey = manualKey || '';

        // Tenta recuperar do localStorage 
        if (!apiKey) {
            apiKey = localStorage.getItem('shotstack_key') || '';
        }

        // Tenta recuperar do ambiente de forma segura
        if (!apiKey) {
            try {
                // @ts-ignore
                if (typeof process !== 'undefined' && process.env && process.env.SHOTSTACK_API_KEY) {
                    // @ts-ignore
                    apiKey = process.env.SHOTSTACK_API_KEY;
                }
            } catch (e) {}

            try {
                // @ts-ignore
                if (!apiKey && import.meta && import.meta.env) {
                    // @ts-ignore
                    apiKey = import.meta.env.SHOTSTACK_API_KEY || import.meta.env.VITE_SHOTSTACK_API_KEY;
                }
            } catch (e) {}
        }

        if (apiKey) apiKey = apiKey.replace(/"/g, '').trim();

        if (!apiKey || apiKey.length < 10) {
            throw new Error("MISSING_KEY");
        }

        console.log("🎬 Iniciando Renderização Cineasta Kids...");
        onProgress("Calculando o tempo do filme...");

        const tracks: ShotstackTrack[] = [];
        let currentTime = 0;

        const imageClips: ShotstackClip[] = [];
        const subtitleClips: ShotstackClip[] = [];

        story.chapters.forEach((chapter, index) => {
            const sceneDuration = calculateAudioDuration(chapter.generatedAudio);
            
            if (chapter.generatedImage) {
                imageClips.push({
                    asset: { type: 'image', src: chapter.generatedImage },
                    start: currentTime,
                    length: sceneDuration,
                    effect: index % 2 === 0 ? 'zoomIn' : 'zoomOut',
                    transition: { in: 'fade', out: 'fade' },
                    fit: 'cover'
                });
            }

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

        tracks.push({ clips: subtitleClips });
        tracks.push({ clips: imageClips });

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
                
                if (response.status === 401 || response.status === 403) {
                    throw new Error("MISSING_KEY"); 
                }
                if (response.status === 402) throw new Error("Créditos insuficientes no Shotstack.");
                
                throw new Error(`Erro na API (${response.status}): ${txt}`);
            }

            const data = await response.json();
            renderId = data.response.id;

        } catch (error: any) {
            console.error("Erro ao enviar vídeo:", error);
            throw error;
        }

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
                    } else if (attempts > 120) { 
                        clearInterval(interval);
                        reject(new Error("Demorou muito! Tente novamente mais tarde."));
                    }
                } catch (e) {
                }
            }, 3000); 
        });
    }
};
