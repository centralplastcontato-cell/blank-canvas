import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface BackgroundMusicProps {
  src: string;
  /** Pause music when this is true (e.g. chatbot open) */
  paused?: boolean;
  volume?: number;
}

export const BackgroundMusic = ({ src, paused = false, volume = 0.35 }: BackgroundMusicProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (paused) {
      if (!audio.paused) {
        wasPlayingRef.current = true;
        audio.pause();
        setIsPlaying(false);
      }
    } else if (wasPlayingRef.current) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
      wasPlayingRef.current = false;
    }
  }, [paused]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        // browser blocked
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="auto" />
      <button
        onClick={toggle}
        aria-label={isPlaying ? "Pausar trilha" : "Ativar trilha"}
        className={`fixed bottom-4 left-20 z-50 backdrop-blur-md border rounded-full px-4 py-3 shadow-lg hover:scale-110 transition-transform flex items-center gap-2 ${
          isPlaying
            ? "bg-card/80 border-border"
            : "bg-primary text-primary-foreground border-primary animate-pulse"
        }`}
      >
        {isPlaying ? (
          <>
            <Volume2 className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-foreground hidden sm:inline">Trilha ligada</span>
          </>
        ) : (
          <>
            <Volume2 className="w-5 h-5" />
            <span className="text-xs font-bold">🎵 Ativar trilha</span>
          </>
        )}
      </button>
    </>
  );
};
