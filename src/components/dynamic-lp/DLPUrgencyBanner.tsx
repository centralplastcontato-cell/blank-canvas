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
const DEADLINE = "2026-07-18T23:59:59";
const MESSAGE = "🍕 Feche sua festa até 18/07 e ganhe Rodízio de Mini Pizza + Decoração completa";

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
    <div className="flex flex-col items-center justify-center bg-white/15 backdrop-blur-sm rounded-lg px-2 py-1 min-w-[36px] border border-white/10">
      <span className="text-sm md:text-base font-bold tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[8px] md:text-[9px] uppercase tracking-wider opacity-80 mt-0.5 font-semibold">
        {label}
      </span>
    </div>
  );

  return (
    <div
      className="sticky top-0 z-50 text-white shadow-lg animate-fade-in relative overflow-hidden"
      style={{ background: `linear-gradient(110deg, ${primary} 0%, ${primary} 40%, ${secondary} 100%)` }}
    >
      {/* shine overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 py-2.5">
        {/* Mobile: stacked. Desktop: row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
          {/* Message */}
          <div className="flex items-center gap-2 min-w-0 pr-8 md:pr-0">
            <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
              <Clock className="w-3.5 h-3.5" />
            </span>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-90">
                Oferta por tempo limitado
              </span>
              <span className="text-xs sm:text-sm font-medium truncate">
                {MESSAGE}
              </span>
            </div>
          </div>

          {/* Countdown + CTA */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Cell value={timeLeft.days} label="dias" />
              <Cell value={timeLeft.hours} label="hrs" />
              <Cell value={timeLeft.minutes} label="min" />
              <div className="hidden sm:block">
                <Cell value={timeLeft.seconds} label="seg" />
              </div>
            </div>

            {onCtaClick && (
              <button
                onClick={onCtaClick}
                className="hidden md:inline-flex items-center px-4 py-2 rounded-full bg-white text-foreground text-xs font-bold shadow-md hover:scale-105 hover:shadow-lg transition-all whitespace-nowrap"
              >
                Quero garantir →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Close button absolute */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Fechar"
        className="absolute top-2 right-2 md:top-1/2 md:-translate-y-1/2 md:right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
