
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

export const analyzeFaceForAvatar = async (base64Image: string, characterName: string = ''): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: `Identify and analyze the character, animal, human, or creature shown in this photo/drawing to describe them for a highly detailed 3D animated character (Disney/Pixar style).

CONTEXT & HINTS:
The user named this character: "${characterName}". Use this name as a hint to help identify the creature's species, profession, or role if it matches the visual cues in the image.

ANALYSIS GUIDELINES:
1. DETECT THE SUBJECT SPECIES: Is it a bird, chick (pintinho), rooster, cow, horse, dog, dragon, robot, human child, human adult, or something else? Do not default to a human if it is clearly an animal or fantasy character. If it is an animal, explicitly describe it as that animal (e.g., "a yellow baby chick", "a friendly cow", "a funny long-necked rooster").
2. DESCRIBE KEY VISUAL FEATURES:
   - Body shape, posture, skin/fur/feather textures and colors.
   - Eyes: color, size, shape, expression (e.g., big cartoon eyes, expressive and joyful).
   - Head details: beak, snout, horns, hair, comb (crista), ears.
   - Clothing & Accessories: description of any garments, overalls, hats, glasses, or items they are holding (like paintbrushes, paint palettes, etc.).
3. STYLE & PERSPECTIVE: The description must be optimized for generating a polished, cinematic 3D CGI character.

Output ONLY a continuous, detailed English description, optimized to be used directly as an image generation prompt. Do NOT include any intro or conversational text.` }
        ]
      }
    });
    // Access generated text using the property .text (not a method).
    return response.text || "Cute cartoon character";
  } catch (error) {
    console.error("AnalyzeFace falhou, usando fallback.", error);
    const strErr = JSON.stringify(error || {}).toLowerCase();
    if (strErr.includes("leaked")) throw error;
    
    return "Happy cartoon character"; 
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

export const generateChapterIllustration = async (visualDescription: string, charactersDescription: string = '', aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string> => {
  const prompt = `children book illustration, vector art, colorful, cute, flat style, ${visualDescription}, featuring ${charactersDescription}`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: aspectRatio === '9:16' ? '3:4' : '16:9' // Using '3:4' or '9:16' as supported by Gemini 3.1 Image
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
    const width = aspectRatio === '9:16' ? 600 : 1024;
    const height = aspectRatio === '9:16' ? 1024 : 600;
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;
  }
};

export const generateYoutubeThumbnailImage = async (thumbnailPrompt: string, charactersDescription: string = ''): Promise<string> => {
  // Solicitamos um fundo limpo de impacto, sem textos gerados por IA para evitar letras distorcidas.
  const prompt = `A highly engaging professional YouTube thumbnail background, vibrant colors, epic dramatic lighting, highly detailed 3D Pixar style, featuring ${charactersDescription}. The scene is: ${thumbnailPrompt}. The composition is clean, high contrast, perfect for YouTube Kids. Please DO NOT write any text, letters, or logos on the image itself, keep the composition clean for overlays.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "16:9" // Capas do YouTube são obrigatoriamente 16:9
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Thumbnail generation failed");
  } catch (error) {
    console.error("Gemini Thumbnail Gen failed:", error);
    const seed = Math.floor(Math.random() * 99999);
    // Flux do Pollinations é fantástico para gerar miniaturas coloridas!
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&seed=${seed}&nologo=true&model=flux`;
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
    youtubePromo: {
      type: Type.OBJECT,
      properties: {
        titles: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        description: { type: Type.STRING },
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        thumbnailPrompt: { type: Type.STRING },
        thumbnailIdea: { type: Type.STRING }
      },
      required: ["titles", "description", "tags", "thumbnailPrompt", "thumbnailIdea"]
    }
  },
  required: ["title", "chapters"],
};

export const generateStory = async (
  theme: string, 
  characters: Avatar[], 
  language: string = 'pt-BR', 
  style: 'kids' | 'dynamic' | 'musical' = 'kids'
): Promise<{ title: string, chapters: StoryChapter[], youtubePromo?: any }> => {
  const charContext = characters.map(c => `${c.name} (${c.description})`).join("; ");
  const languageName = getLanguageName(language);

  let styleInstructions = "";
  if (style === 'dynamic') {
    styleInstructions = `
    ESTRUTURA DE HISTÓRIA DINÂMICA (Inspirado em Reels de Alto Impacto / Vídeos Curtos de Alta Retenção):
    Objetivo: Criar uma história curta e envolvente, com ritmo acelerado e foco em ação visual e sonora, ideal para formatos de vídeo curtos (ex: Reels, TikTok).
    Siga rigidamente estes elementos essenciais distribuídos em 4 capítulos de ritmo veloz:
    
    - Capítulo 1 (CENÁRIO INICIAL & O GANCHO):
      * Descreva uma situação inicial chocante, curiosa ou engraçada que chame a atenção imediatamente nos primeiros 3 segundos. Ex: "Um quarto perfeitamente arrumado, mas com um objeto estranho fora do lugar..."
      * Apresente o Personagem Principal proativo com características marcantes e expressivas (Ex: um pequeno monstro curioso de olhos gigantes e energia inesgotável).
      
    - Capítulo 2 (AÇÃO EM ESCALADA - A "BAGUNÇA"):
      * Uma sequência de ações rápidas, cômicas e visuais que progridem em intensidade. Pense em "cortes rápidos" entre as cenas.
      * Use verbos de ação e descrições ricas em movimento (Ex: o personagem salta, joga o objeto pra cima, que ricocheteia, derruba livros, etc.).
      
    - Capítulo 3 (O CLÍMAX / PONTO ALTO):
      * O ponto de maior intensidade e pico da ação cômica, onde a "bagunça" atinge seu auge.
      * Inclua elementos visuais chave (cores vibrantes, movimentos engraçados, expressões faciais exageradas) e sugira efeitos sonoros marcantes (como "boing", "crash", "whoosh", "plim").
      
    - Capítulo 4 (RESOLUÇÃO RÁPIDA & CALL TO ACTION - CTA):
      * Apresente um desfecho curto, engraçado e impactante (Ex: o monstro exausto caindo em almofadas).
      * Termine a última linha com um gancho de interação de alto engajamento (Ex: "Qual foi a sua maior bagunça? Compartilhe!" ou "A vida é mais divertida com um pouco de caos!").
    `;
  } else if (style === 'musical') {
    styleInstructions = `
    ESTRUTURA DE FÁBRICA DE MUSICAIS (Estilo clássico da Broadway e filmes antigos):
    A história deve ser contada como um musical alegre e vibrante de 4 capítulos. Os personagens conversam em prosa curta e depois rompem em cantoria alegre com rimas cativantes e ritmo acentuado!
    Adicione notas musicais e marcadores como "🎵 (Cantando):" no início das estrofes cantadas.
    
    - Capítulo 1 (DIÁLOGO & INTRODUÇÃO MUSICAL):
      * Os personagens começam conversando em prosa sobre o tema "${theme}".
      * Em seguida, rompem em um número musical animado, rítmico e rimado que introduz a aventura com alegria!
      
    - Capítulo 2 (MISTÉRIO & CONFLITO EM VERSOS):
      * O conflito da história começa a aparecer. Os personagens tentam resolvê-lo enquanto cantam solos ou duetos engraçados.
      * Termine com um cliffhanger de suspense musical instigante.
      
    - Capítulo 3 (GRANDE CLÍMAX DE CANÇÃO E DANÇA):
      * O ponto alto da história onde a canção mais forte e as rimas mais divertidas são cantadas em coro.
      * Descreva a dança, coreografia e alegria visual dos personagens na "visualDescription".
      
    - Capítulo 4 (GRANDE FINALE & REFRÃO DE CTA):
      * Os personagens terminam a canção com uma lição feliz e brilhante.
      * A última linha deve ser um refrão interativo cantado que convida o espectador a cantar ou responder (Ex: "🎵 Cante conosco e diga lá no final: qual é a sua brincadeira musical? 🎵").
    `;
  } else {
    styleInstructions = `
    ESTRUTURA DE RETENÇÃO DO ROTEIRO PADRÃO KIDS (4 capítulos obrigatórios):
    - Capítulo 1 (O GANCHO INICIAL): Comece o texto imediatamente com uma pergunta super intrigante ou uma cena chocante e curiosa que prenda o olhar e o ouvido nos primeiros 5 segundos (evite "Era uma vez" genérico, use curiosidade imediata!).
    - Capítulo 2 (O MISTÉRIO CRESCENTE): Desenvolva o conflito com ritmo veloz. Termine esse capítulo com um gancho/cliffhanger que deixa a criança louca para ouvir o que acontece a seguir.
    - Capítulo 3 (O CLÍMAX DIVERTIDO): A reviravolta mais expressiva, engraçada ou emocionante da história, onde a lição ou humor se chocam.
    - Capítulo 4 (A RESOLUÇÃO E CTA): Feche a história de forma gratificante e termine a ÚLTIMA LINHA com um gancho de ação (CTA) super interativo e estimulante para as crianças responderem ou comentarem (ex: "E você, o que faria se...? Conta pra mim nos comentários!").
    `;
  }

  const prompt = `
    Crie uma história infantil curta de EXTREMA RETENÇÃO e ENGAJAMENTO (Padrão de Roteiro Psicológico viral do YouTube Kids), alegre, carismática e engraçada.
    Tema ou Lição de Vida: "${theme}".
    Personagens principais: ${charContext}.
    Estilo Selecionado: "${style}".
    
    ${styleInstructions}

    Diretrizes de Tom e Conteúdo:
    - O tom deve ser alegre, caloroso e cativante, excelente para ler em voz alta com entusiasmo.
    - Se o tema for uma lição pedagógica/social, ensine-a de forma lúdica, engraçada e segura, SEM traumatizar ou assustar. Mostre os personagens agindo com criatividade e esperteza.
    - Cada capítulo deve ser curto (3-5 frases), mantendo o ritmo de vídeo dinâmico.

    PROMOÇÃO DO YOUTUBE (youtubePromo) - EXCLUSIVO DO ADMINISTRADOR:
    Gere também metadados de divulgação profissionais com foco em SEO e Altíssimo CTR (Taxa de Cliques):
    - titles: 3 opções de títulos altamente instigantes e clicáveis (ex: usando termos chamativos em letras maiúsculas, contradições lúdicas, ou suspense engraçado). Exemplo: "CELULAR: VILÃO OU MOCINHO?".
    - description: Uma descrição do vídeo altamente persuasiva contendo uma sinopse cativante, timestamps fictícios estruturando o vídeo e hashtags estratégicas.
    - tags: 8 a 12 palavras-chave super relevantes para o algoritmo infantil e familiar do YouTube.
    - thumbnailPrompt: Um prompt em inglês ultra detalhado para IA geradora de imagens criar uma capa/thumbnail espetacular (estilo 3D Pixar, expressões de choque ou alegria exageradas, cores brilhantes e fundo contrastante).
    - thumbnailIdea: Instruções em português de layout e texto chamativo de impacto para adicionar à capa usando o Canva.

    IDIOMA OBRIGATÓRIO DA HISTÓRIA E METADADOS: ${languageName} (exceto o thumbnailPrompt que deve ser em inglês).
    VisualDescription: Em Inglês (prompt para ilustração do capítulo, ultra detalhado, estilo livro de ilustração infantil 3D Pixar, colorido e vibrante).
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

    return { 
      title: json.title, 
      chapters: json.chapters,
      youtubePromo: json.youtubePromo 
    };

  } catch (error) {
    handleGenAIError(error);
    throw error;
  }
};

export const generatePedagogicalStory = async (situation: string, goal: string, teacher: Avatar, students: Avatar[], language: string = 'pt-BR'): Promise<{ title: string, chapters: StoryChapter[], educationalGoal: string, youtubePromo?: any }> => {
  const names = students.map(s => s.name).join(", ");
  const languageName = getLanguageName(language);

  const prompt = `
    Crie uma fábula educativa escolar com 4 capítulos, aplicando o ROTEIRO PSICOLÓGICO DE ALTA RETENÇÃO DO YOUTUBE KIDS (Gancho inicial forte, cliffhangers, clímax cômico e Call-to-action interativa de engajamento no final).
    Situação: "${situation}".
    Objetivo Pedagógico (BNCC ou similar): "${goal}".
    Professor: ${teacher.name}. Alunos: ${names}.
    
    ESTRUTURA DE RETENÇÃO DO ROTEIRO:
    - Capítulo 1 (GANCHO): Comece o texto imediatamente com uma pergunta super intrigante ou uma cena chocante e curiosa sobre o desafio escolar.
    - Capítulo 2 (MISTÉRIO CRESCENTE): Desenvolva o conflito com ritmo veloz, terminando com um mistério que deixa o ouvinte sedento pela continuação.
    - Capítulo 3 (CLÍMAX DIVERTIDO): A resolução ou experimento lúdico com as melhores piadas ou lições expressivas do professor e alunos.
    - Capítulo 4 (CTA FINAL): A consagração da lição pedagógica terminando com uma pergunta reflexiva para estimular comentários e engajamento.

    PROMOÇÃO DO YOUTUBE (youtubePromo) - EXCLUSIVO DO ADMINISTRADOR:
    Gere metadados de divulgação profissionais focados em SEO e altíssimo clique (CTR):
    - titles: 3 opções de títulos altamente instigantes (ex: usando termos chamativos em letras maiúsculas, contradições lúdicas, ou suspense).
    - description: Uma descrição do vídeo persuasiva contendo uma sinopse cativante, timestamps fictícios e hashtags.
    - tags: 8 a 12 palavras-chave super relevantes para o algoritmo infantil e familiar do YouTube.
    - thumbnailPrompt: Um prompt em inglês ultra detalhado para IA geradora de imagens criar uma capa espetacular (estilo 3D Pixar, expressões faciais super marcantes, cores vibrantes).
    - thumbnailIdea: Instruções de texto e layout de impacto para a capa (Canva).

    IDIOMA OBRIGATÓRIO DA HISTÓRIA E METADADOS: ${languageName} (exceto o thumbnailPrompt que deve ser em inglês).
    VisualDescription: Em Inglês (prompt para ilustração do capítulo, ultra detalhado, estilo livro de ilustração infantil 3D Pixar, colorido e vibrante).
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
        educationalGoal: json.educationalGoal || goal,
        youtubePromo: json.youtubePromo
    };

  } catch (error) {
    handleGenAIError(error);
    throw error;
  }
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      // Wrapped content parameters in an array of objects to comply with SDK requirements.
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { 
            prebuiltVoiceConfig: { voiceName } 
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

export const generateYoutubePromo = async (title: string, chaptersText: string, language: string = 'pt-BR'): Promise<any> => {
  const languageName = getLanguageName(language);
  const prompt = `
    Gere metadados de divulgação profissionais focados em SEO e altíssimo clique (CTR) no YouTube Kids para a seguinte história infantil:
    Título: "${title}"
    Conteúdo Completo: "${chaptersText}"

    Gere o objeto JSON com os seguintes campos exatos:
    - titles: 3 opções de títulos altamente instigantes (ex: usando termos chamativos em letras maiúsculas, contradições lúdicas, ou suspense engraçado). Exemplo: "CELULAR: VILÃO OU MOCINHO?".
    - description: Uma descrição do vídeo persuasiva contendo uma sinopse cativante, timestamps fictícios estruturando os capítulos e hashtags estratégicas.
    - tags: 8 a 12 palavras-chave super relevantes para o algoritmo infantil do YouTube.
    - thumbnailPrompt: Um prompt em inglês ultra detalhado para IA geradora de imagens criar uma capa espetacular (estilo 3D Pixar, expressões faciais super marcantes, cores vibrantes).
    - thumbnailIdea: Instruções em português de texto grande e layout de impacto para a capa no Canva.

    IDIOMA OBRIGATÓRIO DOS METADADOS: ${languageName} (exceto o thumbnailPrompt que deve ser em inglês).
  `;

  const promoSchema = {
    type: Type.OBJECT,
    properties: {
      titles: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      description: { type: Type.STRING },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      thumbnailPrompt: { type: Type.STRING },
      thumbnailIdea: { type: Type.STRING }
    },
    required: ["titles", "description", "tags", "thumbnailPrompt", "thumbnailIdea"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: promoSchema,
      }
    });

    return cleanAndParseJSON(response.text);
  } catch (error) {
    handleGenAIError(error);
    throw error;
  }
};
