
import { GoogleGenAI, Modality } from "@google/genai";
import { Avatar, StoryChapter } from "../types";

// --- CONFIGURAÇÃO SIMPLIFICADA ---

const getAiClient = () => {
  // @ts-ignore
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key não configurada");
  return new GoogleGenAI({ apiKey });
};

// --- FUNÇÕES AUXILIARES ---

const extractJSON = (text: string): any => {
  if (!text) return {};
  
  let clean = text.trim();
  
  // Tenta extrair de blocos de código markdown
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
  const match = clean.match(jsonBlockRegex);
  if (match && match[1]) {
    clean = match[1];
  } else {
    // Se não tiver bloco explícito, tenta limpar o começo e fim
    clean = clean.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    // Tentativa de recuperação: buscar primeiro { e último }
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(clean.substring(start, end + 1));
      } catch (e2) {}
    }
    console.error("Erro parsing JSON:", e);
    throw new Error("A IA gerou um texto inválido. Tente novamente.");
  }
};

const sanitizeStoryData = (rawData: any): { title: string, chapters: StoryChapter[], educationalGoal: string } => {
  const title = rawData.title || "Minha História Mágica";
  const educationalGoal = rawData.educationalGoal || "";
  
  let chapters: any[] = [];
  if (Array.isArray(rawData.chapters)) chapters = rawData.chapters;
  else if (Array.isArray(rawData.parts)) chapters = rawData.parts;
  
  // Garante pelo menos um capítulo
  if (!chapters || chapters.length === 0) {
      if (rawData.text) {
          chapters = [rawData];
      } else {
          throw new Error("História gerada sem capítulos.");
      }
  }
  
  const cleanChapters: StoryChapter[] = chapters.map((c: any, index: number) => ({
    title: c.title || `Capítulo ${index + 1}`,
    text: c.text || c.content || c.story || "Texto indisponível.",
    visualDescription: c.visualDescription || c.imagePrompt || "Children story illustration, cartoon style"
  }));

  return { title, chapters: cleanChapters, educationalGoal };
};

// --- SERVIÇOS ---

export const analyzeFaceForAvatar = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Describe the person's physical appearance (hair, eyes, skin) for a cartoon avatar. Be concise." }
        ]
      }
    });
    return response.text || "Cute cartoon character";
  } catch (error) {
    return "Happy child cartoon character";
  }
};

export const generateCaricatureImage = async (description: string): Promise<string> => {
  const seed = Math.floor(Math.random() * 99999);
  const prompt = `cute 3d disney pixar character, ${description}, white background, soft lighting, 4k, --no text`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&seed=${seed}&nologo=true&model=flux`;
};

export const generateChapterIllustration = (visualDescription: string, charactersDescription: string = ''): string => {
  const seed = Math.floor(Math.random() * 99999);
  const prompt = `children book illustration, vector art, colorful, cute, flat style, ${visualDescription}, featuring ${charactersDescription}, --no text`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=600&seed=${seed}&nologo=true&model=flux`;
};

export const generateStory = async (theme: string, characters: Avatar[]): Promise<{ title: string, chapters: StoryChapter[] }> => {
  const ai = getAiClient();
  const charContext = characters.map(c => `${c.name} (${c.description})`).join("; ");

  const prompt = `
    Você é um escritor de livros infantis.
    Escreva uma história divertida sobre: "${theme}".
    Personagens: ${charContext}.
    
    A história deve ter um título e exatamente 3 capítulos curtos.
    
    IMPORTANTE: Responda APENAS com um código JSON válido. Não inclua conversas.
    Use este formato:
    \`\`\`json
    {
      "title": "Título da História",
      "chapters": [
        {
          "title": "Título do Capítulo",
          "text": "Texto do capítulo em português...",
          "visualDescription": "Descrição visual da cena em inglês (cartoon style) para gerar imagem..."
        }
      ]
    }
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      // Removido responseMimeType para evitar conflitos de schema
    });

    const json = extractJSON(response.text || "{}");
    return sanitizeStoryData(json);

  } catch (error) {
    console.error("generateStory Error:", error);
    throw new Error("Não foi possível gerar a história. Tente um tema mais simples.");
  }
};

export const generatePedagogicalStory = async (situation: string, goal: string, teacher: Avatar, students: Avatar[]): Promise<{ title: string, chapters: StoryChapter[], educationalGoal: string }> => {
  const ai = getAiClient();
  const names = students.map(s => s.name).join(", ");

  const prompt = `
    Crie uma fábula educativa escolar.
    Situação: "${situation}".
    Objetivo Pedagógico: "${goal}".
    Professor: ${teacher.name}. Alunos: ${names}.
    
    Responda APENAS com JSON:
    \`\`\`json
    {
      "title": "Título da Aula",
      "educationalGoal": "${goal}",
      "chapters": [
        {
          "title": "Título",
          "text": "Texto...",
          "visualDescription": "Scene description in English..."
        }
      ]
    }
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const json = extractJSON(response.text || "{}");
    return sanitizeStoryData(json);

  } catch (error) {
    console.error("Pedagogical Error:", error);
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
    throw new Error("Sem dados de áudio.");

  } catch (error) {
    console.error("TTS Error:", error);
    throw new Error("Não foi possível narrar o texto.");
  }
};
