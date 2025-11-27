
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

// --- HELPER: Extrator de JSON Robusto ---
const extractJSON = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch (e) {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    
    if (start !== -1 && end !== -1) {
      clean = clean.substring(start, end + 1);
      try {
        return JSON.parse(clean);
      } catch (e2) {
        try {
            clean = clean.replace(/[\u0000-\u001F]+/g, "");
            return JSON.parse(clean);
        } catch (e3) {
             throw new Error("Formato inválido.");
        }
      }
    }
    throw new Error("Nenhum JSON encontrado na resposta da IA.");
  }
};

// --- HELPER: Sanitizador de História ---
// Garante que o objeto retornado tenha a estrutura exata que o App espera, evitando erros de "undefined"
const sanitizeStoryData = (rawData: any): { title: string, chapters: StoryChapter[], educationalGoal: string } => {
  const title = rawData.title || rawData.storyTitle || "Sem Título";
  const educationalGoal = rawData.educationalGoal || "";
  
  let chapters: any[] = [];
  
  // Tenta encontrar o array de capítulos em várias chaves comuns que a IA pode confundir
  if (Array.isArray(rawData.chapters)) chapters = rawData.chapters;
  else if (Array.isArray(rawData.parts)) chapters = rawData.parts;
  else if (Array.isArray(rawData.story)) chapters = rawData.story;
  
  // Mapeia para o formato estrito do App
  const cleanChapters: StoryChapter[] = chapters.map((c: any, index: number) => ({
    title: c.title || c.chapterTitle || `Capítulo ${index + 1}`,
    text: c.text || c.content || c.storyText || "Texto indisponível.",
    visualDescription: c.visualDescription || c.imagePrompt || c.description || "Scene from a children's story"
  }));

  if (cleanChapters.length === 0) {
      throw new Error("A IA gerou uma história sem capítulos válidos.");
  }

  return { title, chapters: cleanChapters, educationalGoal };
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
    return "Cute child cartoon character";
  }
};

/**
 * 2. Gera a URL da imagem usando Pollinations.ai
 */
export const generateCaricatureImage = async (description: string): Promise<string> => {
  const seed = Math.floor(Math.random() * 10000);
  const safeDesc = description && description.trim().length > 0 ? description : "cute 3d character";
  const prompt = `cute 3d disney pixar character, ${safeDesc}, white background, soft studio lighting, 4k render, vibrant colors, --no text`;
  const encodedPrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&seed=${seed}&nologo=true&model=flux`;
};

/**
 * 3. Gera URL para ilustração de um capítulo específico
 */
export const generateChapterIllustration = (visualDescription: string, charactersDescription: string = ''): string => {
  const seed = Math.floor(Math.random() * 10000);
  const safeDesc = visualDescription && visualDescription.length > 5 ? visualDescription : "happy children learning and playing together in a colorful environment";
  
  const fullPrompt = `children book illustration, vector art, colorful, cute, flat style, ${safeDesc}, featuring ${charactersDescription}, --no text`;
  const encodedPrompt = encodeURIComponent(fullPrompt);
  
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=600&seed=${seed}&nologo=true&model=flux`;
};

/**
 * 4. Gera a História (Lazer/Padrão)
 */
export const generateStory = async (theme: string, characters: Avatar[]): Promise<{ title: string, chapters: StoryChapter[] }> => {
  const ai = getAiClient();
  const charNames = characters.map(c => c.name).join(", ");
  const charDescs = characters.map(c => c.description).join("; ");

  try {
    // TENTATIVA 1
    const prompt = `
      Você é um autor de livros infantis. Escreva uma história curta (4 partes) sobre "${theme}".
      Personagens: ${charNames} (${charDescs}).
      
      RETORNE APENAS JSON:
      {
         "title": "Título",
         "chapters": [
            { "title": "Cap 1", "text": "...", "visualDescription": "English scene description" }
         ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    if (response.text) return sanitizeStoryData(extractJSON(response.text));
    throw new Error("Resposta vazia.");

  } catch (error) {
    console.warn("Tentando fallback simplificado...", error);
    try {
        // TENTATIVA 2
        const promptSimple = `
            Crie uma história de 4 parágrafos sobre: ${theme}. Personagens: ${charNames}.
            Formato JSON: {"title": "X", "chapters": [{"title": "P1", "text": "...", "visualDescription": "English desc"}]}
        `;
        const responseSimple = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: promptSimple,
            config: { responseMimeType: "application/json" }
        });
        if (responseSimple.text) return sanitizeStoryData(extractJSON(responseSimple.text));
    } catch (finalError) {
        throw new Error("Falha na geração da história.");
    }
  }
  throw new Error("Erro desconhecido.");
};

/**
 * 4.1 Gera História PEDAGÓGICA (Modo Escola)
 */
export const generatePedagogicalStory = async (situation: string, goal: string, teacher: Avatar, students: Avatar[]): Promise<{ title: string, educationalGoal: string, chapters: StoryChapter[] }> => {
    const ai = getAiClient();
    const studentDetails = students.map(c => `${c.name} (Visual: ${c.description})`).join("; ");

    try {
      // TENTATIVA 1 (BNCC)
      const promptComplex = `
        ATUE COMO: Pedagogo/Autor Infantil.
        CONTEXTO: Aula sobre "${goal}" baseada na situação "${situation}".
        PERSONAGENS: Prof. ${teacher.name} e alunos: ${studentDetails}.
  
        Crie uma história de 4 partes com lição de moral clara.
        
        JSON OBRIGATÓRIO:
        {
          "title": "Título da Aula",
          "educationalGoal": "${goal}",
          "chapters": [
            {
              "title": "Título da Parte",
              "text": "Texto da história...",
              "visualDescription": "Descrição da cena em INGLÊS."
            }
          ]
        }
      `;
  
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptComplex,
        config: { responseMimeType: "application/json" }
      });
  
      if (response.text) return sanitizeStoryData(extractJSON(response.text));
      throw new Error("Resposta vazia");

    } catch (error) {
      console.warn("Tentando fallback pedagógico...", error);
      try {
        // TENTATIVA 2 (Simples)
        const promptSimple = `
            Escreva uma história educativa curta (4 partes) sobre "${situation}" ensinando "${goal}".
            Personagens: Prof ${teacher.name} e alunos ${studentDetails}.
            JSON: {"title": "X", "educationalGoal": "${goal}", "chapters": [{"title": "1", "text": "...", "visualDescription": "English desc"}]}
        `;

        const responseSimple = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: promptSimple,
            config: { responseMimeType: "application/json" }
        });

        if (responseSimple.text) return sanitizeStoryData(extractJSON(responseSimple.text));
        
      } catch (finalError) {
          throw new Error("Não foi possível gerar a aula. Tente simplificar o objetivo.");
      }
    }
    throw new Error("Falha desconhecida.");
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
