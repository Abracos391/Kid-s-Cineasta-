
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { analyzeFaceForAvatar, generateCaricatureImage } from '../services/geminiService';
import { uploadAsset } from '../services/storageService';
import { dbService } from '../services/dbService';
import { Avatar } from '../types';
import { useAuth } from '../context/AuthContext';

const AvatarCreator: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const { user } = useAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [step, setStep] = useState<'upload' | 'camera' | 'processing' | 'result'>('upload');
  const [preview, setPreview] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<Avatar | null>(null);
  const [name, setName] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [errors, setErrors] = useState<{name?: string, image?: string}>({});

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  };

  const startCamera = async (mode: 'user' | 'environment' = 'user') => {
    setErrors(prev => ({ ...prev, image: undefined }));
    setStep('camera');
    setIsCameraReady(false);
    setFacingMode(mode);
    stopCameraStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      alert("Não conseguimos acessar sua câmera.");
      setStep('upload');
    }
  };

  const switchCamera = () => {
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      startCamera(newMode);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && isCameraReady) {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width === 0 || height === 0) return;
      
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (context) {
        if (facingMode === 'user') {
            context.translate(width, 0);
            context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPreview(dataUrl);
        stopCameraStream();
        setStep('upload');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setErrors(prev => ({ ...prev, image: undefined }));
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    const newErrors: any = {};
    if (!name.trim()) newErrors.name = "O personagem precisa de um nome!";
    if (!preview) newErrors.image = "Precisamos de uma foto para começar!";
    
    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
    }

    if (!user) {
        alert("Erro crítico: Usuário não identificado. Faça login novamente.");
        navigate('/auth');
        return;
    }

    setStep('processing');

    try {
      setStatusMsg("🧐 O robô está olhando sua foto...");
      const base64Data = preview!.split(',')[1];
      const description = await analyzeFaceForAvatar(base64Data);
      
      setStatusMsg("🎨 Pintando sua caricatura 3D...");
      const cartoonUrl = await generateCaricatureImage(description);

      setStatusMsg("☁️ Salvando no banco de dados...");
      
      const newAvatar: Avatar = {
        id: crypto.randomUUID(),
        name: name.trim(),
        imageUrl: cartoonUrl,
        description
      };
      
      // SALVAR NO DB INTERNO
      console.log("Tentando salvar avatar para usuário:", user.id);
      await dbService.saveAvatar(user.id, newAvatar);
      console.log("Avatar salvo com sucesso!");

      setGeneratedAvatar(newAvatar);
      setStep('result');
    } catch (error: any) {
      console.error("Erro no processamento:", error);
      alert(`Ocorreu um erro ao criar o avatar: ${error.message}`);
      setStep('upload');
    }
  };

  const finishCreation = () => {
    if (returnTo) {
        navigate(returnTo);
    } else {
        navigate('/create-story');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
       <div className="relative mb-8 text-center">
         <h1 className="font-heading text-5xl text-white text-stroke-black drop-shadow-md transform -rotate-2">
           Fábrica de Avatares
         </h1>
         {returnTo && <span className="bg-cartoon-yellow text-black font-bold px-2 py-1 rounded-lg text-sm">Modo Criação Rápida</span>}
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
             <label className="font-heading font-bold text-xl block">2. Hora da Foto! <span className="text-red-500">*</span></label>
             
             <div className={`border-4 border-dashed ${errors.image ? 'border-red-500 bg-red-50' : 'border-black bg-blue-50'} rounded-3xl p-8 text-center space-y-4 transition-colors relative`}>
              {preview ? (
                <div className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-4 border-black shadow-cartoon bg-white transform rotate-3">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setPreview(null)}
                    className="absolute bottom-0 w-full bg-cartoon-orange text-black font-bold py-2 border-t-2 border-black hover:bg-orange-400 z-10"
                  >
                    Trocar Foto
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                        onClick={() => startCamera('user')}
                        className="cursor-pointer bg-white border-4 border-black rounded-2xl p-6 hover:bg-cartoon-yellow transition-colors hover:scale-105 transform group"
                    >
                        <div className="text-6xl mb-2 group-hover:animate-bounce">📸</div>
                        <p className="font-comic font-bold text-xl">Usar Câmera</p>
                    </div>

                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer bg-white border-4 border-black rounded-2xl p-6 hover:bg-cartoon-blue hover:text-white transition-colors hover:scale-105 transform group"
                    >
                         <div className="text-6xl mb-2 group-hover:animate-pulse">📂</div>
                        <p className="font-comic font-bold text-xl">Galeria</p>
                    </div>
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

      {step === 'camera' && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4">
              <div className="relative w-full max-w-lg bg-black rounded-3xl overflow-hidden border-8 border-cartoon-yellow shadow-2xl">
                  <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`w-full h-auto object-cover transition-transform duration-300 ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`} 
                      onCanPlay={() => setIsCameraReady(true)}
                  ></video>
                  
                  <div className="absolute bottom-0 left-0 w-full p-6 flex justify-between items-center bg-gradient-to-t from-black/80 to-transparent">
                       <button 
                         onClick={() => { stopCameraStream(); setStep('upload'); }}
                         className="bg-white/20 text-white rounded-full p-3 hover:bg-white/40 transition-colors w-12 h-12 flex items-center justify-center"
                       >
                           ✕
                       </button>

                       <button 
                         onClick={takePhoto}
                         disabled={!isCameraReady}
                         className={`w-20 h-20 rounded-full border-8 border-gray-300 shadow-lg flex items-center justify-center group transition-all transform active:scale-95
                            ${isCameraReady 
                                ? 'bg-white cursor-pointer hover:border-white' 
                                : 'bg-gray-400 cursor-not-allowed opacity-50'}`
                         }
                       >
                           <div className={`w-16 h-16 rounded-full border-4 border-white transition-colors ${isCameraReady ? 'bg-cartoon-red group-hover:bg-red-600' : 'bg-gray-500'}`}></div>
                       </button>

                       <button 
                         onClick={switchCamera}
                         disabled={!isCameraReady}
                         className="bg-white/20 text-white rounded-full p-3 hover:bg-cartoon-blue/80 hover:text-white transition-colors w-12 h-12 flex items-center justify-center disabled:opacity-30"
                       >
                           🔄
                       </button>
                  </div>
              </div>
          </div>
      )}

      {step === 'processing' && (
        <Card color="yellow" className="text-center py-16">
          <div className="animate-spin text-8xl mb-6 inline-block">🖌️</div>
          <h2 className="font-heading text-3xl mb-4">{statusMsg}</h2>
          <p className="text-lg font-bold text-gray-700 mb-6">Não feche essa tela...</p>
        </Card>
      )}

      {step === 'result' && generatedAvatar && (
        <div className="text-center space-y-8">
          <div className="relative inline-block">
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
          
          <div className="bg-green-100 border-2 border-green-500 text-green-800 p-4 rounded-xl font-bold">
              ✅ Avatar salvo com sucesso!
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6 mt-6">
            <Button onClick={() => { setGeneratedAvatar(null); setName(''); setPreview(null); setStep('upload'); }} variant="secondary">
              🔄 Novo Personagem
            </Button>
            <Button onClick={finishCreation} variant="success" size="lg">
              {returnTo ? 'Voltar para Sala de Aula 🏫' : 'Ir para Histórias 🚀'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarCreator;
