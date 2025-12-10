
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Avatar, StoryChapter } from "../types";

const getAiClient = () => {
  let apiKey = '';
  
  // Acesso seguro ao process.env para evitar ReferenceError
  try {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
          // @ts-ignore
          apiKey = process.env.API_KEY;
      }
  } catch(e) {}

  // Fallback para import.meta.env (Vite)
  if (!apiKey) {
      try {
          // @ts-ignore
          if (import.meta && import.meta.env && import.meta.env.VITE_API_KEY) {
              // @ts-ignore
              apiKey = import.meta.env.VITE_API_KEY;
          }
      } catch(e) {}
  }

  // Limpeza de aspas residuais se houver
  if (apiKey) apiKey = apiKey.replace(/"/g, '').trim();
  
  if (!apiKey || apiKey.length < 10) {
    console.error("API KEY ausente ou inválida. Verifique as configurações do Render.");
    throw new Error("Chave de API não configurada na aplicação.");
  }
  return new GoogleGenAI({ apiKey });
};

const extractJSON = (text: string): any => {
  if (!text) return {};
  
  let clean = text.trim();
  
  // 1. Remove blocos de código Markdown
  clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  
  // 2. Tenta encontrar os limites do JSON
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  
  if (start !== -1 && end !== -1) {
    clean = clean.substring(start, end + 1);
  } else {
    // Se não achar chaves, talvez seja um erro ou texto plano
    throw new Error("Formato de resposta inválido (não é JSON).");
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("Erro ao parsear JSON:", e);
    // Tentativa desesperada: limpar caracteres de controle
    try {
        clean = clean.replace(/[\u0000-\u001F]+/g, " ");
        return JSON.parse(clean);
    } catch (e2) {
         throw new Error("Não foi possível ler a resposta da IA.");
    }
  }
};

const sanitizeStoryData = (rawData: any): { title: string, chapters: StoryChapter[], educationalGoal: string } => {
  const title = rawData.title || rawData.storyTitle || "Sem Título";
  const educationalGoal = rawData.educationalGoal || "";
  
  let chapters: any[] = [];
  
  if (Array.isArray(rawData.chapters)) chapters = rawData.chapters;
  else if (Array.isArray(rawData.parts)) chapters = rawData.parts;
  else if (Array.isArray(rawData.story)) chapters = rawData.story;
  
  // Validação dos capítulos
  const cleanChapters: StoryChapter[] = chapters.map((c: any, index: number) => ({
    title: c.title || c.chapterTitle || `Capítulo ${index + 1}`,
    text: c.text || c.content || c.storyText || "Texto indisponível.",
    visualDescription: c.visualDescription || c.imagePrompt || c.description || "Scene from a children's story cartoon style"
  }));

  if (cleanChapters.length === 0) {
      throw new Error("A história foi gerada vazia. Tente novamente.");
  }

  return { title, chapters: cleanChapters, educationalGoal };
};

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

export const generateCaricatureImage = async (description: string): Promise<string> => {
  const seed = Math.floor(Math.random() * 10000);
  const safeDesc = description && description.trim().length > 0 ? description : "cute 3d character";
  const prompt = `cute 3d disney pixar character, ${safeDesc}, white background, soft studio lighting, 4k render, vibrant colors, --no text`;
  const encodedPrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&seed=${seed}&nologo=true&model=flux`;
};

export const generateChapterIllustration = (visualDescription: string, charactersDescription: string = ''): string => {
  const seed = Math.floor(Math.random() * 10000);
  const safeDesc = visualDescription && visualDescription.length > 5 ? visualDescription : "happy children learning and playing together in a colorful environment";
  
  const fullPrompt = `children book illustration, vector art, colorful, cute, flat style, ${safeDesc}, featuring ${charactersDescription}, --no text`;
  const encodedPrompt = encodeURIComponent(fullPrompt);
  
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=600&seed=${seed}&nologo=true&model=flux`;
};

export const generateStory = async (theme: string, characters: Avatar[]): Promise<{ title: string, chapters: StoryChapter[] }> => {
  const ai = getAiClient();
  const charNames = characters.map(c => c.name).join(", ");
  const charDescs = characters.map(c => `${c.name}: ${c.description}`).join("; ");

  const basePrompt = `
    Crie uma história infantil divertida e criativa com o tema: "${theme}".
    
    Personagens: ${charNames}.
    Descrições visuais: ${charDescs}.
    
    A história deve ter título e ser dividida em 3 a 5 capítulos curtos.
    Para cada capítulo, forneça:
    - Um título curto para o capítulo.
    - O texto narrativo (adequado para crianças, em português).
    - Uma descrição visual detalhada da cena para gerar uma ilustração (em inglês, focando no estilo cartoon).
  `;

  // Configuração Schema (Método Preferido)
  const schemaConfig = {
    responseMimeType: 'application/json',
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
            },
            required: ["title", "text", "visualDescription"]
          }
        }
      },
      required: ["title", "chapters"]
    }
  };

  try {
    // TENTATIVA 1: Schema Rígido
    console.log("Gerando história (Método 1 - Schema)...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: basePrompt,
      config: schemaConfig
    });

    const json = extractJSON(response.text || "{}");
    const sanitized = sanitizeStoryData(json);
    return { title: sanitized.title, chapters: sanitized.chapters };

  } catch (error) {
    console.warn("Método 1 falhou, tentando fallback (Método 2 - Texto)...", error);

    // TENTATIVA 2: Fallback (Texto Livre formatado como JSON)
    try {
        const fallbackPrompt = `
            ${basePrompt}
            
            IMPORTANTE: Sua resposta DEVE ser estritamente um JSON válido, sem markdown, seguindo este formato:
            {
                "title": "Título da História",
                "chapters": [
                    {
                        "title": "Título do Capítulo",
                        "text": "Texto da história...",
                        "visualDescription": "Visual description in English..."
                    }
                ]
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fallbackPrompt,
            config: { responseMimeType: 'application/json' }
        });

        const json = extractJSON(response.text || "{}");
        const sanitized = sanitizeStoryData(json);
        return { title: sanitized.title, chapters: sanitized.chapters };
        
    } catch (finalError) {
        console.error("Erro fatal na geração:", finalError);
        throw new Error("A IA não conseguiu criar a história agora. Tente um tema diferente ou mais simples.");
    }
  }
};

export const generatePedagogicalStory = async (situation: string, goal: string, teacher: Avatar, students: Avatar[]): Promise<{ title: string, chapters: StoryChapter[], educationalGoal: string }> => {
  const ai = getAiClient();
  const studentNames = students.map(s => s.name).join(", ");
  
  const basePrompt = `
    Você é um assistente pedagógico especializado na BNCC.
    Crie uma fábula educativa ou história social para crianças.
    
    Situação/Problema Real: "${situation}"
    Objetivo Pedagógico (BNCC): "${goal}"
    
    Personagens:
    - Educador(a): ${teacher.name} (que guia e media)
    - Alunos: ${studentNames} (que vivem a situação)
    
    A história deve:
    1. Apresentar o conflito de forma lúdica.
    2. Desenvolver a resolução com mediação do educador.
    3. Ter uma lição de moral ou conclusão alinhada ao objetivo.
    
    Estruture em 3 a 5 capítulos curtos.
  `;

  const schemaConfig = {
    responseMimeType: 'application/json',
    responseSchema: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            educationalGoal: { type: Type.STRING },
            chapters: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        text: { type: Type.STRING },
                        visualDescription: { type: Type.STRING }
                    },
                    required: ["title", "text", "visualDescription"]
                }
            }
        },
        required: ["title", "educationalGoal", "chapters"]
    }
  };

  try {
    // TENTATIVA 1
    console.log("Gerando aula (Método 1)...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: basePrompt,
      config: schemaConfig
    });

    const json = extractJSON(response.text || "{}");
    return sanitizeStoryData(json);

  } catch (error) {
    console.warn("Método 1 falhou, tentando fallback...", error);
    
    // TENTATIVA 2
    try {
        const fallbackPrompt = `
            ${basePrompt}
            Responda APENAS em JSON válido:
            { "title": "...", "educationalGoal": "...", "chapters": [{ "title": "...", "text": "...", "visualDescription": "..." }] }
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fallbackPrompt,
            config: { responseMimeType: 'application/json' }
        });
        const json = extractJSON(response.text || "{}");
        return sanitizeStoryData(json);
    } catch (e) {
        console.error("Erro fatal aula:", e);
        throw new Error("Erro na geração pedagógica.");
    }
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: {
        parts: [{ text }]
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' } // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
          }
        }
      }
    });

    if (response.candidates && response.candidates[0].content.parts[0].inlineData) {
        return response.candidates[0].content.parts[0].inlineData.data;
    }
    throw new Error("Áudio não gerado.");

  } catch (error) {
    console.error("Erro no TTS:", error);
    throw new Error("Falha ao narrar texto.");
  }
};
