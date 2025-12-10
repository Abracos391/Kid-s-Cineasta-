
import { GoogleGenAI, Modality } from "@google/genai";
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

// --- FUNÇÕES AUXILIARES DE PARSING ---

const extractJSON = (text: string): any => {
  if (!text) return {};
  
  try {
    // 1. Tentar parse direto (caso venha limpo devido ao responseMimeType)
    return JSON.parse(text);
  } catch (e) {
    // 2. Se falhar, limpar blocos de código Markdown (```json ... ```)
    let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    try {
        return JSON.parse(clean);
    } catch (e2) {
        // 3. Método "Cirúrgico": Encontrar o primeiro '{' e o último '}'
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            const jsonSubstring = text.substring(firstOpen, lastClose + 1);
            try {
                return JSON.parse(jsonSubstring);
            } catch (e3) {
                console.error("Falha final no parsing JSON:", e3);
                throw new Error("A IA gerou um conteúdo que não consegui ler. Tente novamente.");
            }
        }
        throw new Error("Formato de resposta inválido.");
    }
  }
};

const sanitizeStoryData = (rawData: any): { title: string, chapters: StoryChapter[], educationalGoal: string } => {
  const title = rawData.title || "Minha História Mágica";
  const educationalGoal = rawData.educationalGoal || "";
  
  let chapters: any[] = [];
  
  // Tenta encontrar o array de capítulos em várias propriedades comuns
  if (Array.isArray(rawData.chapters)) chapters = rawData.chapters;
  else if (Array.isArray(rawData.parts)) chapters = rawData.parts;
  else if (Array.isArray(rawData.story)) chapters = rawData.story;
  
  // Fallback: Se não achou array, mas tem texto direto
  if (chapters.length === 0) {
      if (rawData.text || rawData.content) {
          chapters = [rawData];
      } else {
          // Última tentativa: verificar se o próprio objeto raiz é um capítulo
          chapters = [{
              title: "Início",
              text: JSON.stringify(rawData),
              visualDescription: "Scene description"
          }];
      }
  }
  
  const cleanChapters: StoryChapter[] = chapters.map((c: any, index: number) => ({
    title: c.title || `Capítulo ${index + 1}`,
    text: c.text || c.content || c.story || "Texto indisponível.",
    visualDescription: c.visualDescription || c.imagePrompt || "Children story illustration, cartoon style, colorful"
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

export const generateStory = async (theme: string, characters: Avatar[]): Promise<{ title: string, chapters: StoryChapter[] }> => {
  const ai = getAiClient();
  const charContext = characters.map(c => `${c.name} (${c.description})`).join("; ");

  const prompt = `
    Crie uma história infantil divertida.
    Tema: "${theme}".
    Personagens: ${charContext}.
    
    A história deve ter um Título e 3 capítulos curtos.
    
    RETORNE APENAS JSON neste formato exato:
    {
      "title": "Título da História",
      "chapters": [
        {
          "title": "Título do Capítulo",
          "text": "Texto do capítulo em português...",
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
        responseMimeType: 'application/json', // Garante que a IA retorne JSON
      }
    });

    const json = extractJSON(response.text || "{}");
    const data = sanitizeStoryData(json);
    
    if (data.chapters.length === 0) throw new Error("História gerada sem capítulos válidos.");
    
    return { title: data.title, chapters: data.chapters };

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
    Objetivo: "${goal}".
    Professor: ${teacher.name}. Alunos: ${names}.
    
    RETORNE APENAS JSON neste formato:
    {
      "title": "Título da Aula",
      "educationalGoal": "${goal}",
      "chapters": [
        {
          "title": "Parte 1",
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
        responseMimeType: 'application/json',
      }
    });

    const json = extractJSON(response.text || "{}");
    return sanitizeStoryData(json);

  } catch (error) {
    console.error("generatePedagogicalStory Error:", error);
    throw new Error("Erro ao gerar conteúdo escolar.");
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = getAiClient();
  try {
    // Usando o modelo TTS dedicado
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
