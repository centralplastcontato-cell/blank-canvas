import { useEffect, useState } from "react";
import { X, Clock } from "lucide-react";
import type { LPTheme } from "@/types/landing-page";

// =====================================================================
// 🎛️  CONTROLE FÁCIL DO BANNER DE URGÊNCIA
// ---------------------------------------------------------------------
// Para LIGAR:    ENABLED = true
// Para DESLIGAR: ENABLED = false
// Para alterar a data limite: mude DEADLINE (formato AAAA-MM-DDTHH:mm)
// Para alterar o texto: mude MESSAGE
// =====================================================================
const ENABLED = true;
const DEADLINE = "2026-05-16T23:59:59";
const MESSAGE = "Promoção válida até 16/05 — só para os 10 primeiros contratos";

interface DLPUrgencyBannerProps {
  theme: LPTheme;
  onCtaClick?: () => void;
}

function getTimeLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function DLPUrgencyBanner({ theme, onCtaClick }: DLPUrgencyBannerProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(DEADLINE));
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!ENABLED) return;
    const interval = setInterval(() => setTimeLeft(getTimeLeft(DEADLINE)), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!ENABLED || dismissed || !timeLeft) return null;

  const primary = theme?.primary_color || "#E91E63";
  const secondary = theme?.secondary_color || "#FFC107";

  const Cell = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center min-w-[38px]">
      <span className="text-sm md:text-base font-bold tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">
        {label}
      </span>
    </div>
  );

  return (
    <div
      className="sticky top-0 z-50 text-white shadow-md animate-fade-in"
      style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
    >
      <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Clock className="w-4 h-4 flex-shrink-0 hidden sm:block" />
          <p className="text-xs sm:text-sm font-medium truncate">{MESSAGE}</p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <Cell value={timeLeft.days} label="d" />
          <span className="opacity-60">:</span>
          <Cell value={timeLeft.hours} label="h" />
          <span className="opacity-60">:</span>
          <Cell value={timeLeft.minutes} label="m" />
          <span className="opacity-60 hidden sm:inline">:</span>
          <div className="hidden sm:block">
            <Cell value={timeLeft.seconds} label="s" />
          </div>
        </div>

        {onCtaClick && (
          <button
            onClick={onCtaClick}
            className="hidden md:inline-flex items-center px-3 py-1.5 rounded-full bg-white/95 text-foreground text-xs font-semibold hover:bg-white transition-colors"
          >
            Quero garantir
          </button>
        )}

        <button
          onClick={() => setDismissed(true)}
          aria-label="Fechar"
          className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
