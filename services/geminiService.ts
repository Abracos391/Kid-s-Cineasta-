import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Avatar, StoryChapter } from "../types";

// Ensure API Key is handled safely in a real environment.
// For this demo, we assume it is present in process.env.
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

/**
 * 1. Analyze photo to get a text description for caricature.
 */
export const analyzeFaceForAvatar = async (base64Image: string): Promise<string> => {
  const ai = getAiClient();
  
  try {
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
            text: "Descreva as características faciais desta pessoa (cabelo, olhos, acessórios, expressão) para criar uma caricatura divertida e fofa estilo cartoon 2D. Seja breve."
          }
        ]
      }
    });
    return response.text || "Uma pessoa sorrindo";
  } catch (error) {
    console.error("Error analyzing face:", error);
    throw error;
  }
};

/**
 * 2. Generate a caricature image based on description.
 */
export const generateCaricatureImage = async (description: string): Promise<string> => {
  const ai = getAiClient();
  
  try {
    const prompt = `Uma caricatura fofa e colorida, estilo vetor 2D plano, fundo simples colorido, Incredivel Mundo de Gumball style, de: ${description}`;
    
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/jpeg'
      }
    });

    const base64 = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64) throw new Error("Failed to generate image");
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error("Error generating caricature:", error);
    // Fallback to a placeholder if generation fails (e.g., due to safety filters)
    return `https://picsum.photos/seed/${Math.random()}/400/400`;
  }
};

/**
 * 3. Generate a Story based on theme and characters.
 */
export const generateStory = async (theme: string, characters: Avatar[]): Promise<{ title: string, chapters: StoryChapter[] }> => {
  const ai = getAiClient();
  
  const charNames = characters.map(c => c.name).join(", ");
  const prompt = `
    Você é um escritor de livros infantis premiado. Crie uma história curta, divertida e educativa para crianças.
    Tema: "${theme}".
    Personagens principais: ${charNames}.
    
    A história deve ter 3 capítulos curtos.
    
    Retorne APENAS um JSON com a seguinte estrutura:
    {
      "title": "Título da História",
      "chapters": [
        {
          "title": "Título do Capítulo",
          "text": "Texto do capítulo...",
          "visualDescription": "Descrição visual da cena para ilustração"
        }
      ]
    }
  `;

  try {
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

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text returned");
    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Error generating story:", error);
    throw error;
  }
};

/**
 * 4. Generate Audio (TTS) for a chapter.
 */
export const generateSpeech = async (text: string): Promise<string> => {
  const ai = getAiClient();
  
  try {
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
    if (!base64Audio) throw new Error("No audio generated");
    
    // Convert base64 to blob url for playback
    // Note: The API returns raw PCM usually, but for this demo, passing to <audio> src often requires a container. 
    // However, browsers are tricky with raw PCM blobs directly in <audio>. 
    // We will return the base64 data URI with a wav header hint, 
    // or assume the browser can handle the data URI if MIME is correct. 
    // Re-reading the guide: "The audio bytes returned by the API is raw PCM data... it contains no header information".
    // Constructing a WAV header is complex for a single file snippet. 
    // We will use the provided decoding example in the component to play it via AudioContext, 
    // but to return a "URL" for the state, we might need a workaround.
    
    // Let's stick to the AudioContext playback method in the component instead of returning a simple URL.
    // Use a data URI for storage? No, raw PCM is heavy.
    // We will return the base64 string and let the UI component decode it.
    return base64Audio;

  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};