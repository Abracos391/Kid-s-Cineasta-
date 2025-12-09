
import { Story } from '../types';

// Usando o ambiente de STAGE para testes (gratuito/dev)
const API_URL = 'https://api.shotstack.io/edit/stage/render'; 

// Interfaces simplificadas para garantir compatibilidade
interface ShotstackAsset {
    type: 'text' | 'image' | 'audio' | 'video' | 'text-to-speech';
    src?: string;
    text?: string;
    voice?: string;
    font?: {
        family: string;
        size: number;
        color: string;
    };
    background?: {
        color: string;
        opacity: number;
        // borderRadius removido pois pode causar erro 400 se a API for estrita
    };
    volume?: number;
}

interface ShotstackClip {
    asset: ShotstackAsset;
    start: number;
    length: number; // Forçamos number para evitar ambiguidades
    effect?: 'zoomIn' | 'zoomOut' | 'slideLeft' | 'slideRight' | 'fadeInFadeOut';
    transition?: { 
        in?: 'fade' | 'wipeRight' | 'slideLeft' | 'slideUp'; 
        out?: 'fade' | 'slideDown' 
    };
    fit?: 'cover' | 'contain' | 'crop';
    position?: string;
    offset?: { x?: number; y?: number };
}

interface ShotstackTrack {
    clips: ShotstackClip[];
}

// Estima a duração da leitura (aprox 3 palavras por segundo + margem)
const estimateReadingTime = (text: string): number => {
    const wordCount = text.split(' ').length;
    return Math.max(4, Math.ceil(wordCount / 2.5)); 
};

export const videoService = {
    renderStoryToVideo: async (story: Story, onProgress: (msg: string) => void, manualKey?: string): Promise<string> => {
        
        // --- 1. RESOLUÇÃO DA CHAVE DE API ---
        let apiKey = manualKey || '';

        if (!apiKey) {
            apiKey = localStorage.getItem('shotstack_key') || '';
        }

        if (!apiKey) {
            try {
                // @ts-ignore
                if (typeof process !== 'undefined' && process.env) {
                    // @ts-ignore
                    apiKey = process.env.VITE_SHOTSTACK_API_KEY || process.env.SHOTSTACK_API_KEY;
                }
            } catch (e) {}

            if (!apiKey) {
                try {
                    // @ts-ignore
                    if (import.meta && import.meta.env) {
                        // @ts-ignore
                        apiKey = import.meta.env.VITE_SHOTSTACK_API_KEY || import.meta.env.SHOTSTACK_API_KEY;
                    }
                } catch (e) {}
            }
        }

        if (apiKey) apiKey = apiKey.replace(/"/g, '').trim();

        if (!apiKey || apiKey.length < 10) {
            throw new Error("MISSING_KEY");
        }

        console.log("🎬 Iniciando Renderização Shotstack (Safe Mode)...");
        onProgress("Diretor organizando as cenas...");

        const textClips: ShotstackClip[] = [];
        const imageClips: ShotstackClip[] = [];
        const narrationClips: ShotstackClip[] = [];
        
        let currentTime = 0;

        // -- CENA 0: INTRODUÇÃO --
        const introDuration = 4;
        
        // Texto Intro
        textClips.push({
            asset: {
                type: "text",
                text: story.title.toUpperCase().substring(0, 50), // Limite de segurança
                font: { family: "Montserrat ExtraBold", size: 48, color: "#FFFFFF" },
                background: { color: "#000000", opacity: 0.7 }
            },
            start: 0,
            length: introDuration,
            position: "center",
            transition: { in: "fade", out: "fade" },
            effect: "zoomIn"
        });

        // Imagem Intro - URL Estável
        imageClips.push({
            asset: { 
                type: 'image', 
                src: 'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/borders/80s-retro.png' 
            },
            start: 0,
            length: introDuration,
            fit: 'cover',
            effect: 'zoomIn'
        });
        
        currentTime += introDuration;

        // -- CENAS DA HISTÓRIA --
        story.chapters.forEach((chapter, index) => {
            const duration = estimateReadingTime(chapter.text);
            
            // 1. IMAGEM
            if (chapter.generatedImage) {
                imageClips.push({
                    asset: { type: 'image', src: chapter.generatedImage },
                    start: currentTime,
                    length: duration,
                    fit: 'cover',
                    effect: index % 2 === 0 ? 'zoomIn' : 'slideRight',
                    transition: { in: 'fade', out: 'fade' }
                });
            } else {
                 // Fallback seguro
                 imageClips.push({
                    asset: { type: 'image', src: 'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/images/colors/black.jpg' }, 
                    start: currentTime,
                    length: duration,
                    fit: 'cover',
                });
            }

            // 2. LEGENDA
            let cleanText = chapter.text.replace(/\n/g, " ").substring(0, 90).trim();
            if (!cleanText) cleanText = "Cena sem texto.";
            if (chapter.text.length > 90) cleanText += "...";

            textClips.push({
                asset: {
                    type: "text",
                    text: cleanText,
                    font: { family: "Open Sans", size: 28, color: "#FFFFFF" },
                    background: { color: "#000000", opacity: 0.6 } // Sem borderRadius para evitar erro 400
                },
                start: currentTime,
                length: duration,
                position: "bottom",
                offset: { y: -0.1 },
                transition: { in: "slideUp", out: "fade" }
            });

            // 3. NARRAÇÃO
            narrationClips.push({
                asset: {
                    type: "text-to-speech",
                    text: cleanText,
                    voice: "Camila"
                },
                start: currentTime,
                length: duration
            });

            currentTime += duration;
        });

        // -- MÚSICA DE FUNDO --
        const musicTrack: ShotstackTrack = {
            clips: [{
                asset: {
                    type: "audio",
                    src: "https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/music/freepd/motions.mp3",
                    volume: 0.2
                },
                start: 0,
                length: currentTime,
                effect: "fadeInFadeOut"
            }]
        };

        const timeline = {
            background: "#000000",
            tracks: [
                { clips: textClips },
                { clips: imageClips },
                { clips: narrationClips },
                musicTrack
            ]
        };

        // Output com configurações mais padrão para evitar erro
        const payload = {
            timeline: timeline,
            output: {
                format: "mp4",
                resolution: "sd",
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
                console.error("Erro Shotstack:", response.status, txt);
                
                if (response.status === 401 || response.status === 403) throw new Error("MISSING_KEY"); 
                
                let errorDetails = txt;
                try {
                    const jsonError = JSON.parse(txt);
                    // Tenta capturar mensagens de validação aninhadas
                    if (jsonError.response && jsonError.response.error) {
                        if (Array.isArray(jsonError.response.error.details)) {
                            errorDetails = jsonError.response.error.details.join(', ');
                        } else {
                            errorDetails = JSON.stringify(jsonError.response.error);
                        }
                    } else if (jsonError.message) {
                        errorDetails = jsonError.message;
                    }
                } catch(e) {}

                throw new Error(`Erro Shotstack: ${errorDetails}`);
            }

            const data = await response.json();
            renderId = data.response.id;
            console.log("Job ID criado:", renderId);

        } catch (error: any) {
            console.error("Erro envio:", error);
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
                        reject(new Error("Falha no Shotstack: " + JSON.stringify(data.response.error)));
                    } else if (attempts > 120) {
                        clearInterval(interval);
                        reject(new Error("Timeout."));
                    }
                } catch (e) {}
            }, 3000); 
        });
    }
};
