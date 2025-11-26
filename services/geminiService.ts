
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
    // 1. Tenta parse direto
    return JSON.parse(text);
  } catch (e) {
    // 2. Remove blocos de código markdown
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    
    // 3. Encontra o primeiro '{' e o último '}'
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    
    if (start !== -1 && end !== -1) {
      clean = clean.substring(start, end + 1);
      try {
        return JSON.parse(clean);
      } catch (e2) {
        console.error("Falha ao extrair JSON:", text);
        throw new Error("A IA gerou um formato inválido.");
      }
    }
    throw new Error("Nenhum JSON encontrado na resposta da IA.");
  }
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
  const prompt = `cute 3d disney pixar character, ${description}, white background, soft studio lighting, 4k render, vibrant colors, --no text`;
  const encodedPrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&seed=${seed}&nologo=true&model=flux`;
};

/**
 * 3. Gera URL para ilustração de um capítulo específico
 */
export const generateChapterIllustration = (visualDescription: string, charactersDescription: string = ''): string => {
  const seed = Math.floor(Math.random() * 10000);
  // Fallback se a descrição vier vazia
  const safeDesc = visualDescription && visualDescription.length > 5 ? visualDescription : "happy children learning and playing together in a colorful environment";
  
  const fullPrompt = `children book illustration, vector art, colorful, cute, flat style, ${safeDesc}, featuring ${charactersDescription}, --no text`;
  const encodedPrompt = encodeURIComponent(fullPrompt);
  
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=600&seed=${seed}&nologo=true&model=flux`;
};

/**
 * 4. Gera a História (Lazer/Padrão)
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
      
      Estrutura Obrigatória (JSON puro):
      1. Título Criativo.
      2. Exatamente 4 capítulos curtos.
      3. Para cada capítulo, inclua:
         - "title": Título do capítulo.
         - "text": O texto da história (aprox 60 palavras por capítulo).
         - "visualDescription": Uma descrição curta da cena para o ilustrador desenhar (em inglês).

      IMPORTANTE: Retorne APENAS o JSON válido, sem markdown.
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

    const jsonText = response.text;
    if (!jsonText) throw new Error("A IA retornou um texto vazio.");

    return extractJSON(jsonText);

  } catch (error) {
    console.error("Erro ao gerar história:", error);
    throw error;
  }
};

/**
 * 4.1 Gera História PEDAGÓGICA (Modo Escola - BNCC)
 * Segue estritamente diretrizes educacionais brasileiras.
 */
export const generatePedagogicalStory = async (situation: string, goal: string, teacher: Avatar, students: Avatar[]): Promise<{ title: string, educationalGoal: string, chapters: StoryChapter[] }> => {
    try {
      const ai = getAiClient();
      
      // Cria uma string rica com Nome + Descrição Física para garantir consistência visual
      const studentDetails = students.map(c => `${c.name} (Visual: ${c.description})`).join("; ");
      
      const prompt = `
        ATUE COMO: Especialista em Educação Infantil e Fundamental I no Brasil (BNCC).
        
        CONTEXTO:
        - Situação Problema: "${situation}"
        - Objetivo Pedagógico: "${goal}"
        - Mediador: Prof. ${teacher.name}
        - Alunos: ${studentDetails}.
  
        TAREFA: Criar uma história didática em 4 partes.
        
        ESTRUTURA (JSON):
           - Cap 1: O Conflito (A situação acontece).
           - Cap 2: A Consequência (Sentimentos e efeitos).
           - Cap 3: A Mediação (Prof. ${teacher.name} intervém).
           - Cap 4: A Resolução (Aprendizado).
        
        SAÍDA OBRIGATÓRIA (JSON VÁLIDO):
        {
          "title": "Título da História",
          "educationalGoal": "Habilidade BNCC trabalhada",
          "chapters": [
            {
              "title": "...",
              "text": "Texto da história (pt-BR)...",
              "visualDescription": "Prompt detalhado em INGLÊS para gerar a imagem. Descreva quem está na cena e o que fazem. Ex: 'Teacher Maria talking to a boy with glasses in a park'."
            }
          ]
        }
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
              educationalGoal: { type: Type.STRING },
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
      if (!jsonText) throw new Error("A IA retornou um texto vazio.");
  
      return extractJSON(jsonText);
  
    } catch (error) {
      console.error("Erro ao gerar aula:", error);
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
