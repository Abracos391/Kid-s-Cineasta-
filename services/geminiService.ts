import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Avatar, StoryChapter } from "../types";

// Função auxiliar para validar a chave
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey.length < 10) {
    console.error("API KEY ausente ou inválida. Verifique as configurações do Render.");
    throw new Error("Chave de API não configurada na aplicação.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * 1. Analisa a foto para criar uma descrição textual (Prompt)
 */
export const analyzeFaceForAvatar = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: "Descreva as características físicas principais desta pessoa (cabelo, olhos, cor da pele, óculos, sorriso) em inglês para um prompt de IA. Seja breve. Exemplo: 'Little boy with curly dark hair, glasses, big smile'."
          }
        ]
      }
    });
    return response.text || "A happy child";
  } catch (error) {
    console.error("Erro ao analisar rosto:", error);
    // Fallback genérico se a visão falhar
    return "Cute child cartoon character";
  }
};

/**
 * 2. Gera a URL da imagem usando Pollinations.ai (Gratuito/Ilimitado)
 */
export const generateCaricatureImage = async (description: string): Promise<string> => {
  const seed = Math.floor(Math.random() * 10000);
  const prompt = `cute 3d disney pixar character, ${description}, white background, soft studio lighting, 4k render, vibrant colors, --no text`;
  const encodedPrompt = encodeURIComponent(prompt);
  
  // URL direta do Pollinations
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&seed=${seed}&nologo=true&model=flux`;
};

/**
 * 3. Gera URL para ilustração de um capítulo específico
 */
export const generateChapterIllustration = (visualDescription: string): string => {
  const seed = Math.floor(Math.random() * 10000);
  const prompt = `children book illustration, vector art, colorful, cute, flat style, ${visualDescription}, --no text`;
  const encodedPrompt = encodeURIComponent(prompt);
  
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=600&seed=${seed}&nologo=true&model=flux`;
};

/**
 * 4. Gera a História (Texto e Estrutura)
 * CORREÇÃO CRÍTICA: Limpeza de JSON adicionada
 */
export const generateStory = async (theme: string, characters: Avatar[]): Promise<{ title: string, chapters: StoryChapter[] }> => {
  try {
    const ai = getAiClient();
    
    const charNames = characters.map(c => c.name).join(", ");
    const charDescs = characters.map(c => c.description).join("; ");

    const prompt = `
      Você é um autor de livros infantis premiado. Escreva uma história curta e envolvente para crianças de 5-8 anos.
      
      Tema: "${theme}".
      Personagens Principais: ${charNames} (${charDescs}).
      
      Estrutura Obrigatória (JSON puro, sem markdown):
      1. Título Criativo.
      2. Exatamente 4 capítulos curtos.
      3. Para cada capítulo, inclua:
         - "title": Título do capítulo.
         - "text": O texto da história (aprox 60 palavras por capítulo).
         - "visualDescription": Uma descrição curta da cena para o ilustrador desenhar (em inglês).

      Responda APENAS com o JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  text: { type: Type.STRING },
                  visualDescription: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    let jsonText = response.text;
    if (!jsonText) throw new Error("A IA retornou um texto vazio.");

    // CORREÇÃO: Remover blocos de código Markdown (```json ... ```) que quebram o parse
    jsonText = jsonText.replace(/```json|```/g, '').trim();
    
    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Erro ao gerar história:", error);
    throw error;
  }
};

/**
 * 5. Gera Áudio (TTS)
 */
export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const ai = getAiClient();
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Falha na geração de áudio");
    
    return base64Audio;

  } catch (error) {
    console.error("Erro ao gerar áudio:", error);
    throw error;
  }
};