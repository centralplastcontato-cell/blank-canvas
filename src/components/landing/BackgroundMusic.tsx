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
  const startedRef = useRef(false);
  const userStoppedRef = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Inicia a trilha na primeira interacao da pessoa com a pagina (rolagem,
  // toque, clique ou tecla). Navegadores bloqueiam audio sem gesto do usuario:
  // rolagem por toque conta como gesto; rolagem de mouse nem sempre — nesse
  // caso a tentativa falha em silencio e tenta de novo no proximo gesto.
  // Se a pessoa desligar a trilha pelo botao, nao religa sozinha.
  useEffect(() => {
    const events: (keyof WindowEventMap)[] = ["scroll", "wheel", "touchend", "pointerdown", "keydown"];
    const tryStart = () => {
      const audio = audioRef.current;
      if (!audio || startedRef.current || userStoppedRef.current || pausedRef.current) return;
      if (!audio.paused) return;
      audio
        .play()
        .then(() => {
          startedRef.current = true;
          setIsPlaying(true);
          cleanup();
        })
        .catch(() => {
          /* bloqueado pelo navegador — aguarda o proximo gesto valido */
        });
    };
    const cleanup = () => events.forEach((e) => window.removeEventListener(e, tryStart));
    events.forEach((e) => window.addEventListener(e, tryStart, { passive: true }));
    return cleanup;
  }, []);

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
        startedRef.current = true;
        userStoppedRef.current = false;
        setIsPlaying(true);
      } catch {
        // browser blocked
      }
    } else {
      audio.pause();
      userStoppedRef.current = true;
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
