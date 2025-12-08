
import { Story } from '../types';

const API_URL = 'https://api.json2video.com/v2/movies';

export const videoService = {
    renderStoryToVideo: async (story: Story, onProgress: (msg: string) => void, manualKey?: string): Promise<string> => {
        
        // --- 1. RESOLUÇÃO DA CHAVE DE API ---
        let apiKey = manualKey || '';

        if (!apiKey) {
            apiKey = localStorage.getItem('json2video_key') || '';
        }

        if (!apiKey) {
            try {
                // @ts-ignore
                if (typeof process !== 'undefined' && process.env) {
                    // @ts-ignore
                    apiKey = process.env.VITE_JSON2VIDEO_API_KEY || process.env.JSON2VIDEO_API_KEY;
                }
            } catch (e) {}

            if (!apiKey) {
                try {
                    // @ts-ignore
                    if (import.meta && import.meta.env) {
                        // @ts-ignore
                        apiKey = import.meta.env.VITE_JSON2VIDEO_API_KEY || import.meta.env.JSON2VIDEO_API_KEY;
                    }
                } catch (e) {}
            }
        }

        if (apiKey) apiKey = apiKey.replace(/"/g, '').trim();

        if (!apiKey || apiKey.length < 5) {
            throw new Error("MISSING_KEY");
        }

        console.log("🎬 Iniciando Renderização JSON2Video...");
        onProgress("Escrevendo roteiro para o diretor...");

        // --- 2. CONSTRUÇÃO DAS CENAS (Baseado no JSON enviado) ---
        const scenes: any[] = [];

        // Cena 1: Intro
        scenes.push({
            duration: 4,
            background_color: "#40E0D0",
            elements: [
                {
                    type: "text",
                    text: "CINEASTA KID'S APRESENTA",
                    style: {
                        font_size: 30,
                        color: "#ffffff",
                        font_family: "Verdana",
                        text_align: "center"
                    },
                    position: { y: "20%" }
                },
                {
                    type: "text",
                    text: story.title.toUpperCase(),
                    style: {
                        font_size: 50,
                        color: "#FFD700", // Gold
                        font_family: "Verdana",
                        font_weight: "bold",
                        stroke_color: "#000000",
                        stroke_width: 2,
                        text_align: "center"
                    },
                    effect: "zoom-in"
                }
            ]
        });

        // Cena 2..N: Capítulos
        story.chapters.forEach((chapter, index) => {
            // Limpa o texto para caber na legenda
            let cleanText = chapter.text
                .replace(/\n/g, " ")
                .substring(0, 120);
            if (chapter.text.length > 120) cleanText += "...";

            // Se tiver imagem gerada (URL pública do Pollinations)
            const elements: any[] = [];
            
            if (chapter.generatedImage) {
                elements.push({
                    type: "image",
                    src: chapter.generatedImage,
                    fit: "cover", // Garante tela cheia
                    transition: { in: "fade", out: "fade" },
                    pan_zoom: { // Efeito Ken Burns (movimento suave)
                        start: index % 2 === 0 ? "100%" : "120%",
                        end: index % 2 === 0 ? "120%" : "100%",
                        origin: "center"
                    }
                });
            } else {
                // Fallback se não tiver imagem: Fundo colorido
                elements.push({
                    type: "component",
                    component: "shape",
                    fill: index % 2 === 0 ? "#FF69B4" : "#40E0D0",
                    width: "100%",
                    height: "100%"
                });
            }

            // Legenda Estilizada (Como no exemplo do usuário)
            elements.push({
                type: "text",
                text: cleanText,
                style: {
                    font_size: 28,
                    color: "#000000",
                    background_color: "#FFFACD", // Lemon Chiffon
                    padding: "20px",
                    border_radius: "15px",
                    border: "3px solid #000000",
                    font_family: "Verdana",
                    width: "90%" // Margem lateral
                },
                position: { y: "80%", x: "center" },
                transition: { in: "slide-up" }
            });

            // Adiciona áudio de fundo (loop) em cada cena pois não temos timeline global fácil aqui
            // Usando uma música royalty free genérica
            elements.push({
                type: "audio",
                src: "https://assets.mixkit.co/music/preview/mixkit-happy-days-getting-older-885.mp3",
                volume: 0.3,
                fade_out: true
            });

            scenes.push({
                duration: 6, // Tempo de leitura
                elements: elements,
                transition: { type: "wipe", duration: 1 }
            });
        });

        // Cena Final: Créditos
        scenes.push({
            duration: 5,
            background_color: "#000000",
            elements: [
                {
                    type: "text",
                    text: "FIM",
                    style: { font_size: 80, color: "#ffffff" },
                    effect: "zoom-out"
                },
                {
                    type: "text",
                    text: "Criado com Cineasta Kids",
                    style: { font_size: 20, color: "#cccccc" },
                    position: { y: "80%" }
                }
            ]
        });

        const payload = {
            movie: {
                resolution: "720p", // HD Vertical
                quality: "high",
                draft: false,
                scenes: scenes
            }
        };

        // --- 3. ENVIO PARA API (POST) ---
        onProgress("Enviando para o estúdio...");
        
        let projectId = '';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const txt = await response.text();
                console.error("Erro JSON2Video:", response.status, txt);
                if (response.status === 401 || response.status === 403) throw new Error("MISSING_KEY");
                throw new Error(`Erro API: ${txt}`);
            }

            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            
            projectId = data.project.id;
            console.log("Projeto criado:", projectId);

        } catch (error: any) {
            console.error(error);
            throw error;
        }

        // --- 4. POLLING (GET) ---
        let attempts = 0;
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                attempts++;
                onProgress(`Renderizando mágica... (${attempts}s)`);

                try {
                    const res = await fetch(`${API_URL}/${projectId}`, {
                        headers: { 'x-api-key': apiKey }
                    });
                    const data = await res.json();

                    if (data.project.status === 'done') {
                        clearInterval(interval);
                        resolve(data.movie.url);
                    } else if (data.project.status === 'failed') {
                        clearInterval(interval);
                        reject(new Error("Renderização falhou."));
                    } else if (attempts > 60) {
                        clearInterval(interval);
                        reject(new Error("Tempo limite excedido."));
                    }
                } catch (e) {
                    // Ignora erros de rede momentâneos
                }
            }, 5000); // Checa a cada 5s
        });
    }
};
