
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { analyzeFaceForAvatar, generateCaricatureImage } from '../services/geminiService';
import { Avatar } from '../types';

const AvatarCreator: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'upload' | 'processing' | 'result'>('upload');
  const [preview, setPreview] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<Avatar | null>(null);
  const [name, setName] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  
  // Validation State
  const [errors, setErrors] = useState<{name?: string, image?: string}>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setErrors(prev => ({ ...prev, image: undefined })); // Clear error
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    // Validação (A1)
    const newErrors: any = {};
    if (!name.trim()) newErrors.name = "O personagem precisa de um nome!";
    if (!preview) newErrors.image = "Precisamos de uma foto para começar!";
    
    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
    }

    setStep('processing');

    try {
      // 1. Analisar rosto
      setStatusMsg("🧐 O robô está olhando sua foto...");
      const base64Data = preview!.split(',')[1];
      const description = await analyzeFaceForAvatar(base64Data);
      
      // 2. Gerar URL da imagem (Instantâneo com Pollinations)
      setStatusMsg("🎨 Pintando sua caricatura 3D...");
      // Pequeno delay artificial para dar sensação de processamento e permitir leitura da mensagem
      await new Promise(r => setTimeout(r, 1500));
      
      const cartoonUrl = await generateCaricatureImage(description);

      // 3. Salvar
      const newAvatar: Avatar = {
        id: Date.now().toString(),
        name,
        imageUrl: cartoonUrl,
        description
      };
      
      const existing = JSON.parse(localStorage.getItem('avatars') || '[]');
      localStorage.setItem('avatars', JSON.stringify([...existing, newAvatar]));

      setGeneratedAvatar(newAvatar);
      setStep('result');
    } catch (error: any) {
      console.error(error);
      alert("Ocorreu um erro. Tente novamente com outra foto.");
      setStep('upload');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="relative mb-8 text-center">
         <h1 className="font-heading text-5xl text-white text-stroke-black drop-shadow-md transform -rotate-2">
           Fábrica de Avatares
         </h1>
      </div>

      {step === 'upload' && (
        <Card color="white" className="space-y-8" rotate>
          <div className="space-y-3">
            <label className="font-heading font-bold text-xl block">1. Qual o nome do personagem? <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => {
                  setName(e.target.value);
                  setErrors(prev => ({...prev, name: undefined}));
              }}
              placeholder="Ex: Capitão Feijão"
              className={`w-full p-4 rounded-2xl border-4 ${errors.name ? 'border-red-500 bg-red-50' : 'border-black bg-cartoon-cream'} focus:border-cartoon-pink outline-none font-heading text-2xl shadow-inner transition-colors`}
            />
            {errors.name && <p className="text-red-500 font-bold text-sm animate-pulse">⚠️ {errors.name}</p>}
          </div>

          <div className="space-y-3">
             <label className="font-heading font-bold text-xl block">2. Escolha a foto: <span className="text-red-500">*</span></label>
             <div className={`border-4 border-dashed ${errors.image ? 'border-red-500 bg-red-50' : 'border-black bg-blue-50'} rounded-3xl p-8 text-center space-y-4 transition-colors`}>
              {preview ? (
                <div className="relative w-56 h-56 mx-auto rounded-full overflow-hidden border-4 border-black shadow-cartoon bg-white transform rotate-3">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setPreview(null)}
                    className="absolute bottom-0 w-full bg-cartoon-orange text-black font-bold py-2 border-t-2 border-black hover:bg-orange-400"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="py-8 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="text-7xl mb-4 animate-bounce-slow">📸</div>
                  <p className="font-sans font-bold text-lg">Clique aqui para enviar foto</p>
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden"
                onChange={handleFileChange} 
              />
            </div>
            {errors.image && <p className="text-red-500 font-bold text-center text-sm animate-pulse">⚠️ {errors.image}</p>}
          </div>

          <div className="flex justify-center pt-4">
            <Button 
              onClick={processImage} 
              variant="primary" 
              size="lg"
              className="w-full md:w-auto text-2xl"
              pulse={!!preview && !!name}
            >
              ✨ CRIAR AVATAR ✨
            </Button>
          </div>
        </Card>
      )}

      {/* Loading State (C3) */}
      {step === 'processing' && (
        <Card color="yellow" className="text-center py-16">
          <div className="animate-spin text-8xl mb-6 inline-block">🖌️</div>
          <h2 className="font-heading text-3xl mb-4">{statusMsg}</h2>
          <p className="text-lg font-bold text-gray-700 mb-6">Não feche essa tela...</p>
          <div className="w-full bg-white border-4 border-black rounded-full h-6 overflow-hidden relative">
            <div className="bg-cartoon-pink h-full w-1/2 animate-wiggle absolute top-0 left-0 bottom-0"></div>
            <div className="bg-cartoon-blue h-full w-1/2 animate-wiggle absolute top-0 right-0 bottom-0" style={{animationDirection: 'reverse'}}></div>
          </div>
        </Card>
      )}

      {step === 'result' && generatedAvatar && (
        <div className="text-center space-y-8">
          <div className="relative inline-block">
             <div className="absolute inset-0 bg-cartoon-yellow scale-150 animate-spin-slow" style={{clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'}}></div>
             
             <Card color="white" className="rotate-3 transform transition-transform hover:rotate-0 max-w-md mx-auto">
               <img 
                  src={generatedAvatar.imageUrl} 
                  alt="Avatar gerado" 
                  className="w-full rounded-2xl border-4 border-black mb-4 shadow-sm bg-gray-100" 
                />
                <h2 className="font-heading text-4xl text-cartoon-purple drop-shadow-sm">
                  {generatedAvatar.name}
                </h2>
             </Card>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6 mt-12">
            <Button onClick={() => setStep('upload')} variant="secondary">
              🔄 Novo Personagem
            </Button>
            <Button onClick={() => navigate('/create-story')} variant="success" size="lg">
              Ir para Histórias 🚀
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarCreator;