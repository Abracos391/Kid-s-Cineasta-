
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from "jspdf";
import { Story } from '../types';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { generateSpeech, generateChapterIllustration, generateYoutubePromo, generateYoutubeThumbnailImage } from '../services/geminiService';
import { videoService } from '../services/videoService';
import AudioPlayer from '../components/AudioPlayer';
import { dbService } from '../services/dbService';
import { CinemaPlayer } from '../components/CinemaPlayer';

const StoryReader: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [story, setStory] = useState<Story | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [processingDownload, setProcessingDownload] = useState(false);
  const [isCinemaOpen, setIsCinemaOpen] = useState(false);
  const [cinemaInitialMode, setCinemaInitialMode] = useState<'selection' | 'playback' | 'record'>('selection');

  // VIDEO STATE
  const [videoStatus, setVideoStatus] = useState<'idle' | 'queued' | 'rendering' | 'done' | 'failed'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const pollingRef = useRef<number | null>(null);

  // ADMIN YOUTUBE STATES
  const [generatingPromo, setGeneratingPromo] = useState(false);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [generatedThumbnailUrl, setGeneratedThumbnailUrl] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // CUSTOM THUMBNAIL OVERLAY STATES
  const [thumbnailTitle, setThumbnailTitle] = useState('');
  const [thumbnailCta, setThumbnailCta] = useState('ENSINAR BRINCANDO, DIGA SIM!');
  const [showLogo, setShowLogo] = useState(true);

  // VOICE CONFIGURATION
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const VOICE_OPTIONS = [
    { value: 'Kore', label: '👧 Kore (Feminina Suave)' },
    { value: 'Aoede', label: '👩 Aoede (Feminina Clara)' },
    { value: 'Puck', label: '👦 Puck (Masculina Jovem)' },
    { value: 'Charon', label: '👨 Charon (Masculina Suave)' },
    { value: 'Fenrir', label: '🦁 Fenrir (Masculina Forte)' }
  ];

  const isAdmin = user && (
    user.whatsapp === 'olivalexcelso@gmail.com' || 
    user.whatsapp === 'admin' ||
    user.whatsapp?.includes('olivalexcelso') ||
    user.whatsapp === 'cineastakids.acao@gmail.com' ||
    user.name?.toLowerCase().includes('admin') ||
    user.plan === 'enterprise'
  );

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGenerateOnDemandPromo = async () => {
    if (!story) return;
    setGeneratingPromo(true);
    try {
      const chaptersText = story.chapters.map(c => `${c.title}: ${c.text}`).join("\n\n");
      const promo = await generateYoutubePromo(story.title, chaptersText);
      const updatedStory = { ...story, youtubePromo: promo };
      setStory(updatedStory);
      if (promo && promo.titles && promo.titles[0]) {
        setThumbnailTitle(promo.titles[0]);
      }
      await updateStoryInDB(updatedStory);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar metadados do YouTube.");
    } finally {
      setGeneratingPromo(false);
    }
  };

  const handleGenerateThumbnailImage = async () => {
    if (!story || !story.youtubePromo) return;
    setGeneratingThumbnail(true);
    try {
      const imageUrl = await generateYoutubeThumbnailImage(
        story.youtubePromo.thumbnailPrompt, 
        story.characters ? story.characters.map(c => `${c.name} (${c.description})`).join(', ') : ''
      );
      setGeneratedThumbnailUrl(imageUrl);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar imagem de capa.");
    } finally {
      setGeneratingThumbnail(false);
    }
  };

  const splitTextIntoTwoLines = (text: string): [string, string] => {
    const words = (text || '').toUpperCase().trim().split(/\s+/);
    if (words.length <= 1) return [words.join(' '), ''];
    
    // Encontra o ponto de divisão mais equilibrado
    let bestSplitIndex = 1;
    let minDiff = Infinity;
    const totalChars = text.length;
    
    let currentChars = 0;
    for (let i = 0; i < words.length - 1; i++) {
      currentChars += words[i].length + 1;
      const diff = Math.abs((totalChars / 2) - currentChars);
      if (diff < minDiff) {
        minDiff = diff;
        bestSplitIndex = i + 1;
      }
    }
    
    const line1 = words.slice(0, bestSplitIndex).join(' ');
    const line2 = words.slice(bestSplitIndex).join(' ');
    return [line1, line2];
  };

  const handleDownloadThumbnailWithOverlays = () => {
    if (!generatedThumbnailUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = generatedThumbnailUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Desenha a imagem de fundo (16:9)
      ctx.drawImage(img, 0, 0, 1280, 720);

      // 2. Vinheta escura sutil nas bordas superior/inferior para contraste do texto
      const gradient = ctx.createLinearGradient(0, 0, 0, 720);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
      gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1280, 720);

      // 3. Marca d'água / Logotipo "Cineasta Kids" no canto superior direito
      if (showLogo) {
        ctx.save();
        ctx.translate(1120, 80);
        ctx.rotate(4 * Math.PI / 180);

        // Balão branco do logotipo
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 8;
        
        ctx.beginPath();
        ctx.roundRect(-150, -45, 300, 90, 25);
        ctx.fill();
        ctx.stroke();

        // Texto "Cineasta"
        ctx.font = '900 30px "Arial Black", "Impact", sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText('Cineasta', 0, -8);

        // Texto "KIDS" com contorno e cor rosa vibrante
        ctx.font = '900 36px "Arial Black", "Impact", sans-serif';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 6;
        ctx.lineJoin = 'round';
        ctx.strokeText('KIDS', 0, 26);
        ctx.fillStyle = '#FF1493'; // Rosa Cartoon
        ctx.fillText('KIDS', 0, 26);

        ctx.restore();
      }

      // 4. Desenha o Título Principal em duas linhas com fundos inclinados e contornos
      const [line1, line2] = splitTextIntoTwoLines(thumbnailTitle);

      const drawTextLineWithBanner = (text: string, y: number, bgColor: string, textColor: string, angle: number) => {
        if (!text) return;
        ctx.save();
        
        ctx.translate(640, y);
        ctx.rotate(angle * Math.PI / 180);

        ctx.font = '900 68px "Impact", "Arial Black", "Trebuchet MS", sans-serif';
        const textWidth = ctx.measureText(text).width;
        const bannerWidth = textWidth + 80;
        const bannerHeight = 100;

        // Sombra projetada do banner
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(-bannerWidth / 2 + 12, -bannerHeight / 2 + 12, bannerWidth, bannerHeight, 15);
        ctx.fill();

        // Caixa do banner
        ctx.fillStyle = bgColor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 10;
        
        ctx.beginPath();
        ctx.roundRect(-bannerWidth / 2, -bannerHeight / 2, bannerWidth, bannerHeight, 15);
        ctx.fill();
        ctx.stroke();

        // Configuração do texto centralizado
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Contorno preto espesso da fonte cartoon
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 14;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, 0, 0);

        // Preenchimento de cor principal
        ctx.fillStyle = textColor;
        ctx.fillText(text, 0, 0);

        ctx.restore();
      };

      // Linha 1: Faixa Amarela com texto preto (Inclinada levemente para a esquerda)
      drawTextLineWithBanner(line1, 160, '#FFD700', '#000000', -2);
      // Linha 2: Faixa Rosa com texto branco (Inclinada levemente para a direita)
      drawTextLineWithBanner(line2, 260, '#FF1493', '#FFFFFF', 1.5);

      // 5. Desenha o balão de chamada (CTA) na parte inferior central
      if (thumbnailCta) {
        ctx.save();
        ctx.translate(640, 590);
        ctx.rotate(-1 * Math.PI / 180);

        const ctaText = thumbnailCta.toUpperCase();
        ctx.font = '900 36px "Impact", "Arial Black", sans-serif';
        const textWidth = ctx.measureText(ctaText).width;
        const width = Math.max(450, textWidth + 80);
        const height = 90;

        // Sombra do CTA
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(-width / 2 + 10, -height / 2 + 10, width, height, 45);
        ctx.fill();

        // Fundo creme macio
        ctx.fillStyle = '#FFFDD0'; 
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 8;
        
        ctx.beginPath();
        ctx.roundRect(-width / 2, -height / 2, width, height, 45);
        ctx.fill();
        ctx.stroke();

        // Contorno do texto do CTA
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 10;
        ctx.lineJoin = 'round';
        ctx.strokeText(ctaText, 0, 0);

        // Preenchimento roxo divertido
        ctx.fillStyle = '#8B008B'; 
        ctx.fillText(ctaText, 0, 0);

        ctx.restore();
      }

      try {
        const resultUrl = canvas.toDataURL('image/jpeg', 0.9);
        const a = document.createElement('a');
        a.href = resultUrl;
        a.download = `Thumbnail_Impacto_${story.title.replace(/\s+/g, '_')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        console.error("Falha ao exportar canvas como base64 (restrição de CORS), baixando imagem pura", err);
        const a = document.createElement('a');
        a.href = generatedThumbnailUrl;
        a.download = `Capa_Youtube_Crua_${story.title.replace(/\s+/g, '_')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    };
    img.onerror = (e) => {
      console.error("Erro ao carregar imagem no Canvas merge, baixando imagem pura", e);
      const a = document.createElement('a');
      a.href = generatedThumbnailUrl;
      a.download = `Capa_Youtube_Crua_${story.title.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
  };

  const renderAdminPanel = () => {
    if (!story) return null;

    return (
      <div className="w-full max-w-2xl mt-8 bg-slate-900 text-white rounded-2xl border-4 border-red-600 p-6 shadow-2xl animate-fade-in text-left">
        <div className="flex items-center gap-3 border-b border-slate-700 pb-4 mb-4">
          <span className="text-3xl">🚀</span>
          <div>
            <h2 className="font-heading text-2xl text-red-500 font-bold">Painel de Marketing do Canal</h2>
            <p className="text-xs text-slate-400 font-mono">EXCLUSIVO: Administrador Cineasta Kids</p>
          </div>
        </div>

        {/* Info Box sobre Roteiro Psicológico */}
        <div className="bg-slate-800 border-l-4 border-yellow-500 p-3 rounded mb-6 text-sm">
          <p className="font-bold text-yellow-400 flex items-center gap-1">
            <span>🧠</span> Roteiro Psicológico Ativo
          </p>
          <p className="text-slate-300 mt-1">
            Esta história segue o fluxo de retenção acelerado (Gancho Inicial de 5s, cliffhangers nos capítulos 2 e 3, e Call-to-Action interativo no capítulo 4) para maximizar o tempo de exibição (Watch Time) e interações no YouTube Kids.
          </p>
        </div>

        {!story.youtubePromo ? (
          <div className="text-center py-6 bg-slate-800/50 rounded-xl border border-dashed border-slate-600">
            <p className="text-sm text-slate-300 mb-4 font-bold">
              Metadados de divulgação não encontrados para esta história.
            </p>
            <Button
              variant="primary"
              onClick={handleGenerateOnDemandPromo}
              loading={generatingPromo}
              disabled={generatingPromo}
              className="px-6 py-2 bg-red-600 hover:bg-red-700"
            >
              {generatingPromo ? 'Gerando Metadados...' : '⚡ Gerar Metadados do YouTube'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Títulos Sugeridos */}
            <div>
              <h3 className="font-heading text-lg text-yellow-400 mb-2 font-bold">🎯 Títulos para Alta Taxa de Cliques (CTR)</h3>
              <p className="text-xs text-slate-400 mb-2">Títulos curtos, curiosos e impactantes otimizados para cliques de crianças e pais:</p>
              <div className="space-y-2">
                {story.youtubePromo.titles.map((titleText, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-800 p-3 rounded border border-slate-700 text-sm gap-4">
                    <span className="font-bold text-slate-200">{titleText}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setThumbnailTitle(titleText);
                          setCopiedField(`use-${idx}`);
                          setTimeout(() => setCopiedField(null), 1500);
                        }}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedField === `use-${idx}` ? 'Aplicado! ✨' : 'Usar na Capa 🎨'}
                      </button>
                      <button
                        onClick={() => handleCopyToClipboard(titleText, `title-${idx}`)}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedField === `title-${idx}` ? 'Copiado! ✓' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Capa / Thumbnail */}
            <div className="border-t border-slate-800 pt-6">
              <h3 className="font-heading text-lg text-yellow-400 mb-2 font-bold">🖼️ Gerador de Capa de Alto Impacto (Thumbnail)</h3>
              
              <div className="bg-slate-800 p-4 rounded border border-slate-700 text-sm space-y-3 mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">💡 Ideia de Thumbnail sugerida pelo Gemini:</p>
                  <p className="text-slate-200 mt-1 font-bold italic">"{story.youtubePromo.thumbnailIdea}"</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">🤖 Prompt de Imagem Enviado:</p>
                  <p className="text-slate-300 mt-1 font-mono text-xs select-all bg-slate-950 p-2 rounded max-h-24 overflow-y-auto">
                    {story.youtubePromo.thumbnailPrompt}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={handleGenerateThumbnailImage}
                  loading={generatingThumbnail}
                  disabled={generatingThumbnail}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {generatingThumbnail ? 'Gerando Ilustração pelo Gemini...' : '🎨 Gerar Imagem de Fundo (16:9)'}
                </Button>

                {generatedThumbnailUrl ? (
                  <div className="bg-slate-950 p-5 rounded-2xl border-2 border-indigo-500/50 animate-fade-in space-y-5">
                    
                    {/* LIVE PREVIEW BOX (16:9 Aspect Ratio) */}
                    <div>
                      <p className="text-xs font-black text-indigo-400 uppercase tracking-wider mb-2 text-center">✨ Pré-visualização em Tempo Real (Live Preview)</p>
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border-4 border-black bg-slate-900 shadow-2xl select-none">
                        
                        {/* Background Base Image */}
                        <img 
                          src={generatedThumbnailUrl} 
                          alt="Fundo da Capa" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Shadow vignette */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />
                        
                        {/* WATERMARK / LOGO OVERLAY */}
                        {showLogo && (
                          <div 
                            className="absolute top-3 right-3 bg-white border-[3px] border-black rounded-xl px-3 py-1 flex flex-col items-center justify-center shadow-md rotate-3"
                          >
                            <span className="font-sans font-black text-black text-[10px] md:text-sm leading-none">Cineasta</span>
                            <span 
                              className="font-sans font-black text-pink-600 text-xs md:text-lg leading-none"
                              style={{ textShadow: '1px 1px 0 #000' }}
                            >
                              KIDS
                            </span>
                          </div>
                        )}

                        {/* HIGH-IMPACT ROTATED TEXT BANNERS (Centered) */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-2/3 flex flex-col items-center justify-center gap-2 md:gap-3 px-4 pointer-events-none">
                          {/* Line 1 (Yellow Banner / Black Text) */}
                          {splitTextIntoTwoLines(thumbnailTitle)[0] && (
                            <div 
                              className="bg-[#FFD700] border-[3px] border-black text-black px-3 py-1 rounded-lg font-heading font-black text-center text-xs sm:text-base md:text-xl xl:text-2xl uppercase tracking-wide shadow-md -rotate-2 transform scale-105"
                            >
                              <span>{splitTextIntoTwoLines(thumbnailTitle)[0]}</span>
                            </div>
                          )}
                          {/* Line 2 (Pink Banner / White Text with outline) */}
                          {splitTextIntoTwoLines(thumbnailTitle)[1] && (
                            <div 
                              className="bg-[#FF1493] border-[3px] border-black text-white px-3 py-1 rounded-lg font-heading font-black text-center text-xs sm:text-base md:text-xl xl:text-2xl uppercase tracking-wide shadow-md rotate-1 transform scale-105"
                            >
                              <span style={{ textShadow: '2px 2px 0 #000' }}>{splitTextIntoTwoLines(thumbnailTitle)[1]}</span>
                            </div>
                          )}
                        </div>

                        {/* CALL-TO-ACTION (CTA) PILL AT THE BOTTOM */}
                        {thumbnailCta && (
                          <div 
                            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#FFFDD0] border-[3px] border-black text-purple-900 px-4 py-1 rounded-full font-heading font-black text-center text-[10px] sm:text-xs md:text-sm uppercase tracking-wider shadow-md -rotate-1 whitespace-nowrap"
                            style={{ textShadow: '1px 1px 0 #FFF' }}
                          >
                            {thumbnailCta}
                          </div>
                        )}

                      </div>
                    </div>

                    {/* INTERACTIVE CONTROLS */}
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
                      <p className="text-xs font-black text-yellow-400 uppercase tracking-wide">✍️ Personalizar Textos da Capa</p>
                      
                      <div className="space-y-3">
                        {/* Title Input */}
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">Título da Capa (Dividido automaticamente em 2 linhas):</label>
                          <input 
                            type="text"
                            value={thumbnailTitle}
                            onChange={(e) => setThumbnailTitle(e.target.value)}
                            placeholder="Ex: APRENDA BRINCANDO HOJE!"
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-100 font-bold focus:outline-none focus:border-yellow-400"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                            💡 Dica: Você pode tocar em qualquer um dos títulos de alta conversão gerados acima para preenchê-lo aqui!
                          </p>
                        </div>

                        {/* CTA Input */}
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">Chamada de Impacto (CTA / Balão Inferior):</label>
                          <input 
                            type="text"
                            value={thumbnailCta}
                            onChange={(e) => setThumbnailCta(e.target.value)}
                            placeholder="Ex: ENSINAR BRINCANDO, DIGA SIM!"
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-100 font-bold focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        {/* Logo Toggle Checkbox */}
                        <div className="flex items-center gap-2 pt-1">
                          <input 
                            type="checkbox"
                            id="toggleLogoCheck"
                            checked={showLogo}
                            onChange={(e) => setShowLogo(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-950 border-slate-700 cursor-pointer"
                          />
                          <label htmlFor="toggleLogoCheck" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                            Exibir Logotipo Oficial "Cineasta KIDS" na Capa
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* CANVAS DOWNLOAD ACTION */}
                    <div className="text-center">
                      <Button
                        onClick={handleDownloadThumbnailWithOverlays}
                        className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-black text-base shadow-xl rounded-xl transition-all duration-200"
                      >
                        📥 Baixar Capa de Alto Impacto (1280x720 JPG)
                      </Button>
                      <p className="text-[10px] text-slate-400 mt-2">
                        O sistema vai mesclar as faixas de texto, logotipo e CTA diretamente na imagem em alta resolução!
                      </p>
                    </div>

                  </div>
                ) : (
                  <div className="bg-slate-800 p-6 rounded-xl border border-dashed border-slate-700 text-center text-slate-400">
                    <p className="text-sm">Nenhuma imagem de fundo gerada ainda para esta história.</p>
                    <p className="text-xs mt-1 text-slate-500">Gere a imagem acima para ativar o editor e visualizador de capas!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Configuração de Vídeo (Shotstack) */}
            <div className="border-t border-slate-800 pt-6">
              <h3 className="font-heading text-lg text-yellow-400 mb-2 font-bold flex items-center gap-2">
                <span>📹</span> Configuração do Vídeo Viral (Shotstack)
              </h3>
              <p className="text-xs text-slate-400 mb-4">Escolha o formato do vídeo para renderizações automáticas na nuvem ou gravação local:</p>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const updatedStory = { ...story, videoAspectRatio: '16:9' };
                      setStory(updatedStory);
                      await updateStoryInDB(updatedStory);
                    }}
                    className={`px-4 py-2 rounded-lg font-bold text-xs border-2 transition-all ${
                      (story.videoAspectRatio || '16:9') === '16:9'
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-cartoon'
                        : 'bg-transparent border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📺 Paisagem (16:9)
                  </button>
                  <button
                    onClick={async () => {
                      const updatedStory = { ...story, videoAspectRatio: '9:16' };
                      setStory(updatedStory);
                      await updateStoryInDB(updatedStory);
                    }}
                    className={`px-4 py-2 rounded-lg font-bold text-xs border-2 transition-all ${
                      story.videoAspectRatio === '9:16'
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-cartoon'
                        : 'bg-transparent border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📱 Retrato (9:16)
                  </button>
                </div>

                <div className="shrink-0">
                  {videoStatus === 'idle' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleGenerateVideo}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-doodle"
                    >
                      🚀 Renderizar MP4 na Nuvem
                    </Button>
                  )}
                  {videoStatus === 'queued' && (
                    <span className="text-xs font-mono text-yellow-400 animate-pulse">Aguardando Fila...</span>
                  )}
                  {videoStatus === 'rendering' && (
                    <span className="text-xs font-mono text-indigo-400">Processando ({videoProgress}%)</span>
                  )}
                  {videoStatus === 'done' && videoUrl && (
                    <a
                      href={videoUrl}
                      download={`Video_${story.title.replace(/\s+/g, '_')}.mp4`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2 rounded-lg inline-block border border-black shadow-doodle"
                    >
                      📥 Baixar Vídeo MP4
                    </a>
                  )}
                  {videoStatus === 'failed' && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-red-500 font-bold">Falha na renderização</span>
                      <button onClick={handleGenerateVideo} className="text-[10px] text-yellow-400 underline font-bold">Tentar novamente</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Descrição SEO */}
            <div className="border-t border-slate-800 pt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-lg text-yellow-400 font-bold">📝 Descrição Otimizada para SEO</h3>
                <button
                  onClick={() => handleCopyToClipboard(story.youtubePromo!.description, 'desc')}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-1.5 rounded transition-colors"
                >
                  {copiedField === 'desc' ? 'Copiado! ✓' : 'Copiar Descrição'}
                </button>
              </div>
              <textarea
                readOnly
                value={story.youtubePromo.description}
                className="w-full h-32 p-3 bg-slate-950 border border-slate-800 rounded font-sans text-xs text-slate-300 outline-none resize-none"
              />
            </div>

            {/* Tags algoritmo */}
            <div className="border-t border-slate-800 pt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-lg text-yellow-400 font-bold">🏷️ Tags do Vídeo (Tags)</h3>
                <button
                  onClick={() => handleCopyToClipboard(story.youtubePromo!.tags.join(', '), 'tags')}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-1.5 rounded transition-colors"
                >
                  {copiedField === 'tags' ? 'Copiado! ✓' : 'Copiar Tags'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 bg-slate-950 p-3 rounded border border-slate-800">
                {story.youtubePromo.tags.map((tag, idx) => (
                  <span key={idx} className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded font-mono">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Limpeza do intervalo ao desmontar
  useEffect(() => {
    return () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };
  }, []);

  // --- ACTIONS ---

  const saveProgress = async () => {
      if (!story || !user) return;
      try {
        await dbService.updateStory(user.id, story);
      } catch (e) {
        console.error("Erro ao salvar progresso:", e);
      }
  };

  const handleExit = async () => {
    await saveProgress();
    if (user?.isSchoolUser || story?.isEducational) {
        navigate('/school-library');
    } else {
        navigate('/library');
    }
  };

  const updateStoryInDB = async (updatedStory: Story) => {
      if (!user) return;
      try {
          await dbService.updateStory(user.id, updatedStory);
      } catch (e) {
          console.error("Erro db:", e);
      }
  };

  useEffect(() => {
    if (!id || !user) return;
    
    let attempts = 0;
    const loadStory = async () => {
        try {
            const found = await dbService.getStoryById(user.id, id);
            if (found) {
                setStory(found);
                setSelectedVoice(found.voiceName || 'Kore');
                setLoadError(false);
                if (found.youtubePromo && found.youtubePromo.titles && found.youtubePromo.titles[0]) {
                    setThumbnailTitle(found.youtubePromo.titles[0]);
                } else {
                    setThumbnailTitle(found.title);
                }
            } else {
                if (attempts < 5) {
                    attempts++;
                    setTimeout(loadStory, 800);
                } else {
                    setLoadError(true);
                }
            }
        } catch (e) {
            console.error(e);
            setLoadError(true);
        }
    };
    loadStory();
  }, [id, user]);

  // Fixed: Updated to await the asynchronous generateChapterIllustration call now using Gemini API
  useEffect(() => {
    if (story && story.chapters && story.chapters[activeChapterIndex]) {
      const chapter = story.chapters[activeChapterIndex];
      if (!chapter.generatedImage) {
        const genImage = async () => {
            try {
                const charsDesc = story.characters ? story.characters.map(c => `${c.name} (${c.description})`).join(', ') : '';
                const imageUrl = await generateChapterIllustration(chapter.visualDescription, charsDesc, story.videoAspectRatio || '16:9');
                
                const updatedChapters = [...story.chapters];
                updatedChapters[activeChapterIndex] = { ...chapter, generatedImage: imageUrl };
                
                const updatedStory = { ...story, chapters: updatedChapters };
                setStory(updatedStory);
                updateStoryInDB(updatedStory);
            } catch (e) {
                console.error("Erro ao gerar imagem (não crítico):", e);
            }
        }
        genImage();
      }
    }
  }, [activeChapterIndex, story?.id]);

  const handleGenerateAudio = async () => {
    if (!story || !story.chapters) return;
    const currentChapter = story.chapters[activeChapterIndex];
    if (currentChapter.generatedAudio) return;
    
    setGeneratingAudio(true);
    try {
      const audioBase64 = await generateSpeech(currentChapter.text, selectedVoice);
      const updatedChapters = [...story.chapters];
      updatedChapters[activeChapterIndex] = { ...currentChapter, generatedAudio: audioBase64 };
      const updatedStory = { ...story, chapters: updatedChapters };
      setStory(updatedStory);
      updateStoryInDB(updatedStory);
    } catch (error: any) {
      console.error(error);
      alert(`Erro na narração: ${error.message || 'Falha na conexão com IA'}`);
    } finally {
      setGeneratingAudio(false);
    }
  };

  // --- VIDEO GENERATION ---

  const playKidsChimes = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gainNode.gain.setValueAtTime(0.12, start);
        gainNode.gain.exponentialRampToValueAtTime(0.01, start + duration);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      // Play joyful bell chime
      playTone(523.25, ctx.currentTime, 0.25); // C5
      playTone(659.25, ctx.currentTime + 0.15, 0.25); // E5
      playTone(783.99, ctx.currentTime + 0.3, 0.25); // G5
      playTone(1046.50, ctx.currentTime + 0.45, 0.65); // C6

      // Use Speech Synthesis
      if ('speechSynthesis' in window) {
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance("Kids! O seu filme do Cineasta Kids está prontinho!");
          utterance.lang = 'pt-BR';
          utterance.rate = 1.1;
          utterance.pitch = 1.35;
          window.speechSynthesis.speak(utterance);
        }, 800);
      }
    } catch (e) {
      console.warn("Kids sound synth fell back", e);
    }
  };

  const handleGenerateVideo = async () => {
    if (!story) return;
    
    // Evita múltiplos cliques
    if (videoStatus === 'queued' || videoStatus === 'rendering') return;

    setVideoStatus('queued');
    setVideoProgress(0);
    
    try {
        const renderId = await videoService.generateStoryVideo(story);
        
        // Inicia Polling
        if (pollingRef.current) clearInterval(pollingRef.current);
        
        let attempts = 0;
        const maxAttempts = 120; // 120 * 4s = 480s (8 minutos - timeout ampliado e robusto)

        pollingRef.current = window.setInterval(async () => {
            attempts++;
            try {
                const result = await videoService.checkStatus(renderId);
                console.log(`Video Status Polling (attempt ${attempts}/${maxAttempts}):`, result);
                
                const currentProgress = result.progress || 0;
                setVideoProgress(Math.min(99, Math.round(currentProgress)));

                if (result.status === 'done' && result.url) {
                    setVideoStatus('done');
                    setVideoUrl(result.url);
                    setVideoProgress(100);
                    playKidsChimes();
                    if (pollingRef.current) {
                        clearInterval(pollingRef.current);
                        pollingRef.current = null;
                    }
                } else if (result.status === 'failed' || attempts >= maxAttempts) {
                    setVideoStatus('failed');
                    if (pollingRef.current) {
                        clearInterval(pollingRef.current);
                        pollingRef.current = null;
                    }
                } else {
                    setVideoStatus('rendering');
                }
            } catch (e) {
                console.error("Polling error", e);
                // Permite falha temporária de internet sem quebrar o polling instantaneamente
                if (attempts >= maxAttempts) {
                    setVideoStatus('failed');
                    if (pollingRef.current) {
                        clearInterval(pollingRef.current);
                        pollingRef.current = null;
                    }
                }
            }
        }, 4000); // Checa a cada 4s

    } catch (e) {
        console.error("Video start error", e);
        alert("Erro ao iniciar criação do vídeo. Verifique a chave API do Shotstack.");
        setVideoStatus('idle');
    }
  };

  // --- DOWNLOAD FUNCIONALITIES ---

  const decodeBase64ToBytes = (base64: string): Uint8Array => {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
  };

  const downloadFullAudio = async () => {
    if (!story || !story.chapters) return;

    setProcessingDownload(true);
    try {
        const audioBuffers: Uint8Array[] = [];
        let totalLength = 0;

        // 1. Gather all audio
        for (const chapter of story.chapters) {
            if (!chapter.generatedAudio) {
                alert("Alguns capítulos ainda não têm áudio. Gerando agora...");
                const newAudio = await generateSpeech(chapter.text, story.voiceName || 'Puck');
                chapter.generatedAudio = newAudio;
            }
            const bytes = decodeBase64ToBytes(chapter.generatedAudio!);
            audioBuffers.push(bytes);
            totalLength += bytes.length;
        }

        // 2. Concatenate raw PCM
        const mergedBuffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const buffer of audioBuffers) {
            mergedBuffer.set(buffer, offset);
            offset += buffer.length;
        }

        // 3. Create WAV Header
        const wavHeader = new ArrayBuffer(44);
        const view = new DataView(wavHeader);
        const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const fileSize = 36 + mergedBuffer.length;

        writeString(0, 'RIFF');
        view.setUint32(4, fileSize, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
        view.setUint16(32, numChannels * (bitsPerSample / 8), true);
        view.setUint16(34, bitsPerSample, true);
        writeString(36, 'data');
        view.setUint32(40, mergedBuffer.length, true);

        // 4. Download
        const blob = new Blob([wavHeader, mergedBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CineastaKids_${story.title.replace(/\s+/g, '_')}_AudioCompleto.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Erro ao gerar áudio completo:", e);
        alert("Erro ao criar o áudio completo.");
    } finally {
        setProcessingDownload(false);
    }
  };

  const downloadPDF = async () => {
    if (!story || !story.chapters) return;
    setProcessingDownload(true);

    try {
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // --- CAPA ---
        doc.setFillColor(255, 215, 0); 
        doc.rect(0, 0, pageWidth, pageHeight, "F");

        doc.setDrawColor(0,0,0);
        doc.setLineWidth(3);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(48);
        doc.setTextColor(0, 139, 139);
        
        const splitTitle = doc.splitTextToSize(story.title.toUpperCase(), pageWidth - 40);
        doc.text(splitTitle, pageWidth / 2, 40, { align: "center" });

        if (story.characters && story.characters[0]) {
             try {
                const imgData = await fetchImageAsBase64(story.characters[0].imageUrl);
                doc.setDrawColor(0,0,0);
                doc.setLineWidth(2);
                doc.setFillColor(255, 255, 255);
                
                const imgSize = 140;
                const imgX = (pageWidth - imgSize) / 2;
                const imgY = 80;
                
                doc.rect(imgX - 2, imgY - 2, imgSize + 4, imgSize + 4, "FD");
                doc.addImage(imgData, 'JPEG', imgX, imgY, imgSize, imgSize);
             } catch(e) {}
        }
        
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(0,0,0);
        doc.setLineWidth(1.5);
        doc.roundedRect(30, pageHeight - 50, pageWidth - 60, 20, 3, 3, "FD");
        
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        const authorName = user?.name || 'Cineasta Kids';
        doc.text(`AUTOR: ${authorName.toUpperCase()}`, pageWidth / 2, pageHeight - 38, { align: "center" });

        // --- PÁGINAS DA HISTÓRIA ---
        for (let i = 0; i < story.chapters.length; i++) {
            const chapter = story.chapters[i];
            doc.addPage();
            
            const imgHeight = pageHeight * 0.45;
            
            doc.setFillColor(0, 0, 0);
            doc.rect(0, 0, pageWidth, pageHeight, "F");

            if (chapter.generatedImage) {
                try {
                    const imgBase64 = await fetchImageAsBase64(chapter.generatedImage);
                    doc.addImage(imgBase64, "JPEG", 0, 0, pageWidth, imgHeight);
                } catch (e) {
                    doc.setFillColor(200, 200, 200);
                    doc.rect(0, 0, pageWidth, imgHeight, "F");
                }
            }

            doc.setFillColor(255, 250, 205); 
            doc.rect(0, imgHeight, pageWidth, pageHeight - imgHeight, "F");

            const textStartY = imgHeight + 25; 
            doc.setFont("helvetica", "bold");
            doc.setFontSize(30); 
            doc.setTextColor(147, 112, 219); 
            doc.text(chapter.title, pageWidth / 2, textStartY, { align: "center" });
            
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(40, textStartY + 3, pageWidth - 40, textStartY + 3);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(24);
            doc.setTextColor(50, 50, 50); 
            
            const margin = 20;
            const maxWidth = pageWidth - (margin * 2);
            const textY = textStartY + 20;
            
            const splitText = doc.splitTextToSize(chapter.text, maxWidth);
            doc.text(splitText, margin, textY, { lineHeightFactor: 1.3, align: "justify", maxWidth: maxWidth });
        }

        doc.save(`Livro_${story.title.replace(/\s+/g, '_')}.pdf`);

    } catch (e) {
        console.error("Erro ao gerar PDF:", e);
        alert("Erro ao criar o PDF. Tente novamente.");
    } finally {
        setProcessingDownload(false);
    }
  };

  const fetchImageAsBase64 = async (url: string): Promise<string> => {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
  };

  if (loadError) return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center font-heading gap-4">
          <div className="text-4xl text-cartoon-orange">Ops!</div>
          <div className="text-2xl">História não encontrada.</div>
          <Button onClick={() => navigate('/create-story')}>Voltar</Button>
      </div>
  );
  
  if (!story || !story.chapters) return <div className="min-h-[60vh] flex items-center justify-center font-heading text-3xl animate-pulse">Abrindo livro...</div>;

  const isFinished = activeChapterIndex >= story.chapters.length;
  const currentChapter = story.chapters[activeChapterIndex] || story.chapters[story.chapters.length-1];

  return (
    <div className={`max-w-5xl mx-auto px-4 pb-20 ${story.isEducational ? 'font-sans' : ''}`}>
      
      {isFinished ? (
          <div className="min-h-[80vh] flex items-center justify-center flex-col gap-6 p-4 relative z-50">
               <Card color={story.isEducational ? 'green' : 'yellow'} className="text-center p-8 md:p-12 max-w-2xl w-full border-[6px] shadow-2xl animate-fade-in">
                   <h1 className="font-heading text-4xl md:text-5xl mb-4">Fim da Aventura!</h1>
                   
                   {/* NOVO ESTÚDIO DE CINEMA CLIENT-SIDE GRÁTIS */}
                   <div id="estudio-cinema-panel" className="w-full max-w-md mx-auto mb-6 p-6 rounded-2xl bg-cartoon-cream border-4 border-black shadow-cartoon text-center">
                       <h2 className="font-heading text-3xl text-cartoon-purple mb-2">🎬 Estúdio de Cinema Kids!</h2>
                       <p className="text-sm text-gray-700 mb-6 font-bold">Transforme seu livro em um desenho animado completo com narração, música de fundo e efeitos especiais!</p>
                       
                       <div className="flex flex-col gap-4">
                           <Button 
                                id="btn-theater-playback"
                                variant="success" 
                                onClick={() => {
                                    setCinemaInitialMode('playback');
                                    setIsCinemaOpen(true);
                                }}
                                className="w-full text-xl py-4 flex items-center justify-center gap-2 shadow-cartoon"
                           >
                                📺 Assistir Filme Interativo
                           </Button>

                           <Button 
                                id="btn-theater-record"
                                variant="danger" 
                                onClick={() => {
                                    setCinemaInitialMode('record');
                                    setIsCinemaOpen(true);
                                }}
                                className="w-full text-xl py-4 flex items-center justify-center gap-2 shadow-cartoon animate-pulse"
                           >
                                🎥 Gravar e Baixar Desenho (MP4)
                           </Button>
                       </div>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-4 w-full max-w-md mx-auto mb-8">
                       <Button 
                            variant="primary" 
                            onClick={downloadPDF} 
                            disabled={processingDownload}
                            className="w-full text-xl py-4 flex items-center justify-center gap-2"
                        >
                            {processingDownload ? 'Criando livro...' : '📚 Baixar Livro em PDF'}
                       </Button>
                       
                       <Button 
                            variant="secondary" 
                            onClick={downloadFullAudio} 
                            disabled={processingDownload}
                            className="w-full text-xl py-4 flex items-center justify-center gap-2"
                       >
                            {processingDownload ? 'Processando áudio...' : '🎵 Baixar Áudio Completo'}
                       </Button>
                   </div>



                   <div className="flex flex-col gap-4 justify-center border-t-2 border-black/10 pt-6">
                       <Button variant="secondary" onClick={() => setActiveChapterIndex(0)}>📖 Ler Novamente</Button>
                       <Button variant="danger" onClick={handleExit} size="sm" className="mt-2 border-dashed">🚪 Salvar e Sair</Button>
                   </div>
               </Card>
          </div>
      ) : (
          <>
            <div className="mb-6 bg-white rounded-2xl border-4 border-black p-4 shadow-cartoon flex flex-col md:flex-row items-center justify-between gap-4 relative z-20">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-heading text-3xl text-cartoon-purple">{story.title}</h1>
                        {story.style === 'dynamic' && (
                            <span className="bg-cartoon-yellow text-black border-2 border-black px-2 py-0.5 rounded-full text-xs font-bold font-heading shadow-cartoon">
                                ⚡ Reels Dinâmico
                            </span>
                        )}
                        {story.style === 'musical' && (
                            <span className="bg-cartoon-pink text-white border-2 border-black px-2 py-0.5 rounded-full text-xs font-bold font-heading shadow-cartoon">
                                🎵 Fábrica de Musicais
                            </span>
                        )}
                    </div>
                    <div className="text-gray-500 font-bold">Capítulo {activeChapterIndex + 1} de {story.chapters.length}</div>
                </div>
                <div className="flex gap-2 items-center">
                    <Button size="sm" variant="success" onClick={() => { setCinemaInitialMode('selection'); setIsCinemaOpen(true); }} className="animate-pulse shadow-doodle hover:scale-105 transition-transform text-base py-2">
                        🎬 Assistir Filme
                    </Button>
                    <Button size="sm" variant="danger" onClick={handleExit}>❌ Salvar e Sair</Button>
                </div>
            </div>

            <div className="grid md:grid-cols-12 gap-8">
                <div className="md:col-span-12">
                <Card className="min-h-[500px] flex flex-col bg-white" color="white">
                    <div className="w-full h-64 md:h-96 mb-8 rounded-xl border-4 border-black overflow-hidden bg-gray-100 relative shadow-inner">
                        {currentChapter.generatedImage ? (
                            <img 
                                src={currentChapter.generatedImage} 
                                className="w-full h-full object-cover animate-fade-in" 
                                crossOrigin={currentChapter.generatedImage.startsWith('data:') ? undefined : "anonymous"} 
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 flex-col"><span className="text-4xl animate-bounce">🎨</span><span>Ilustrando...</span></div>
                        )}
                    </div>

                    <div className="flex-grow">
                        <h2 className="font-heading text-3xl mb-4 text-black">{currentChapter.title}</h2>
                        <div className="font-sans text-xl md:text-2xl text-gray-800 leading-loose mb-8">
                            {currentChapter.text.split('\n').map((p, i) => <p key={i} className="mb-4">{p}</p>)}
                        </div>
                    </div>

                    <div className="border-t-4 border-gray-100 border-dashed pt-6 flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-2xl border-2 border-black/10">
                            <label className="font-comic font-bold text-sm text-gray-700 flex items-center gap-1">
                                <span>🗣️</span> Voz do Narrador:
                            </label>
                            <select 
                                value={selectedVoice}
                                onChange={async (e) => {
                                    const newVoice = e.target.value;
                                    setSelectedVoice(newVoice);
                                    if (story) {
                                        const updatedStory = { ...story, voiceName: newVoice };
                                        setStory(updatedStory);
                                        await dbService.updateStory(user!.id, updatedStory);
                                    }
                                }}
                                className="p-2 border-2 border-black rounded-lg bg-white font-sans text-sm font-bold cursor-pointer"
                            >
                                {VOICE_OPTIONS.map(v => (
                                    <option key={v.value} value={v.value}>{v.label}</option>
                                ))}
                            </select>
                            
                            {currentChapter.generatedAudio && (
                                <button
                                    onClick={async () => {
                                        if (confirm("Deseja regerar a narração deste capítulo com a nova voz selecionada?")) {
                                            const updatedChapters = [...story.chapters];
                                            updatedChapters[activeChapterIndex] = { ...currentChapter, generatedAudio: undefined };
                                            const updatedStory = { ...story, chapters: updatedChapters };
                                            setStory(updatedStory);
                                            await dbService.updateStory(user!.id, updatedStory);
                                            // Auto-trigger generation
                                            setTimeout(() => {
                                                handleGenerateAudio();
                                            }, 100);
                                        }
                                    }}
                                    className="text-xs bg-cartoon-pink hover:bg-pink-600 text-white font-bold px-3 py-1.5 rounded-lg border-2 border-black shadow-doodle"
                                >
                                    🔄 Trocar Voz / Regerar Capítulo
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="w-full md:w-auto">
                                {currentChapter.generatedAudio ? (
                                    <AudioPlayer base64Audio={currentChapter.generatedAudio} />
                                ) : (
                                    <Button onClick={handleGenerateAudio} disabled={generatingAudio} variant="secondary" size="sm" loading={generatingAudio}>🔊 Narrar Capítulo ({VOICE_OPTIONS.find(v => v.value === selectedVoice)?.label.split(' ')[1] || 'Kore'})</Button>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <Button onClick={() => setActiveChapterIndex(p => Math.max(0, p - 1))} disabled={activeChapterIndex === 0} variant="secondary">⬅️</Button>
                                <Button 
                                    onClick={() => {
                                        if (activeChapterIndex < story.chapters.length - 1) {
                                            setActiveChapterIndex(p => p + 1);
                                        } else {
                                            handleExit();
                                        }
                                    }} 
                                    variant={activeChapterIndex < story.chapters.length - 1 ? "primary" : "success"}
                                >
                                    {activeChapterIndex < story.chapters.length - 1 ? 'Próxima ➡️' : 'FINALIZAR 🎉'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
                {isAdmin && renderAdminPanel()}
                </div>
            </div>
          </>
      )}

      {isAdmin && <div className="mt-8 flex justify-center">{renderAdminPanel()}</div>}
      {isCinemaOpen && (
        <CinemaPlayer 
          story={story} 
          onClose={() => setIsCinemaOpen(false)} 
          onUpdateStory={(updatedStory) => setStory(updatedStory)}
          initialMode={cinemaInitialMode}
        />
      )}
    </div>
  );
};

export default StoryReader;
