import React, { useState, useRef, useEffect } from 'react';
import Button from './ui/Button';

interface AudioPlayerProps {
  base64Audio: string; // Raw PCM from Gemini TTS
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ base64Audio }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const playAudio = async () => {
    try {
      if (isPlaying) {
        sourceRef.current?.stop();
        setIsPlaying(false);
        return;
      }

      // Initialize AudioContext on user interaction
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;

      // Decode
      const audioBytes = decode(base64Audio);
      
      // Convert raw PCM (Int16) to AudioBuffer
      // Note: Gemini usually returns 24kHz mono PCM Int16
      const dataInt16 = new Int16Array(audioBytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      
      sourceRef.current = source;
      source.start();
      setIsPlaying(true);

    } catch (e) {
      console.error("Audio playback failed", e);
      setIsPlaying(false);
    }
  };

  const downloadAudio = () => {
    try {
        // Para baixar, precisamos adicionar um cabeçalho WAV simples ou salvar como raw PCM
        // Para simplificar e funcionar na maioria dos players, vamos encapsular o PCM em um WAV container
        // Ou, mais simples para este contexto: Baixar como binário e o navegador/player interpreta
        // Mas o ideal para usuário final é WAV.
        
        // Vamos criar um link simples de download do binário
        const audioBytes = decode(base64Audio);
        
        // Cabeçalho WAV simples (Mono, 24kHz, 16bit)
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
        const dataLength = audioBytes.length;
        const fileSize = 36 + dataLength;

        writeString(0, 'RIFF');
        view.setUint32(4, fileSize, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
        view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); // ByteRate
        view.setUint16(32, numChannels * (bitsPerSample / 8), true); // BlockAlign
        view.setUint16(34, bitsPerSample, true);
        writeString(36, 'data');
        view.setUint32(40, dataLength, true);

        const blob = new Blob([wavHeader, audioBytes], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `narracao_cineasta_kids_${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Erro ao baixar áudio", e);
        alert("Erro ao preparar download.");
    }
  };

  return (
    <div className="flex gap-2">
        <Button onClick={playAudio} size="sm" variant="secondary" className="flex items-center gap-2">
        {isPlaying ? (
            <>
            <span className="animate-pulse">🔊</span> Parar
            </>
        ) : (
            <>
            <span>🔈</span> Ouvir
            </>
        )}
        </Button>
        <Button onClick={downloadAudio} size="sm" variant="secondary" title="Baixar Áudio">
            ⬇️
        </Button>
    </div>
  );
};

export default AudioPlayer;