import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Símbolo da Celebrei (chapéu de festa) em vetor, redesenhado a partir do
 * logo do cartão (assets/logo-celebrei-1.png). Fica nítido em qualquer
 * tamanho e pesa poucos bytes, ao contrário da foto original.
 */
export function CelebreiMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const cone = "M33.5 9.5 L51.5 50.5 Q32 57.5 13 51.5 Z";

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-cone`} x1="0.35" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#FFC93C" />
          <stop offset="0.38" stopColor="#FF8A3D" />
          <stop offset="0.72" stopColor="#F0457A" />
          <stop offset="1" stopColor="#8E3FD9" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={cone} />
        </clipPath>
      </defs>

      {/* contorno de adesivo */}
      <path d={cone} fill="#fff" stroke="#fff" strokeWidth="7" strokeLinejoin="round" />
      <path d={cone} fill={`url(#${id}-cone)`} stroke={`url(#${id}-cone)`} strokeWidth="3" strokeLinejoin="round" />

      <g clipPath={`url(#${id}-clip)`}>
        <path d="M10 30 Q32 22 56 16 L56 21 Q32 27 10 35 Z" fill="#fff" opacity="0.38" />
        <path d="M8 44 Q32 34 58 30 L58 35.5 Q32 39.5 8 49.5 Z" fill="#fff" opacity="0.32" />
        <circle cx="31" cy="20" r="1.5" fill="#fff" opacity="0.7" />
        <circle cx="24" cy="40" r="1.5" fill="#fff" opacity="0.6" />
        <circle cx="39" cy="44" r="1.7" fill="#fff" opacity="0.6" />
        <circle cx="42" cy="32" r="1.3" fill="#fff" opacity="0.55" />
      </g>

      {/* pompom */}
      <circle cx="33.5" cy="7.5" r="5" fill="#fff" />
      <circle cx="33.5" cy="7.5" r="3.2" fill="#F2557F" />

      {/* confete */}
      <path d="M22 4.5 L24 10" stroke="#FFC93C" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M45.5 15 L50 11.5" stroke="#FF8A3D" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M12.5 17.5 Q17 15.5 19.5 20 Q15.5 21.5 12.5 17.5 Z" fill="#F0457A" />
      <circle cx="15" cy="27" r="2.2" fill="#38BDF8" />
      <circle cx="46.5" cy="5.5" r="2.2" fill="#38BDF8" />
    </svg>
  );
}

interface CelebreiLogoProps {
  className?: string;
  markClassName?: string;
  /** "dark" para usar sobre fundo escuro (nome em branco). */
  tone?: "light" | "dark";
}

export default function CelebreiLogo({ className, markClassName, tone = "light" }: CelebreiLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CelebreiMark className={cn("h-9 w-9 shrink-0", markClassName)} />
      <span
        className={cn(
          "font-body text-[1.45rem] font-extrabold leading-none tracking-[-0.02em]",
          tone === "dark" ? "text-white" : "text-[#0F1222]",
        )}
      >
        Celebrei
      </span>
    </span>
  );
}
