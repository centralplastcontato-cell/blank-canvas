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
        aria-label={isPlaying ? "Pausar música" : "Tocar música"}
        className="fixed bottom-4 left-20 z-50 bg-card/80 backdrop-blur-md border border-border rounded-full p-3 shadow-lg hover:scale-110 transition-transform flex items-center gap-2"
      >
        {isPlaying ? (
          <>
            <Volume2 className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-xs font-semibold text-foreground hidden sm:inline">Música</span>
          </>
        ) : (
          <>
            <VolumeX className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Tocar música</span>
          </>
        )}
      </button>
    </>
  );
};
