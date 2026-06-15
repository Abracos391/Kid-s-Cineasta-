import React, { useEffect, useRef, useState } from 'react';
import { Story, StoryChapter, Avatar } from '../types';
import Button from './ui/Button';
import Card from './ui/Card';
import { generateSpeech } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';

interface CinemaPlayerProps {
  story: Story;
  onClose: () => void;
  onUpdateStory: (updatedStory: Story) => void;
}

const CINEMA_MUSIC_URL = 'https://github.com/shotstack/test-media/raw/main/audio/happy.mp3';

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({ story, onClose, onUpdateStory }) => {
  const { user } = useAuth();
  
  // Modes: 'playback' or 'record'
  const [mode, setMode] = useState<'selection' | 'playback' | 'record'>('selection');
  
  // Playback control states
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voiceLoadingText, setVoiceLoadingText] = useState<string>('');
  
  // Recording states
  const [recordProgress, setRecordProgress] = useState(0); // 0 to 100%
  const [recordStatus, setRecordStatus] = useState<'idle' | 'preparing' | 'recording' | 'finished' | 'error'>('idle');
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  // Audio references
  const narratorAudioRef = useRef<HTMLAudioElement | null>(null);
  const bMusicAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Recording references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const chapters = story.chapters;
  const currentChapter = chapters[currentChapterIndex];

  // Prepare and normalize background music
  useEffect(() => {
    const music = new Audio(CINEMA_MUSIC_URL);
    music.loop = true;
    music.volume = 0.15;
    bMusicAudioRef.current = music;

    return () => {
      music.pause();
      if (narratorAudioRef.current) narratorAudioRef.current.pause();
      if (bMusicAudioRef.current) bMusicAudioRef.current.pause();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Update background music volume based on mute
  useEffect(() => {
    if (bMusicAudioRef.current) {
      bMusicAudioRef.current.volume = isMuted ? 0 : 0.15;
    }
    if (narratorAudioRef.current) {
      narratorAudioRef.current.volume = isMuted ? 0 : 1.0;
    }
  }, [isMuted]);

  // Handle active speech/narration playing in Playback Mode
  useEffect(() => {
    if (mode !== 'playback') return;

    if (narratorAudioRef.current) {
      narratorAudioRef.current.pause();
    }

    if (isPlaying && currentChapter && currentChapter.generatedAudio) {
      const audio = new Audio(`data:audio/wav;base64,${currentChapter.generatedAudio}`);
      audio.volume = isMuted ? 0 : 1.0;
      narratorAudioRef.current = audio;

      audio.onended = () => {
        // Auto-advance to next chapter if there is one
        if (currentChapterIndex < chapters.length - 1) {
          setTimeout(() => {
            setCurrentChapterIndex(prev => prev + 1);
          }, 1200);
        } else {
          setIsPlaying(false);
          if (bMusicAudioRef.current) bMusicAudioRef.current.pause();
        }
      };

      audio.play().catch(err => console.log('Speech play interrupted', err));

      if (bMusicAudioRef.current && bMusicAudioRef.current.paused) {
        bMusicAudioRef.current.play().catch(err => console.log('BGM play interrupted', err));
      }
    } else {
      if (narratorAudioRef.current) narratorAudioRef.current.pause();
    }
  }, [isPlaying, currentChapterIndex, mode]);

  // Safety trigger: ensure all chapters have narration generated before starting
  const ensureAllVoicesGenerated = async (): Promise<boolean> => {
    if (!user) return false;
    setVoicesLoading(true);
    setVoiceLoadingText("Conectando ao estúdio de dublagem...");
    let updated = false;
    const updatedChapters = [...story.chapters];
    let failureCount = 0;

    // Helper de timeout seguro para requisições de rede
    function promiseWithTimeout<T>(promise: Promise<T>, ms: number, timeoutError: Error): Promise<T> {
      let timeoutId: any;
      const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(timeoutError), ms);
      });
      return Promise.race([
        promise.then((res) => {
          clearTimeout(timeoutId);
          return res;
        }),
        timeoutPromise
      ]);
    }

    for (let i = 0; i < updatedChapters.length; i++) {
      const chap = updatedChapters[i];
      if (!chap.generatedAudio) {
        setVoiceLoadingText(`Dublando Página ${i + 1} de ${updatedChapters.length}...`);
        
        let success = false;
        let attempts = 0;
        while (!success && attempts < 2) {
          attempts++;
          try {
            console.log(`Generating audio for chapter ${i + 1}/${updatedChapters.length} (Attempt ${attempts})...`);
            const speechBase64 = await promiseWithTimeout(
              generateSpeech(chap.text),
              12000,
              new Error("Tempo limite excedido de 12 segundos")
            );

            if (speechBase64) {
              updatedChapters[i] = { ...chap, generatedAudio: speechBase64 };
              updated = true;
              success = true;
            } else {
              throw new Error("Áudio nulo ou vazio retornado");
            }
          } catch (chapterErr) {
            console.error(`Attempt ${attempts} failed for chapter ${i + 1}:`, chapterErr);
            if (attempts >= 2) {
              failureCount++;
            } else {
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }
      }
    }

    try {
      if (updated) {
        const updatedStory = { ...story, chapters: updatedChapters };
        onUpdateStory(updatedStory);
        await dbService.updateStory(user.id, updatedStory);
      }
    } catch (e) {
      console.error('Error saving updated story voices:', e);
    }

    setVoicesLoading(false);

    if (failureCount > 0) {
      console.log(`Narration voice generation skipped or failed for ${failureCount} chapters.`);
    }

    // Retorna true sempre para não bloquear a gravação ou reprodução de cinema
    return true;
  };

  const startPlaybackMode = async () => {
    await ensureAllVoicesGenerated();
    setMode('playback');
    setCurrentChapterIndex(0);
    setIsPlaying(true);
    if (bMusicAudioRef.current) {
      bMusicAudioRef.current.currentTime = 0;
      bMusicAudioRef.current.play().catch(e => console.log(e));
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (bMusicAudioRef.current) {
      if (isPlaying) {
        bMusicAudioRef.current.pause();
      } else {
        bMusicAudioRef.current.play().catch(e => console.log(e));
      }
    }
  };

  // Helper function to extract the canvas recording compatibility
  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  // Pre-load an image asynchronously and handle crossOrigin anonymous settings
  const loadImageAsync = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Fallback placeholder image if loading fails
        const fallback = new Image();
        fallback.crossOrigin = 'anonymous';
        fallback.src = 'https://images.unsplash.com/photo-1606092195730-5d7b9af1ef4d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1280&q=80';
        fallback.onload = () => resolve(fallback);
        fallback.onerror = (err) => reject(err);
      };
    });
  };

  // Base64 decoding directly into AudioBuffer
  const decodeBase64ToAudioBuffer = async (audioCtx: AudioContext, base64: string): Promise<AudioBuffer> => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return await audioCtx.decodeAudioData(bytes.buffer);
  };

  const fetchAndDecodeAudio = async (audioCtx: AudioContext, url: string): Promise<AudioBuffer> => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
  };

  // Pure Client-side High Fidelity Recording Engine
  const recordVideo = async () => {
    setRecordStatus('preparing');
    setRecordProgress(0);
    setRecordedVideoUrl(null);
    setMode('record');

    // Setup Web Audio recording route EARLY to preserve the user's synchronous click gesture!
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    audioContextRef.current = audioCtx;

    // Garante que o AudioContext está ativo no navegador imediatamente
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch (e) {
        console.warn('Could not resume AudioContext early:', e);
      }
    }

    // 1. Ensure all chapters have generated speech tracks
    const voicesOk = await ensureAllVoicesGenerated();
    if (!voicesOk) {
      alert('Não foi possível gerar as vozes dos personagens. O vídeo requer as vozes geradas para gravação.');
      setRecordStatus('idle');
      setMode('selection');
      try {
        audioCtx.close();
      } catch (e) {}
      return;
    }

    setRecordStatus('recording');

    let bgMusicSource: AudioBufferSourceNode | null = null;

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Render canvas not available');

      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Garante novamente que o AudioContext está ativo após operações de rede
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const recordingDest = audioCtx.createMediaStreamDestination();
      audioDestinationRef.current = recordingDest;

      try {
        console.log("Loading high-fidelity background music for recording...");
        const bgMusicBuffer = await fetchAndDecodeAudio(audioCtx, CINEMA_MUSIC_URL);
        
        bgMusicSource = audioCtx.createBufferSource();
        bgMusicSource.buffer = bgMusicBuffer;
        bgMusicSource.loop = true;
        
        const bgGain = audioCtx.createGain();
        bgGain.gain.value = 0.12; // warm music volume
        
        bgMusicSource.connect(bgGain);
        bgGain.connect(recordingDest);
        bgGain.connect(audioCtx.destination); // Play live for users to hear the progress
        bgMusicSource.start(0);
      } catch (bgError) {
        console.warn('Could not request and mix background music into recordingDest due to CORS or network. Recording without music background.', bgError);
      }

      // Setup recording output streams
      const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : (canvas as any).mozCaptureStream ? (canvas as any).mozCaptureStream(30) : null;
      if (!canvasStream) {
        throw new Error('Seu navegador não suporta a exportação de gravação de tela em tempo real (canvas.captureStream)');
      }
      
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...recordingDest.stream.getAudioTracks()
      ];
      
      const combinedStream = new MediaStream(combinedTracks);
      const mimeType = getSupportedMimeType();

      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType || undefined
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, {
          type: mimeType || 'video/webm'
        });
        const url = URL.createObjectURL(finalBlob);
        setRecordedVideoUrl(url);
        setRecordStatus('finished');
        if (bgMusicSource) {
          try {
            bgMusicSource.stop();
          } catch (e) {}
          bgMusicSource.disconnect();
        }
        audioCtx.close();
      };

      // Start recording
      mediaRecorder.start();

      // Begin chapter-by-chapter sequences
      for (let i = 0; i < chapters.length; i++) {
        setRecordProgress(Math.round(((i) / chapters.length) * 100));
        await renderChapterToCanvas(
          i, 
          ctx, 
          canvas, 
          audioCtx, 
          recordingDest, 
          new Audio()
        );
      }

      setRecordProgress(100);
      mediaRecorder.stop();

    } catch (e) {
      console.error('Recording engine failed:', e);
      setRecordStatus('error');
      if (bgMusicSource) {
        try { bgMusicSource.stop(); } catch (_) {}
      }
      try { audioCtx.close(); } catch (_) {}
    }
  };

  // Dynamic Scene Creator on Canvas
  const renderChapterToCanvas = (
    index: number,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    audioCtx: AudioContext,
    audioDest: MediaStreamAudioDestinationNode,
    bgMusic: HTMLAudioElement
  ): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const chapter = chapters[index];
        const chapterTitle = chapter.title;
        const chapterWords = chapter.text.split(' ');
        
        // Load the Chapter Scene image
        const chapterImg = await loadImageAsync(
          chapter.generatedImage || 'https://images.unsplash.com/photo-1606092195730-5d7b9af1ef4d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1280&q=80'
        );

        // Load protagonist Avatar images (if available) for talk-bouncing animation
        const avatarImgs: HTMLImageElement[] = [];
        if (story.characters && story.characters.length > 0) {
          for (const char of story.characters.slice(0, 2)) {
            if (char.imageUrl) {
              try {
                const img = await loadImageAsync(char.imageUrl);
                avatarImgs.push(img);
              } catch (e) {
                console.log('Failed loading character image for recording canvas', e);
              }
            }
          }
        }

        let duration = 6500; // default chapter frame length in ms
        let sourceNode: AudioBufferSourceNode | null = null;

        if (chapter.generatedAudio) {
          try {
            const buffer = await decodeBase64ToAudioBuffer(audioCtx, chapter.generatedAudio);
            duration = (buffer.duration * 1000) + 700; // duration of the narration with slightly generous buffer

            sourceNode = audioCtx.createBufferSource();
            sourceNode.buffer = buffer;
            sourceNode.connect(audioDest);
            sourceNode.connect(audioCtx.destination); // Play live for user to hear while rendering
          } catch (e) {
            console.error('Failed to decode narrator audio buffer, falling back to default duration:', e);
            duration = Math.max(6000, chapter.text.split(' ').length * 280);
          }
        } else {
          duration = Math.max(6000, chapter.text.split(' ').length * 280);
        }

        let startTime = Date.now();

        // Sequence render frames
        const frameLoop = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1.0);

          // Render high-contrast visual scene
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // 1. Ken Burns Covering zoom & pan background
          const scale = 1.0 + progress * 0.12; // slow zoom
          const panX = Math.sin(progress * Math.PI) * 20; // slow horizontal pan

          const canvasAspect = canvas.width / canvas.height;
          const imgAspect = chapterImg.width / chapterImg.height;
          let drawWidth = canvas.width;
          let drawHeight = canvas.height;

          if (imgAspect > canvasAspect) {
            drawWidth = canvas.height * imgAspect;
          } else {
            drawHeight = canvas.width / imgAspect;
          }

          const finalWidth = drawWidth * scale;
          const finalHeight = drawHeight * scale;
          const x = (canvas.width - finalWidth) / 2 + panX;
          const y = (canvas.height - finalHeight) / 2;

          ctx.drawImage(chapterImg, x, y, finalWidth, finalHeight);

          // Dark bottom gradient overlay for maximum subtitle legibility
          const grad = ctx.createLinearGradient(0, canvas.height - 240, 0, canvas.height);
          grad.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
          grad.addColorStop(0.3, 'rgba(0, 0, 0, 0.5)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, canvas.height - 240, canvas.width, 240);

          // 2. Render Narrating Avatars (Animated bounce)
          avatarImgs.forEach((avImg, idx) => {
            const isLeft = idx === 0;
            const bounce = Math.abs(Math.sin((elapsed / 1000) * 5)) * 12;
            const avWidth = 110;
            const avHeight = 110;
            const avX = isLeft ? 60 : canvas.width - 60 - avWidth;
            const avY = canvas.height - 180 - bounce;

            // White cartoonish round border
            ctx.beginPath();
            ctx.arc(avX + avWidth / 2, avY + avHeight / 2, avWidth / 2 + 5, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#000000';
            ctx.stroke();

            // Circular clip image
            ctx.save();
            ctx.beginPath();
            ctx.arc(avX + avWidth / 2, avY + avHeight / 2, avWidth / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avImg, avX, avY, avWidth, avHeight);
            ctx.restore();
          });

          // 3. Subtitles & Chapter Label in Fredoka / Comic Neue Styling
          ctx.font = '900 24px "Fredoka", "Comic Neue", "Fredoka One", cursive, sans-serif';
          ctx.fillStyle = '#FFD700'; // Cartoon gold yellow
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 6;
          ctx.textAlign = 'center';
          ctx.strokeText(chapterTitle.toUpperCase(), canvas.width / 2, canvas.height - 150);
          ctx.fillText(chapterTitle.toUpperCase(), canvas.width / 2, canvas.height - 150);

          // Split subtitle text to fit inside widescreen safe area
          ctx.font = 'bold 26px "Comic Neue", cursive, sans-serif';
          ctx.fillStyle = '#FFFFFF';
          ctx.lineWidth = 5;
          ctx.strokeStyle = '#000000';

          const subtitleText = chapter.text;
          const maxTextWidth = canvas.width - 360; // leave margins for avatars
          const words = subtitleText.split(' ');
          const lines = [];
          let currentLine = '';

          for (let n = 0; n < words.length; n++) {
            const testLine = currentLine + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxTextWidth && n > 0) {
              lines.push(currentLine.trim());
              currentLine = words[n] + ' ';
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine.trim());

          // Draw the subtitles line by line
          const startY = canvas.height - 100;
          lines.slice(0, 3).forEach((line, lineIdx) => {
            const lineY = startY + (lineIdx * 34);
            ctx.strokeText(line, canvas.width / 2, lineY);
            ctx.fillText(line, canvas.width / 2, lineY);
          });

          // Loop until slide time ends
          if (progress < 1.0) {
            animationFrameRef.current = requestAnimationFrame(frameLoop);
          } else {
            // Scene finished
            if (sourceNode) {
              try {
                sourceNode.stop();
              } catch (e) {}
              sourceNode.disconnect();
            }
            resolve();
          }
        };

        // Start source playback if available
        if (sourceNode) {
          try {
            sourceNode.start();
          } catch (e) {
            console.error('Failed to start narration playback:', e);
          }
        }

        animationFrameRef.current = requestAnimationFrame(frameLoop);

      } catch (err) {
        reject(err);
      }
    });
  };

  const handleDownloadVideo = () => {
    if (!recordedVideoUrl) return;
    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `Filme_CineastaKids_${story.title.replace(/\s+/g, '_')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div id="cinema-player-overlay" className="fixed inset-0 z-50 overflow-y-auto bg-black/95 flex items-center justify-center p-4 md:p-6 backdrop-blur-md">
      
      {/* Hidden Render Canvas for capturing stream offline */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Modern Neon Retro Screen Chassis */}
      <div id="cinema-cabinet" className="relative w-full max-w-4xl bg-gradient-to-b from-gray-900 to-black rounded-3xl border-8 border-cartoon-yellow shadow-2xl overflow-hidden text-white flex flex-col p-4 md:p-6">
        
        {/* Floating Close Button */}
        <button
          id="close-cinema"
          onClick={onClose}
          disabled={recordStatus === 'recording'}
          className="absolute top-4 right-4 bg-cartoon-orange border-4 border-black text-white hover:bg-red-500 rounded-full w-12 h-12 flex items-center justify-center font-heading text-2xl cursor-pointer shadow-doodle active:translate-y-1 transition-transform z-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          X
        </button>

        {/* 🎬 HEADER WITH COMIC BOOK TITLES */}
        <div id="cinema-header" className="text-center mb-6 pt-2">
          <h2 className="font-comic text-5xl md:text-6xl text-cartoon-yellow tracking-widest text-stroke-black animate-float">
            ESTÚDIO DE CINEMA
          </h2>
          <p className="text-cartoon-pink font-heading text-lg md:text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
            🎬 Assista ou Grave seu próprio Desenho Animado!
          </p>
        </div>

        {/* --- 1. SELECTION SPLASH SCREEN --- */}
        {mode === 'selection' && (
          <div id="selection-screen" className="flex flex-col items-center justify-center min-h-[350px] gap-8 py-6">
            <div className="text-center max-w-lg mb-2">
              <span className="text-6xl animate-bounce mb-4 block">🍿</span>
              <h3 className="font-heading text-2xl text-cartoon-blue">Escolha uma ação para o livro:</h3>
              <p className="text-gray-300 mt-2">Você pode assistir o filme completo com as vozes, ou gravar direto em um arquivo de vídeo de alta qualidade!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-4">
              
              <button
                id="btn-play-theater"
                onClick={startPlaybackMode}
                disabled={voicesLoading}
                className="bg-cartoon-blue text-black border-4 border-black font-heading rounded-2xl p-6 shadow-doodle hover:translate-x-1 hover:translate-y-1 hover:shadow-doodle-hover transition-all text-left flex flex-col items-center text-center gap-4 group"
              >
                <div className="text-5xl group-hover:scale-110 transition-transform">📺</div>
                <div>
                  <div className="text-2xl font-bold">1. Modo Cinema Interativo</div>
                  <div className="text-sm text-gray-800 mt-1">Assista a história na tela com efeitos de câmera e narração!</div>
                </div>
              </button>

              <button
                id="btn-record-studio"
                onClick={recordVideo}
                disabled={voicesLoading}
                className="bg-cartoon-yellow text-black border-4 border-black font-heading rounded-2xl p-6 shadow-doodle hover:translate-x-1 hover:translate-y-1 hover:shadow-doodle-hover transition-all text-left flex flex-col items-center text-center gap-4 group"
              >
                <div className="text-5xl group-hover:scale-110 transition-transform">🎥</div>
                <div>
                  <div className="text-2xl font-bold">2. Gravar &amp; Baixar Filme</div>
                  <div className="text-sm text-gray-800 mt-1">Cria um vídeo original (.webm) GRÁTIS direto do seu navegador!</div>
                </div>
              </button>

            </div>

            {voicesLoading && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center font-heading text-xl gap-4 rounded-3xl">
                <div className="w-16 h-16 border-t-4 border-cartoon-yellow border-solid rounded-full animate-spin"></div>
                <div className="text-cartoon-yellow text-center px-6">
                  Preparando vozes dos heróis... <br />
                  <span className="text-sm text-gray-400">Falando com a diretora de dublagem (Inteligência Artificial)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 2. INTERACTIVE CINEMA PLAYBACK MODE --- */}
        {mode === 'playback' && currentChapter && (
          <div id="playback-screen" className="flex flex-col gap-6">
            
            {/* The Cinema Visual Screen Layout */}
            <div id="cinema-screen" className="relative aspect-video w-full rounded-2xl border-4 border-gray-700 bg-black shadow-inner overflow-hidden">
              
              {/* Ken-Burns covered illustration image */}
              <img
                src={currentChapter.generatedImage || 'https://images.unsplash.com/photo-1606092195730-5d7b9af1ef4d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1280&q=80'}
                alt="Cinema Scene"
                className={`w-full h-full object-cover transition-transform duration-[10000ms] ease-out-sine ${
                  isPlaying ? 'scale-115 translate-y-3 translate-x-2' : ''
                }`}
              />

              {/* Character Avatars floating (talking simulation) */}
              {isPlaying && story.characters && story.characters.length > 0 && (
                <div className="absolute inset-x-0 bottom-36 px-10 flex justify-between pointer-events-none">
                  {story.characters.slice(0, 2).map((char, index) => {
                    const isLeft = index === 0;
                    return (
                      <div
                        key={char.id}
                        className={`flex flex-col items-center gap-1 ${
                          isLeft ? 'animate-float' : 'animate-wobble-slow'
                        }`}
                      >
                        <div className="w-20 h-20 rounded-full border-4 border-cartoon-yellow overflow-hidden bg-white shadow-cartoon">
                          <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="bg-cartoon-cream text-black px-2 py-0.5 rounded-lg text-xs font-bold border-2 border-black">
                          {char.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Subtitles Overlay Panel */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 text-center">
                <span className="text-cartoon-yellow font-heading text-xl uppercase tracking-wider block mb-1">
                  {currentChapter.title}
                </span>
                <p className="text-white font-sans text-lg md:text-2xl leading-relaxed md:px-14">
                  {currentChapter.text}
                </p>
              </div>

              {/* Paused Overlay */}
              {!isPlaying && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-xs">
                  <span className="text-5xl animate-pulse cursor-pointer" onClick={togglePlay}>
                    ⏸️ Filme Pausado
                  </span>
                </div>
              )}

            </div>

            {/* Playback Progress Indicator */}
            <div className="w-full bg-gray-800 rounded-full h-4 border-2 border-black overflow-hidden">
              <div 
                className="bg-cartoon-blue h-full transition-all duration-500" 
                style={{ width: `${((currentChapterIndex + 1) / chapters.length) * 100}%` }}
              />
            </div>

            {/* Cinema Player Controls */}
            <div id="playback-controls" className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-900 border-4 border-black p-4 rounded-2xl shadow-doodle">
              <div>
                <span className="text-cartoon-pink font-heading text-lg">
                  Capítulo {currentChapterIndex + 1} de {chapters.length} : {currentChapter.title}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentChapterIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentChapterIndex === 0}
                  className="bg-cartoon-green text-black border-2 border-black font-heading rounded-lg px-4 py-2 hover:bg-green-400 disabled:opacity-50 text-sm"
                >
                  ⬅️ Anterior
                </button>
                <button
                  onClick={togglePlay}
                  className={`border-2 border-black font-heading rounded-lg px-6 py-2 text-sm text-black ${
                    isPlaying ? 'bg-cartoon-yellow hover:bg-yellow-400' : 'bg-cartoon-pink hover:bg-pink-400'
                  }`}
                >
                  {isPlaying ? '⏸️ Pausar' : '▶️ Assistir'}
                </button>
                <button
                  onClick={() => setCurrentChapterIndex(prev => Math.min(chapters.length - 1, prev + 1))}
                  disabled={currentChapterIndex === chapters.length - 1}
                  className="bg-cartoon-green text-black border-2 border-black font-heading rounded-lg px-4 py-2 hover:bg-green-400 disabled:opacity-50 text-sm"
                >
                  Próximo ➡️
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="bg-gray-800 border-2 border-black px-3 py-2 rounded-lg text-lg"
                >
                  {isMuted ? '🔇 Desmutado' : '🔊 Silenciar'}
                </button>
                <button
                  onClick={() => {
                    setMode('selection');
                    setIsPlaying(false);
                  }}
                  className="bg-cartoon-orange text-white border-2 border-black font-heading px-4 py-2 rounded-lg text-sm"
                >
                  Voltar Menu
                </button>
              </div>
            </div>

          </div>
        )}

        {/* --- 3. HARDWARE CAPTURE & RECORD STUDIO MODE --- */}
        {mode === 'record' && (
          <div id="recording-studio-screen" className="flex flex-col items-center justify-center p-6 gap-6 text-center">
            
            {recordStatus === 'preparing' && (
              <div className="my-8 flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-t-4 border-cartoon-yellow border-solid rounded-full animate-spin"></div>
                <h4 className="font-heading text-2xl text-cartoon-yellow">Inicializando Estúdio Kids...</h4>
                <p className="text-gray-400">Misturando trilha musical, gerando animação adaptativa de câmera e sincronizando áudio.</p>
              </div>
            )}

            {recordStatus === 'recording' && (
              <div className="my-6 w-full max-w-lg bg-gray-900 border-4 border-black p-8 rounded-3xl shadow-cartoon relative overflow-hidden">
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="text-xs text-red-500 font-bold tracking-widest font-mono">RECORDING LIVE</span>
                </div>

                <div className="text-6xl mb-4 animate-bounce">📽️</div>
                <h3 className="font-heading text-3xl text-cartoon-orange mb-2">Gravando o Filme!</h3>
                <p className="text-sm text-gray-300 mb-6">Estamos produzindo seu desenho animado com zoom, trilha sonora e vozes sincronizadas das páginas.</p>
                
                {/* Visual rendering progression bar */}
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-black bg-cartoon-yellow ml-2">
                        Progresso do Filme
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold inline-block text-cartoon-yellow">
                        {recordProgress}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-6 text-xs flex rounded-lg bg-gray-800 border-2 border-black">
                    <div 
                      style={{ width: `${recordProgress}%` }} 
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-cartoon-green transition-all duration-300"
                    />
                  </div>
                </div>

                <p className="text-xs text-cartoon-yellow mt-4 font-bold animate-pulse">
                  ⚠️ Importante: Mantenha esta aba aberta, visível e ativa para garantir que o navegador grave todas as cenas e dublagens do seu filme!
                </p>
              </div>
            )}

            {recordStatus === 'finished' && (
              <div className="my-6 flex flex-col items-center gap-6">
                <span className="text-7xl animate-bounce">🎉🎬</span>
                <h3 className="font-heading text-4xl text-cartoon-green">Seu Filme Está Pronto!</h3>
                <p className="text-lg text-gray-300 max-w-md">Gerado de forma 100% gratuita, rápida e com áudio/vídeo perfeitamente mesclados no seu navegador.</p>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <button
                    onClick={handleDownloadVideo}
                    className="bg-cartoon-yellow text-black border-4 border-black font-heading text-2xl px-8 py-4 rounded-2xl shadow-doodle hover:translate-x-1 hover:translate-y-1 hover:shadow-doodle-hover active:translate-y-2 transition-all cursor-pointer"
                  >
                    📥 Baixar Desenho Animado (WEBM)
                  </button>
                  <button
                    onClick={() => setMode('selection')}
                    className="bg-gray-800 text-white border-4 border-black font-heading text-xl px-6 py-4 rounded-2xl shadow-doodle hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    Voltar ao Menu
                  </button>
                </div>
              </div>
            )}

            {recordStatus === 'error' && (
              <div className="my-6 flex flex-col items-center gap-4 bg-black/50 p-6 rounded-2xl border-4 border-cartoon-yellow max-w-md">
                <span className="text-6xl">⚠️</span>
                <h3 className="font-heading text-2xl text-cartoon-yellow font-bold">Aviso do Cinema</h3>
                <p className="text-sm text-gray-200 leading-relaxed text-left">
                  Não conseguimos salvar o vídeo localmente neste navegador. Isso é comum quando o navegador bloqueia recursos de gravação de tela dentro de molduras de testes (iFrames) ou devido a proteções de imagens externas (CORS).
                </p>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-left w-full space-y-2 text-xs text-gray-300">
                  <div className="font-bold text-cartoon-yellow text-sm">💡 Soluções Simples:</div>
                  <p>• <strong>Modo Cinema:</strong> Assista usando o <strong>"Modo Cinema Interativo"</strong> para ver a animação e ouvir as vozes com perfeição!</p>
                  <p>• <strong>Gerar na Nuvem:</strong> Use a opção <strong>"Gerar Filme MP4 (Shotstack)"</strong> na tela final para processar o filme de forma garantida e baixar!</p>
                  <p>• <strong>Nova Aba:</strong> Experimente abrir o Cineasta Kids em uma nova guia cheia fora do painel de desenvolvimento.</p>
                </div>
                <button
                  onClick={() => setMode('selection')}
                  className="bg-cartoon-orange text-white border-2 border-black font-heading px-6 py-3 rounded-xl hover:bg-orange-500 transition-colors"
                >
                  Voltar ao Menu
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
