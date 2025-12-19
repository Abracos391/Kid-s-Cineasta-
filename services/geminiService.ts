
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Avatar, StoryChapter } from "../types";

// --- CONFIGURAÇÃO DO CLIENTE ---

// Fixed: Initialize GoogleGenAI as required by the SDK guidelines using process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// --- TRATAMENTO DE ERROS DA API ---
const handleGenAIError = (error: any) => {
  const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error)).toLowerCase();
  const msg = (error?.message || '').toLowerCase();
  const combined = errorString + msg;
  
  if (combined.includes("leaked") || combined.includes("permission_denied") || combined.includes("api key not valid") || combined.includes("403")) {
    throw new Error("CRITICAL_API_KEY_LEAKED: Sua chave de API foi bloqueada pelo Google por segurança.");
  }
  
  if (combined.includes("429") || combined.includes("quota") || combined.includes("resource_exhausted")) {
      throw new Error("⏳ Cota de uso da IA excedida. Aguarde alguns minutos e tente novamente.");
  }

  if (combined.includes("syntaxerror") || combined.includes("json")) {
      throw new Error("A IA não conseguiu gerar a história neste momento. O tema pode ter sido bloqueado pelos filtros de segurança.");
  }

  console.error("Gemini Error Raw:", error);
  throw new Error("Ocorreu um erro na comunicação com a IA. Tente novamente.");
};

// --- HELPER DE PARSING ---
const cleanAndParseJSON = (text: string | undefined): any => {
  if (!text) throw new Error("A IA retornou uma resposta vazia.");

  try {
    return JSON.parse(text);
  } catch (e) {
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
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Describe this person's face for a cartoon character (hair color, eye color, skin tone, glasses?). Output in English. Be concise." }
        ]
      }
    });
    // Fixed: Directly access text property as per guidelines
    return response.text || "Cute cartoon character";
  } catch (error) {
    console.error("AnalyzeFace falhou, usando fallback.", error);
    const strErr = JSON.stringify(error || {}).toLowerCase();
    if (strErr.includes("leaked") || strErr.includes("403")) throw error;
    
    return "Happy child cartoon character"; 
  }
};

// Fixed: Switched from external pollinations.ai to gemini-2.5-flash-image for generation to align with guidelines
export const generateCaricatureImage = async (description: string): Promise<string> => {
  const prompt = `cute 3d disney pixar character, ${description}, white background, soft lighting, 4k`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Image generation failed");
  } catch (error) {
    console.error("Gemini Image Gen failed:", error);
    const seed = Math.floor(Math.random() * 99999);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&seed=${seed}&nologo=true&model=flux`;
  }
};

// Fixed: Switched from external pollinations.ai to gemini-2.5-flash-image for illustrations as per guidelines
export const generateChapterIllustration = async (visualDescription: string, charactersDescription: string = ''): Promise<string> => {
  const prompt = `children book illustration, vector art, colorful, cute, flat style, ${visualDescription}, featuring ${charactersDescription}`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Illustration generation failed");
  } catch (error) {
    console.error("Gemini Illustration Gen failed:", error);
    const seed = Math.floor(Math.random() * 99999);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=600&seed=${seed}&nologo=true&model=flux`;
  }
};

const storySchema = {
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
  const charContext = characters.map(c => `${c.name} (${c.description})`).join("; ");

  const prompt = `
    Crie uma história infantil curta e divertida.
    Tema: "${theme}".
    Personagens: ${charContext}.
    
    Estrutura: Título e exatamente 4 capítulos curtos.
    Idioma: Português do Brasil.
    VisualDescription: Em Inglês (prompt para imagem).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: storySchema,
      }
    });

    // Fixed: Use .text property instead of text()
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
  const names = students.map(s => s.name).join(", ");

  const prompt = `
    Crie uma fábula educativa escolar com 4 capítulos.
    Situação: "${situation}".
    Objetivo Pedagógico (BNCC): "${goal}".
    Professor: ${teacher.name}. Alunos: ${names}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: storySchema,
      }
    });

    // Fixed: Use .text property directly
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

    // Fixed: Extract audio data using candidates[0].content.parts structure
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) return audioData;
    throw new Error("Áudio não gerado.");

  } catch (error) {
    handleGenAIError(error);
    throw error;
  }
};
