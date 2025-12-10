
import { GoogleGenAI, Modality, Schema, Type } from "@google/genai";
import { Avatar, StoryChapter } from "../types";

// --- CONFIGURAÇÃO DO CLIENTE ---

const getAiClient = () => {
  // @ts-ignore
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
      console.error("API Key inválida ou não encontrada.");
      throw new Error("Chave de API do Google não configurada.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- SERVIÇOS EXPORTADOS ---

export const analyzeFaceForAvatar = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Describe this person's face for a cartoon character (hair color, eye color, skin tone, glasses?). Output in English. Be concise." }
        ]
      }
    });
    return response.text || "Cute cartoon character";
  } catch (error) {
    console.error("Erro analyzeFace:", error);
    return "Happy child cartoon character";
  }
};

export const generateCaricatureImage = async (description: string): Promise<string> => {
  const seed = Math.floor(Math.random() * 99999);
  const safeDesc = description ? description.substring(0, 100) : "cute character";
  const prompt = `cute 3d disney pixar character, ${safeDesc}, white background, soft lighting, 4k, --no text`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&seed=${seed}&nologo=true&model=flux`;
};

export const generateChapterIllustration = (visualDescription: string, charactersDescription: string = ''): string => {
  const seed = Math.floor(Math.random() * 99999);
  const safeDesc = visualDescription ? visualDescription.substring(0, 150) : "happy scene";
  const prompt = `children book illustration, vector art, colorful, cute, flat style, ${safeDesc}, featuring ${charactersDescription}, --no text`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=600&seed=${seed}&nologo=true&model=flux`;
};

// SCHEMA PARA HISTÓRIA
const storySchema: Schema = {
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
          visualDescription: { type: Type.STRING },
        },
        required: ["title", "text", "visualDescription"],
      },
    },
    educationalGoal: { type: Type.STRING },
  },
  required: ["title", "chapters"],
};

export const generateStory = async (theme: string, characters: Avatar[]): Promise<{ title: string, chapters: StoryChapter[] }> => {
  const ai = getAiClient();
  const charContext = characters.map(c => `${c.name} (${c.description})`).join("; ");

  const prompt = `
    Crie uma história infantil divertida e criativa.
    Tema: "${theme}".
    Personagens: ${charContext}.
    
    A história deve ter um Título e exatamente 3 capítulos curtos.
    O texto deve ser em Português do Brasil.
    A descrição visual (visualDescription) deve ser em Inglês para geração de imagem.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: storySchema,
      }
    });

    const json = JSON.parse(response.text || "{}");
    
    if (!json.title || !json.chapters) {
        throw new Error("Resposta inválida da IA");
    }

    return { title: json.title, chapters: json.chapters };

  } catch (error) {
    console.error("generateStory Error:", error);
    throw new Error("Erro ao criar história. Tente novamente.");
  }
};

export const generatePedagogicalStory = async (situation: string, goal: string, teacher: Avatar, students: Avatar[]): Promise<{ title: string, chapters: StoryChapter[], educationalGoal: string }> => {
  const ai = getAiClient();
  const names = students.map(s => s.name).join(", ");

  const prompt = `
    Crie uma fábula educativa escolar curta.
    Situação: "${situation}".
    Objetivo Pedagógico: "${goal}".
    Professor: ${teacher.name}. Alunos: ${names}.
    
    A história deve ensinar o objetivo através da situação.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: storySchema,
      }
    });

    const json = JSON.parse(response.text || "{}");
    return { 
        title: json.title, 
        chapters: json.chapters, 
        educationalGoal: json.educationalGoal || goal 
    };

  } catch (error) {
    console.error("generatePedagogicalStory Error:", error);
    throw new Error("Erro ao gerar conteúdo escolar.");
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) return audioData;
    throw new Error("A IA não retornou áudio.");

  } catch (error) {
    console.error("TTS Error:", error);
    throw new Error("Falha na narração.");
  }
};
