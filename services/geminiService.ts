
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Avatar, StoryChapter } from "../types";

// --- CONFIGURAÇÃO DO CLIENTE ---

// Initialize GoogleGenAI with either GEMINI_API_KEY or API_KEY.
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ 
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper para converter códigos de idioma para nomes completos que a IA entende bem
const getLanguageName = (langCode: string): string => {
  const map: Record<string, string> = {
    'pt-BR': 'Português do Brasil',
    'en-US': 'English',
    'es-ES': 'Español',
    'fr-FR': 'Français'
  };
  return map[langCode] || 'Português do Brasil';
};

// --- TRATAMENTO DE ERROS DA API ---
const handleGenAIError = (error: any) => {
  const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error)).toLowerCase();
  const msg = (error?.message || '').toLowerCase();
  const combined = errorString + msg;
  
  if (combined.includes("leaked") || combined.includes("api key not valid")) {
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
      model: 'gemini-3.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Describe this person's face for a cartoon character (hair color, eye color, skin tone, glasses?). Output in English. Be concise." }
        ]
      }
    });
    // Access generated text using the property .text (not a method).
    return response.text || "Cute cartoon character";
  } catch (error) {
    console.error("AnalyzeFace falhou, usando fallback.", error);
    const strErr = JSON.stringify(error || {}).toLowerCase();
    if (strErr.includes("leaked")) throw error;
    
    return "Happy child cartoon character"; 
  }
};

export const generateCaricatureImage = async (description: string): Promise<string> => {
  const prompt = `cute 3d disney pixar character, ${description}, white background, soft lighting, 4k`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    // Fixed: Iterate through response parts to identify the correct image part.
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

export const generateChapterIllustration = async (visualDescription: string, charactersDescription: string = ''): Promise<string> => {
  const prompt = `children book illustration, vector art, colorful, cute, flat style, ${visualDescription}, featuring ${charactersDescription}`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    // Fixed: Iterate through response parts to identify the correct image part.
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

export const generateStory = async (theme: string, characters: Avatar[], language: string = 'pt-BR'): Promise<{ title: string, chapters: StoryChapter[] }> => {
  const charContext = characters.map(c => `${c.name} (${c.description})`).join("; ");
  const languageName = getLanguageName(language);

  const prompt = `
    Crie uma história infantil curta, extremamente divertida, carismática e engraçada.
    Tema ou Lição de Vida: "${theme}".
    Personagens principais: ${charContext}.
    
    Diretrizes Criativas & Tom:
    - O tom deve ser alegre, caloroso e cativante, perfeito para um pai/mãe ocupado ler e se divertir junto com o filho pequeno.
    - Se o tema focar em uma lição pedagógica/social (ex: "Não fale com estranhos"), ensine-a de forma lúdica, amigável e segura, SEM assustar ou traumatizar a criança. Mostre os personagens agindo com inteligência e humor (ex: recusando educadamente um convite engraçado ou uma oferta absurda, como um pato de óculos escuros oferecendo chiclete de brócolis).
    - Faça os personagens interagirem de forma engraçada e expressiva.
    - Cada capítulo deve ser curto (3-5 frases), de fácil leitura em voz alta.
    
    Estrutura: Título e exatamente 4 capítulos curtos.
    IDIOMA OBRIGATÓRIO DA HISTÓRIA: ${languageName}.
    VisualDescription: Em Inglês (prompt para imagem, ultra detalhado, estilo livro de ilustração infantil 3D Pixar, colorido e vibrante).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: storySchema,
      }
    });

    // Access generated text output via the property .text.
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

export const generatePedagogicalStory = async (situation: string, goal: string, teacher: Avatar, students: Avatar[], language: string = 'pt-BR'): Promise<{ title: string, chapters: StoryChapter[], educationalGoal: string }> => {
  const names = students.map(s => s.name).join(", ");
  const languageName = getLanguageName(language);

  const prompt = `
    Crie uma fábula educativa escolar com 4 capítulos.
    Situação: "${situation}".
    Objetivo Pedagógico (BNCC ou similar): "${goal}".
    Professor: ${teacher.name}. Alunos: ${names}.
    IDIOMA OBRIGATÓRIO DA HISTÓRIA: ${languageName}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: storySchema,
      }
    });

    // Access generated text output via the property .text.
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
      model: 'gemini-3.1-flash-tts-preview',
      // Wrapped content parameters in an array of objects to comply with SDK requirements.
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { 
            prebuiltVoiceConfig: { voiceName: 'Kore' } 
          }
        }
      }
    });

    // Fixed: Extract encoded audio data correctly from the first part of the model turn.
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) return audioData;
    throw new Error("Áudio não gerado.");

  } catch (error) {
    handleGenAIError(error);
    throw error;
  }
};
