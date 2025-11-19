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

  return (
    <Button onClick={playAudio} size="sm" variant="secondary" className="flex items-center gap-2">
      {isPlaying ? (
        <>
          <span className="animate-pulse">🔊</span> Parar
        </>
      ) : (
        <>
          <span>🔈</span> Ouvir Narrador
        </>
      )}
    </Button>
  );
};

export default AudioPlayer;