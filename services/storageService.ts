
/**
 * Em um ambiente Cloud (Firebase/Supabase), este serviço faria o upload e retornaria uma URL curta.
 * 
 * No nosso ambiente "Banco Profissional Interno" (IndexedDB), nós não precisamos fazer upload.
 * O IndexedDB suporta armazenar strings Base64 gigantes (até centenas de MBs) sem travar.
 * 
 * Portanto, este serviço apenas "prepara" o arquivo para ser salvo junto com a história no banco.
 */
export const uploadAsset = async (base64Data: string, folder: 'audio' | 'images', fileName: string): Promise<string> => {
    // Simula um delay de rede para parecer profissional
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Retorna o próprio Base64. 
    // Como estamos usando IndexedDB agora (e não LocalStorage), salvar essa string gigante no banco é seguro e performático.
    return base64Data;
};
