
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

export const videoService = {
    renderStoryToVideo: async (story: Story, onProgress: (msg: string) => void): Promise<string> => {
        
        // --- RECUPERAÇÃO DA CHAVE DE API ---
        let apiKey = '';

        try {
            // O Vite substitui 'process.env.SHOTSTACK_API_KEY' pelo valor string durante o build.
            // @ts-ignore
            apiKey = process.env.SHOTSTACK_API_KEY;
        } catch (e) {
            console.warn("Acesso a process.env falhou, tentando fallback...", e);
        }

        // Fallback para import.meta.env caso a substituição falhe ou use prefixo VITE_
        if (!apiKey) {
            try {
                // @ts-ignore
                if (import.meta && import.meta.env && import.meta.env.VITE_SHOTSTACK_API_KEY) {
                    // @ts-ignore
                    apiKey = import.meta.env.VITE_SHOTSTACK_API_KEY;
                }
            } catch (e) {
                // Ignorar erro se import.meta não existir
            }
        }

        // Limpeza de aspas residuais que podem ocorrer na substituição
        if (apiKey) apiKey = apiKey.replace(/"/g, '').trim();

        // --- VALIDAÇÃO ---
        if (!apiKey || apiKey.length < 10 || apiKey.includes('undefined')) {
            console.error("❌ ERRO CRÍTICO: Chave Shotstack inválida.", apiKey);
            throw new Error(
                "A Chave de API (SHOTSTACK_API_KEY) não foi encontrada.\n\n" +
                "SE VOCÊ ESTÁ NO RENDER:\n" +
                "1. Vá na aba 'Environment'.\n" +
                "2. Adicione a chave 'SHOTSTACK_API_KEY'.\n" +
                "3. IMPORTANTE: Vá em 'Manual Deploy' > 'Clear build cache & deploy' para recompilar o site com a nova chave."
            );
        }

        console.log("🎬 Iniciando Renderização com Shotstack...");
        onProgress("Preparando o estúdio de filmagem...");

        const SCENE_DURATION = 5; 
        const tracks: ShotstackTrack[] = [];

        // 1. Faixa de Imagens (Fundo)
        const imageClips: ShotstackClip[] = [];
        story.chapters.forEach((chapter, index) => {
            if (chapter.generatedImage) {
                imageClips.push({
                    asset: { type: 'image', src: chapter.generatedImage },
                    start: index * SCENE_DURATION,
                    length: SCENE_DURATION,
                    effect: index % 2 === 0 ? 'zoomIn' : 'zoomOut',
                    transition: { in: 'fade', out: 'fade' }
                });
            }
        });

        // 2. Faixa de Legendas (Sobreposição)
        const textClips: ShotstackClip[] = [];
        story.chapters.forEach((chapter, index) => {
            // Sanitização do texto para evitar quebra do JSON/HTML
            let cleanText = chapter.text
                .replace(/"/g, "'")
                .replace(/\n/g, " ")
                .substring(0, 130);
            
            if (chapter.text.length > 130) cleanText += "...";

            const html = `
                <div class="box">
                    <p>${cleanText}</p>
                </div>
            `;
            
            const css = `
                .box {
                    background-color: #FFFACD;
                    border: 5px solid #000;
                    color: #000;
                    font-family: "Verdana", sans-serif;
                    font-weight: bold;
                    font-size: 26px;
                    padding: 20px;
                    border-radius: 20px;
                    text-align: center;
                    width: 600px;
                    box-shadow: 10px 10px 0px #000;
                }
                p { margin: 0; line-height: 1.4; }
            `;

            textClips.push({
                asset: { type: 'html', html, css, width: 700, height: 300 },
                start: index * SCENE_DURATION,
                length: SCENE_DURATION,
                position: 'bottom',
                transition: { in: 'fade', out: 'fade' }
            });
        });

        // Ordem das trilhas: Texto em cima (índice 0), Imagem embaixo (índice 1)
        tracks.push({ clips: textClips }); // Camada superior
        tracks.push({ clips: imageClips }); // Camada inferior

        // --- MÚSICA DE FUNDO ---
        const soundtrack = {
            src: "https://s3.ap-southeast-2.amazonaws.com/shotstack-assets/music/happy.mp3",
            effect: "fadeOut",
            volume: 0.5
        };

        const payload = {
            timeline: {
                soundtrack: soundtrack,
                background: "#000000",
                tracks: tracks
            },
            output: {
                format: "mp4",
                resolution: "sd", // SD economiza créditos
                aspectRatio: "9:16", // Formato TikTok/Reels/Stories
                fps: 25
            }
        };

        // --- ENVIAR RENDER ---
        onProgress("Enviando cenas para o editor...");
        
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
                const errorText = await response.text();
                console.error("Shotstack API Error:", response.status, errorText);
                
                if (response.status === 401) throw new Error("Chave de API Inválida (401).");
                if (response.status === 403) throw new Error("Acesso negado (403). Verifique seus créditos.");
                if (response.status === 400) throw new Error("Erro nos dados enviados (400).");
                throw new Error(`Erro na API (${response.status})`);
            }

            const data = await response.json();
            if (data.response && data.response.id) {
                renderId = data.response.id;
                console.log("Job ID recebido:", renderId);
            } else {
                throw new Error("Resposta inesperada da API Shotstack.");
            }

        } catch (postError: any) {
            console.error("Falha no POST:", postError);
            throw postError;
        }

        // --- POLLING (AGUARDAR VÍDEO) ---
        let attempts = 0;
        const maxAttempts = 60; // ~2 minutos de timeout

        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                attempts++;
                onProgress(`Renderizando... ${attempts * 2}%`); // Progresso fake visual

                try {
                    const statusRes = await fetch(`${API_URL}/${renderId}`, {
                        headers: { 'x-api-key': apiKey }
                    });

                    if (!statusRes.ok) {
                        console.warn("Erro ao checar status:", statusRes.status);
                        // Não rejeita imediatamente, tenta de novo no próximo tick
                        return;
                    }

                    const statusData = await statusRes.json();
                    const status = statusData.response.status;

                    console.log(`Status (${attempts}):`, status);

                    if (status === 'done') {
                        clearInterval(interval);
                        resolve(statusData.response.url);
                    } else if (status === 'failed') {
                        clearInterval(interval);
                        console.error("Render falhou:", statusData.response.error);
                        reject(new Error("O Shotstack falhou ao criar o vídeo: " + statusData.response.error));
                    } else if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        reject(new Error("Timeout: O vídeo demorou muito para renderizar."));
                    }

                } catch (pollError) {
                    console.error("Erro no polling:", pollError);
                    // Continua tentando
                }
            }, 2000); // Checa a cada 2 segundos
        });
    }
};
