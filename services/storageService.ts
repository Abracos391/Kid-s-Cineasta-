
/**
 * Serviço de Arquivos Otimizado para IndexedDB.
 * 
 * Como o banco de dados interno suporta salvar arquivos gigantes sem custo e sem chave de API,
 * nós apenas passamos o arquivo adiante. O dbService vai salvar tudo junto com a história.
 */
export const uploadAsset = async (base64Data: string, folder: 'audio' | 'images', fileName: string): Promise<string> => {
    // Retorna o próprio dado. O banco interno (idbService) vai engolir isso sem problemas.
    return base64Data;
};
