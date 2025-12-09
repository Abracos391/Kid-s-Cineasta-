
import { Story } from '../types';

// Usando o ambiente de STAGE para testes (gratuito/dev)
const API_URL = 'https://api.shotstack.io/edit/stage/render'; 

// Interfaces baseadas na documentação enviada pelos engenheiros
interface ShotstackAsset {
    type: 'text' | 'image' | 'audio' | 'video' | 'text-to-speech';
    src?: string; // Para imagens/videos
    text?: string; // Para text e text-to-speech
    voice?: string; // Para text-to-speech
    font?: {
        family: string;
        size: number;
        color: string;
    };
    background?: {
        color: string;
        opacity: number;
        borderRadius: number;
    };
    volume?: number;
}

interface ShotstackClip {
    asset: ShotstackAsset;
    start: number;
    length: number | 'end' | 'auto'; // 'auto' é util para TTS
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
    // Garante pelo menos 4 segundos
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

        console.log("🎬 Iniciando Renderização Shotstack (Multi-Track)...");
        onProgress("Diretor organizando as cenas...");

        // --- 2. PREPARAÇÃO DAS TRILHAS (TRACKS) ---
        // Seguindo o exemplo: Track Texto (Overlay), Track Imagem, Track Áudio (TTS), Track Música
        
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
                text: story.title.toUpperCase(),
                font: { family: "Montserrat ExtraBold", size: 48, color: "#FFFFFF" },
                background: { color: "#000000", opacity: 0.7, borderRadius: 15 }
            },
            start: 0,
            length: introDuration,
            position: "center",
            transition: { in: "fade", out: "fade" },
            effect: "zoomIn"
        });

        // Imagem Intro (Background genérico ou primeira imagem)
        imageClips.push({
            asset: { 
                type: 'image', 
                src: 'https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/borders/80s-retro.png' 
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
            
            // 1. IMAGEM (Visual)
            if (chapter.generatedImage) {
                imageClips.push({
                    asset: { type: 'image', src: chapter.generatedImage },
                    start: currentTime,
                    length: duration,
                    fit: 'cover',
                    // Alterna efeitos para dinamismo
                    effect: index % 2 === 0 ? 'zoomIn' : 'slideRight',
                    transition: { in: 'fade', out: 'fade' }
                });
            } else {
                 // Fallback se não tiver imagem (URL corrigida)
                 imageClips.push({
                    asset: { type: 'image', src: 'https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/images/colors/black.jpg' }, 
                    start: currentTime,
                    length: duration,
                    fit: 'cover',
                });
            }

            // 2. LEGENDA (Texto)
            // Corta texto longo para caber na tela
            let cleanText = chapter.text.replace(/\n/g, " ").substring(0, 100).trim();
            if (!cleanText) cleanText = "Cena sem texto."; // Evita erro de validação com string vazia
            if (chapter.text.length > 100) cleanText += "...";

            textClips.push({
                asset: {
                    type: "text",
                    text: cleanText,
                    font: { family: "Open Sans", size: 28, color: "#FFFFFF" },
                    background: { color: "#000000", opacity: 0.6, borderRadius: 12 }
                },
                start: currentTime,
                length: duration,
                position: "bottom",
                offset: { y: -0.1 },
                transition: { in: "slideUp", out: "fade" }
            });

            // 3. NARRAÇÃO (Áudio IA Nativa do Shotstack)
            // IMPORTANTE: Usamos 'text-to-speech' do Shotstack, não o áudio base64 do Gemini
            narrationClips.push({
                asset: {
                    type: "text-to-speech",
                    text: cleanText,
                    voice: "Camila" // Voz PT-BR disponível no Shotstack
                },
                start: currentTime,
                length: duration // Shotstack vai tentar encaixar ou cortar.
            });

            currentTime += duration;
        });

        // -- MÚSICA DE FUNDO --
        const musicTrack: ShotstackTrack = {
            clips: [{
                asset: {
                    type: "audio",
                    src: "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/music/freepd/motions.mp3",
                    volume: 0.2 // Volume baixo para não cobrir a narração
                },
                start: 0,
                length: currentTime,
                effect: "fadeInFadeOut"
            }]
        };

        // MONTAGEM DA TIMELINE (Ordem: Texto (topo) -> Imagem -> Audio -> Música)
        const timeline = {
            background: "#000000",
            tracks: [
                { clips: textClips },      // Track 0: Textos (Ficam por cima)
                { clips: imageClips },     // Track 1: Imagens
                { clips: narrationClips }, // Track 2: Narração
                musicTrack                 // Track 3: Música Fundo
            ]
        };

        const payload = {
            timeline: timeline,
            output: {
                format: "mp4",
                resolution: "sd", // SD para ser mais rápido na conta free/stage
                aspectRatio: "9:16", // Vertical para celular (Shorts/Reels)
                fps: 25
            }
        };

        // Log do Payload para debug no console do navegador (F12)
        console.log("Shotstack Payload:", JSON.stringify(payload, null, 2));

        // --- 3. ENVIO PARA API (POST) ---
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
                console.error("Erro Shotstack Detalhado:", response.status, txt);
                
                if (response.status === 401 || response.status === 403) {
                    throw new Error("MISSING_KEY"); 
                }
                
                // Tenta extrair a mensagem de erro exata do JSON
                let errorDetails = txt;
                try {
                    const jsonError = JSON.parse(txt);
                    if (jsonError.response && jsonError.response.error) {
                        errorDetails = JSON.stringify(jsonError.response.error);
                    } else if (jsonError.message) {
                         errorDetails = jsonError.message;
                    }
                } catch(e) {}

                throw new Error(`Erro Shotstack (${response.status}): ${errorDetails}`);
            }

            const data = await response.json();
            renderId = data.response.id;
            console.log("Job ID criado:", renderId);

        } catch (error: any) {
            console.error("Erro ao enviar vídeo:", error);
            throw error;
        }

        // --- 4. POLLING (GET) ---
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
                        const errorMsg = data.response.error ? JSON.stringify(data.response.error) : "Erro desconhecido";
                        reject(new Error(`Falha no Shotstack: ${errorMsg}`));
                    } else if (attempts > 120) { // Timeout de 4 min
                        clearInterval(interval);
                        reject(new Error("Demorou muito! Tente novamente mais tarde."));
                    }
                } catch (e) {
                    // Ignora erros de rede temporários no polling
                }
            }, 3000); 
        });
    }
};
