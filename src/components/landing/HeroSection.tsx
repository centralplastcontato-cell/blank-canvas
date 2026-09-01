import { motion } from "framer-motion";
import { Star, Crown } from "lucide-react";
import fachada1 from "@/assets/fachada-unidade-2.jpg";
import mascoteCastelo from "@/assets/mascote-castelo.png";

interface HeroSectionProps {
  onCtaClick: () => void;
}

const stats = [
  { value: "9", suffix: "anos", label: "de tradição em Sorocaba" },
  { value: "+4.000", suffix: "", label: "celebrações realizadas" },
  { value: "4,7", suffix: "★", label: "reputação no Google" },
];

// Cores festivas do Castelo
const FESTIVE_COLORS = ["#E91E63", "#FF5722", "#FFC107", "#4CAF50", "#2196F3", "#9C27B0"];

export function HeroSection({ onCtaClick }: HeroSectionProps) {
  return (
    <section
      className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden"
      aria-label="Seção principal"
    >
      {/* Barra colorida festiva no topo */}
      <div className="absolute top-0 left-0 right-0 h-1.5 z-20 flex">
        {FESTIVE_COLORS.map((color, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>

      {/* Background image — overlay bem mais leve para mostrar as cores reais */}
      <div className="absolute inset-0">
        <img
          src={fachada1}
          alt="Fachada Castelo da Diversão"
          className="w-full h-full object-cover object-[center_35%] md:object-center scale-105"
          loading="eager"
          fetchPriority="high"
        />
        {/* Overlay leve — preserva as cores vibrantes da fachada */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/65" />
      </div>

      {/* Bolinhas festivas flutuantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {FESTIVE_COLORS.map((color, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full opacity-60"
            style={{
              backgroundColor: color,
              left: `${10 + i * 15}%`,
              top: `${15 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: 2.5 + i * 0.4,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 section-container py-20 md:py-24 px-4">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 max-w-6xl mx-auto">
          {/* Mascote do Castelo */}
          <motion.img
            src={mascoteCastelo}
            alt="Mascote do Castelo da Diversão"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: [0, -12, 0] }}
            transition={{
              opacity: { delay: 0.2, duration: 0.7 },
              scale: { delay: 0.2, duration: 0.7 },
              y: { delay: 0.9, duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
            className="w-44 sm:w-56 lg:w-[360px] xl:w-[400px] shrink-0 drop-shadow-[0_16px_40px_rgba(0,0,0,0.55)] select-none pointer-events-none"
          />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6 max-w-2xl text-center"
        >
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="flex justify-center"
          >
            <div className="inline-flex items-center gap-3">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-yellow-400/70" />
              <span className="inline-flex items-center gap-2 text-[11px] md:text-xs font-semibold tracking-[0.3em] uppercase text-yellow-300/90">
                <Crown className="w-3.5 h-3.5" />
                Buffet Infantil · Sorocaba
              </span>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-yellow-400/70" />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="font-['Nunito'] text-[2.25rem] sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}
          >
            A festa que seu filho{" "}
            <span className="block italic font-medium bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
              vai lembrar pra sempre
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="font-['Inter'] text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-light leading-relaxed"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.7)" }}
          >
            Cada detalhe pensado para transformar o aniversário em memória de família.
            <span className="block mt-1 text-white/75">Consulte datas e valores em menos de 1 minuto.</span>
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="pt-2 flex flex-col items-center gap-3"
          >
            <button
              onClick={onCtaClick}
              className="group relative inline-flex items-center gap-3 px-8 md:px-10 py-4 md:py-5 rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-[#1a1030] font-bold text-base md:text-lg tracking-wide shadow-[0_10px_40px_-10px_rgba(255,200,60,0.7)] hover:shadow-[0_20px_60px_-10px_rgba(255,200,60,0.9)] transition-all duration-500 hover:scale-[1.03]"
            >
              <span>Consultar datas e valores</span>
              <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300/50 to-amber-300/50 blur-xl -z-10 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
            <p className="text-xs text-white/60 font-light tracking-wide" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
              Sem compromisso · resposta em até 1h
            </p>
          </motion.div>

          {/* Stats — glassmorphism card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.7 }}
            className="pt-6"
          >
            <div className="relative mx-auto max-w-2xl bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl px-4 py-5">
              <div className="grid grid-cols-3 gap-2 md:gap-6">
                {stats.map((s, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center text-center ${i !== 0 ? "border-l border-white/20" : ""}`}
                  >
                    <div className="flex items-baseline gap-1">
                      <span className="font-['Nunito'] text-3xl md:text-5xl font-light text-white tracking-tight"
                        style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                        {s.value}
                      </span>
                      {s.suffix && (
                        <span className="font-['Nunito'] text-base md:text-xl font-light text-yellow-300/90">
                          {s.suffix}
                        </span>
                      )}
                    </div>
                    <span className="mt-1 font-['Inter'] text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/70 font-medium">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Stars */}
              <div className="mt-4 flex items-center justify-center gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-yellow-300 text-yellow-300" />
                ))}
                <span className="ml-2 text-[11px] text-white/60 font-['Inter'] tracking-wide">
                  a confiança de quem já celebrou aqui
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-xs font-['Inter'] tracking-[0.3em] uppercase"
        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
      >
        Role para descobrir
      </motion.div>
    </section>
  );
}
