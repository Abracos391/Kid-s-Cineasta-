
import { supabase } from './supabaseClient';

/**
 * Converte Base64 para Blob
 */
const base64ToBlob = (base64: string, mimeType: string) => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

/**
 * Faz upload de um ativo (Imagem ou Áudio) para o Supabase Storage
 * Retorna a URL pública
 */
export const uploadAsset = async (base64Data: string, folder: 'audio' | 'images', fileName: string): Promise<string> => {
  try {
    // 1. Identificar Mime Type e limpar header do base64 se existir
    let mimeType = folder === 'audio' ? 'audio/wav' : 'image/jpeg';
    let cleanBase64 = base64Data;

    if (base64Data.includes('data:')) {
        const parts = base64Data.split(',');
        mimeType = parts[0].split(':')[1].split(';')[0];
        cleanBase64 = parts[1];
    }

    // 2. Converter
    const blob = base64ToBlob(cleanBase64, mimeType);
    const filePath = `${folder}/${fileName}`;

    // 3. Upload
    const { error: uploadError } = await supabase.storage
      .from('cineasta-files')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 4. Get URL
    const { data } = supabase.storage
      .from('cineasta-files')
      .getPublicUrl(filePath);

    return data.publicUrl;

  } catch (error) {
    console.error(`Erro no upload para ${folder}:`, error);
    // Fallback: se o upload falhar, retorna o base64 original para não quebrar o app na hora (embora lote a memória)
    return base64Data.includes('data:') ? base64Data : `data:${folder === 'audio' ? 'audio/wav' : 'image/jpeg'};base64,${base64Data}`;
  }
};
