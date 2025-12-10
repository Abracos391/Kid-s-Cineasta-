
import { GoogleGenAI, Modality } from "@google/genai";
import { Avatar, StoryChapter } from "../types";

// --- CONFIGURAÇÃO DO CLIENTE ---

const getAiClient = () => {
  let apiKey = '';
  
  try {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
          // @ts-ignore
          apiKey = process.env.API_KEY;
      }
  } catch(e) {}

  if (!apiKey) {
      try {
          // @ts-ignore
          if (import.meta && import.meta.env && import.meta.env.VITE_API_KEY) {
              // @ts-ignore
              apiKey = import.meta.env.VITE_API_KEY;
          }
      } catch(e) {}
  }

  if (apiKey) apiKey = apiKey.replace(/"/g, '').trim();
  
  if (!apiKey || apiKey.length < 10) {
    console.error("API KEY ausente.");
    throw new Error("Chave de API não configurada.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- FUNÇÕES AUXILIARES ---

const cleanJsonString = (text: string): string => {
  if (!text) return "{}";
  let clean = text.trim();
  // Remove markdown code blocks
  clean = clean.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
  return clean;
};

const extractJSON = (text: string): any => {
  try {
    const clean = cleanJsonString(text);
    return JSON.parse(clean);
  } catch (e) {
    console.warn("Falha no parse direto, tentando encontrar chaves...", e);
    const clean = cleanJsonString(text);
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(clean.substring(start, end + 1));
      } catch (e2) {
        throw new Error("A IA gerou um texto que não é um JSON válido.");
      }
    }
    throw new Error("Formato inválido recebido da IA.");
  }
};

const sanitizeStoryData = (rawData: any): { title: string, chapters: StoryChapter[], educationalGoal: string } => {
  const title = rawData.title || "Minha História";
  const educationalGoal = rawData.educationalGoal || "";
  
  let chapters: any[] = [];
  if (Array.isArray(rawData.chapters)) chapters = rawData.chapters;
  else if (Array.isArray(rawData.parts)) chapters = rawData.parts;
  
  if (chapters.length === 0) {
      // Fallback para estrutura plana se a IA errar feio
      if (rawData.text && rawData.visualDescription) {
          chapters = [rawData];
      } else {
          throw new Error("História vazia.");
      }
  }
  
  const cleanChapters: StoryChapter[] = chapters.map((c: any, index: number) => ({
    title: c.title || `Capítulo ${index + 1}`,
    text: c.text || c.content || "Texto indisponível.",
    visualDescription: c.visualDescription || c.imagePrompt || "Cute cartoon scene"
  }));

  return { title, chapters: cleanChapters, educationalGoal };
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
          { text: "Describe the physical appearance of this person (hair, eyes, skin, accessories) in English. Be brief. Ex: 'Little boy with curly hair'." }
        ]
      }
    });
    return response.text || "Cute cartoon character";
  } catch (error) {
    return "Cute child character";
  }
};

export const generateCaricatureImage = async (description: string): Promise<string> => {
  const seed = Math.floor(Math.random() * 9999);
  const safeDesc = description ? description : "cute character";
  const prompt = `cute 3d disney pixar character, ${safeDesc}, white background, soft lighting, 4k, --no text`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&seed=${seed}&nologo=true&model=flux`;
};

export const generateChapterIllustration = (visualDescription: string, charactersDescription: string = ''): string => {
  const seed = Math.floor(Math.random() * 9999);
  // Garante que a descrição não seja vazia
  const desc = visualDescription || "happy children playing";
  const prompt = `children book illustration, vector art, colorful, cute, flat style, ${desc}, featuring ${charactersDescription}, --no text`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=600&seed=${seed}&nologo=true&model=flux`;
};

export const generateStory = async (theme: string, characters: Avatar[]): Promise<{ title: string, chapters: StoryChapter[] }> => {
  const ai = getAiClient();
  const charContext = characters.map(c => `${c.name} (${c.description})`).join("; ");

  // Prompt simplificado e direto para JSON. Sem schemas complexos que quebram o fluxo.
  const prompt = `
    Crie uma história infantil curta e divertida.
    Tema: "${theme}".
    Personagens: ${charContext}.
    
    A história deve ter um Título e 3 a 4 capítulos curtos.
    
    IMPORTANTE: Responda APENAS com um JSON válido seguindo exatamente este modelo:
    {
      "title": "Título da História",
      "chapters": [
        {
          "title": "Título do Capítulo 1",
          "text": "Texto da narrativa em português...",
          "visualDescription": "Description of the scene in English for image generation (cartoon style)"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json', // Força JSON simples
      }
    });

    const json = extractJSON(response.text || "{}");
    const data = sanitizeStoryData(json);
    return { title: data.title, chapters: data.chapters };

  } catch (error) {
    console.error("Erro generateStory:", error);
    throw new Error("Não foi possível criar a história. Tente novamente.");
  }
};

export const generatePedagogicalStory = async (situation: string, goal: string, teacher: Avatar, students: Avatar[]): Promise<{ title: string, chapters: StoryChapter[], educationalGoal: string }> => {
  const ai = getAiClient();
  const names = students.map(s => s.name).join(", ");

  const prompt = `
    Crie uma fábula educativa escolar (BNCC).
    Situação: "${situation}".
    Objetivo: "${goal}".
    Educador: ${teacher.name}. Alunos: ${names}.
    
    Responda APENAS com JSON:
    {
      "title": "Título da Aula",
      "educationalGoal": "${goal}",
      "chapters": [
        {
          "title": "Capítulo 1",
          "text": "Narrativa em português...",
          "visualDescription": "Scene description in English"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const json = extractJSON(response.text || "{}");
    return sanitizeStoryData(json);

  } catch (error) {
    console.error("Erro generatePedagogicalStory:", error);
    throw new Error("Erro ao gerar aula.");
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
    throw new Error("Dados de áudio vazios.");

  } catch (error) {
    console.error("Erro TTS:", error);
    throw new Error("Falha na narração.");
  }
};
