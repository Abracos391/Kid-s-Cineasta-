import React, { useState, useEffect } from 'react';

export const TutorialWidget: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingText, setProcessingText] = useState('Analisando as cenas do filme...');

  // Check for first access on mount
  useEffect(() => {
    const firstAccess = localStorage.getItem('cineastakids_first_access') !== 'false';
    if (firstAccess) {
      setIsMaximized(true);
      // Mark first access as seen so it doesn't auto-open again on reload
      localStorage.setItem('cineastakids_first_access', 'false');
    }

    // Listen for custom force-open events
    const handleForceOpen = () => {
      setIsMaximized(true);
      // Scroll to widget if offscreen
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('open-tutorial-video', handleForceOpen);
    window.addEventListener('open-tutorial-video-force', handleForceOpen);

    return () => {
      window.removeEventListener('open-tutorial-video', handleForceOpen);
      window.removeEventListener('open-tutorial-video-force', handleForceOpen);
    };
  }, []);

  // Trigger processing animation whenever maximized is opened
  useEffect(() => {
    if (isMaximized) {
      setIsProcessing(true);
      setProcessingProgress(0);
      setProcessingText('Iniciando o rolo de filme... 🎞️');
      
      const timer1 = setTimeout(() => {
        setProcessingProgress(25);
        setProcessingText('Sincronizando trilha sonora... 🎵');
      }, 600);
      
      const timer2 = setTimeout(() => {
        setProcessingProgress(50);
        setProcessingText('Carregando dublagem do Cineasta... 🗣️');
      }, 1200);
      
      const timer3 = setTimeout(() => {
        setProcessingProgress(75);
        setProcessingText('Colorindo as cenas animadas... ✨');
      }, 1800);
      
      const timer4 = setTimeout(() => {
        setProcessingProgress(100);
        setProcessingText('Ajustando projetor do cinema... 📽️');
      }, 2400);
      
      const timer5 = setTimeout(() => {
        setIsProcessing(false);
      }, 3000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        clearTimeout(timer5);
      };
    } else {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, [isMaximized]);

  return (
    <>
      {/* 1. MINIMIZED FLOATING BALLOON */}
      {!isMaximized && (
        <div 
          id="tutorial-bubble-container"
          className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2 pointer-events-none"
        >
          {/* Friendly chat bubble prompt */}
          <div 
            className="bg-black text-white text-xs font-heading py-1.5 px-3 rounded-2xl border-2 border-white shadow-md animate-bounce-slow pointer-events-auto cursor-pointer flex items-center gap-1 hover:scale-105 transition-transform"
            onClick={() => setIsMaximized(true)}
          >
            <span className="text-cartoon-yellow">🎁</span> Ganhe Desconto &amp; Dicas!
          </div>

          {/* Interactive Bubble */}
          <button
            id="tutorial-floating-bubble"
            onClick={() => setIsMaximized(true)}
            className="w-16 h-16 md:w-20 md:h-20 bg-cartoon-yellow hover:bg-yellow-400 border-4 border-black rounded-full shadow-doodle hover:shadow-doodle-hover hover:scale-110 active:translate-y-1 transition-all flex items-center justify-center pointer-events-auto cursor-pointer relative group"
            title="Como usar & Ganhar Desconto"
          >
            {/* Playful clapper emoji and film effect */}
            <span className="text-3xl md:text-4xl group-hover:rotate-12 transition-transform">🎬</span>
          </button>
        </div>
      )}

      {/* 2. MAXIMIZED CARTOON TUTORIAL PANEL */}
      {isMaximized && (
        <div 
          id="tutorial-maximized-overlay"
          className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 overflow-y-auto"
        >
          {/* A. CINEMATIC LOADING STATE */}
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg w-full">
              {/* Bouncing camera animation */}
              <div className="text-9xl mb-8 animate-bounce select-none">
                📽️
              </div>
              
              <h2 className="font-comic text-4xl md:text-5xl text-cartoon-orange text-stroke-black uppercase tracking-wider mb-2">
                Iniciando Projeção
              </h2>
              
              <p className="font-heading text-lg md:text-xl text-white mb-8 h-8">
                {processingText}
              </p>

              {/* Progress Indicators (25%, 50%, 75%, 100%) */}
              <div className="w-full mb-8">
                <div className="grid grid-cols-4 gap-4 text-center mb-4">
                  {[25, 50, 75, 100].map((stepVal) => {
                    const isDone = processingProgress >= stepVal;
                    return (
                      <div key={stepVal} className="flex flex-col items-center">
                        <span className={`text-xs font-bold transition-colors uppercase ${isDone ? 'text-cartoon-pink font-extrabold scale-105' : 'text-gray-500'}`}>
                          Passo {stepVal === 25 ? '1' : stepVal === 50 ? '2' : stepVal === 75 ? '3' : '4'}
                        </span>
                        <span className={`font-comic text-2xl md:text-3xl transition-all duration-300 ${isDone ? 'text-cartoon-green scale-110 font-bold' : 'text-gray-600'}`}>
                          {stepVal}%
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full h-6 bg-gray-800 border-4 border-black rounded-full overflow-hidden p-0.5 shadow-inner">
                  <div 
                    className="bg-cartoon-green h-full rounded-full transition-all duration-500 border-r-4 border-black"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
              </div>

              <div className="text-xs text-gray-400 font-sans italic">
                Prepare a pipoca, o show do Cineasta Kids já vai começar! 🍿
              </div>
            </div>
          ) : (
            // B. MAIN VIDEO PLAYER (TELA INTEIRA / MAXIMUM FOCUS)
            <div 
              id="tutorial-player-container"
              className="relative w-full max-w-6xl aspect-video bg-black border-8 border-black rounded-3xl shadow-cartoon overflow-hidden animate-scale-up"
            >
              {/* Close Button / Minimize */}
              <button
                id="tutorial-minimize"
                onClick={() => setIsMaximized(false)}
                className="absolute top-4 right-4 bg-cartoon-orange text-white border-4 border-black hover:bg-red-500 rounded-full w-12 h-12 flex items-center justify-center font-heading text-2xl shadow-doodle active:translate-y-1 hover:scale-110 transition-all cursor-pointer z-50"
                title="Fechar Vídeo"
              >
                X
              </button>

              {/* YouTube Responsive Video Embed */}
              <iframe
                id="tutorial-youtube-player"
                src="https://www.youtube.com/embed/S1aWBHf7N7M?enablejsapi=1&autoplay=1"
                title="Cineasta Kids Tutorial"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="no-referrer"
              ></iframe>
            </div>
          )}
        </div>
      )}
    </>
  );
};
