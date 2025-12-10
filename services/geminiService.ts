
import { GoogleGenAI, Modality, Schema, Type } from "@google/genai";
import { Avatar, StoryChapter } from "../types";

// --- CONFIGURAÇÃO DO CLIENTE ---

const getAiClient = () => {
  // @ts-ignore
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
      console.error("API Key inválida ou não encontrada.");
      throw new Error("Chave de API do Google não configurada no arquivo .env");
  }
  return new GoogleGenAI({ apiKey });
};

// --- TRATAMENTO DE ERROS DA API ---
const handleGenAIError = (error: any) => {
  const errStr = JSON.stringify(error || {});
  
  // Erro específico de chave vazada/bloqueada
  if (errStr.includes("leaked") || errStr.includes("PERMISSION_DENIED") || errStr.includes("API key not valid")) {
    throw new Error("🚨 SUA CHAVE API FOI BLOQUEADA PELO GOOGLE. O Google detectou que sua chave vazou. Crie uma nova chave em aistudio.google.com e atualize seu .env");
  }
  
  // Erro de cota
  if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("⏳ Cota de uso da IA excedida. Aguarde alguns minutos e tente novamente.");
  }

  // Erro de rede ou desconhecido
  console.error("Gemini Error Raw:", error);
  throw error;
};

// --- HELPER DE PARSING ---
const cleanAndParseJSON = (text: string | undefined): any => {
  if (!text) throw new Error("A IA retornou uma resposta vazia.");

  try {
    return JSON.parse(text);
  } catch (e) {
    // Limpeza agressiva de Markdown
    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleanText);
    } catch (e2) {
      console.error("Falha ao ler JSON:", text);
      throw new Error("Erro de formatação da IA. Tente novamente.");
    }
  }
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
    handleGenAIError(error);
    return "Happy child cartoon character"; // Fallback seguro
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

// SCHEMA OTIMIZADO PARA HISTÓRIA
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
    Crie uma história infantil curta e divertida.
    Tema: "${theme}".
    Personagens: ${charContext}.
    
    Estrutura: Título e exatamente 3 capítulos curtos.
    Idioma: Português do Brasil.
    VisualDescription: Em Inglês (prompt para imagem).
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

    const json = cleanAndParseJSON(response.text);
    
    if (!json.title || !json.chapters || !Array.isArray(json.chapters)) {
        throw new Error("A IA gerou uma história incompleta. Tente outro tema.");
    }

    return { title: json.title, chapters: json.chapters };

  } catch (error) {
    handleGenAIError(error);
    throw error;
  }
};

export const generatePedagogicalStory = async (situation: string, goal: string, teacher: Avatar, students: Avatar[]): Promise<{ title: string, chapters: StoryChapter[], educationalGoal: string }> => {
  const ai = getAiClient();
  const names = students.map(s => s.name).join(", ");

  const prompt = `
    Crie uma fábula educativa escolar.
    Situação: "${situation}".
    Objetivo Pedagógico (BNCC): "${goal}".
    Professor: ${teacher.name}. Alunos: ${names}.
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

    const json = cleanAndParseJSON(response.text);
    return { 
        title: json.title, 
        chapters: json.chapters, 
        educationalGoal: json.educationalGoal || goal 
    };

  } catch (error) {
    handleGenAIError(error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const ai = getAiClient();
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
    throw new Error("Áudio não gerado.");

  } catch (error) {
    handleGenAIError(error);
    throw error;
  }
};
