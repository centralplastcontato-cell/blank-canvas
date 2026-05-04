import { motion } from "framer-motion";
import { Star, Sparkles, Crown } from "lucide-react";
import fachada1 from "@/assets/fachada-unidade-2.jpg";
import logoCastelo from "@/assets/logo-castelo.png";

interface HeroSectionProps {
  onCtaClick: () => void;
}

const stats = [
  { value: "9", suffix: "anos", label: "de história" },
  { value: "+4.000", suffix: "", label: "festas realizadas" },
  { value: "4,9", suffix: "★", label: "no Google" },
];

export function HeroSection({ onCtaClick }: HeroSectionProps) {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-label="Seção principal"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={fachada1}
          alt="Fachada Castelo da Diversão"
          className="w-full h-full object-cover scale-105"
          loading="eager"
          fetchPriority="high"
        />
        {/* Cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a]/85 via-[#1a1030]/70 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,26,0.5)_100%)]" />
      </div>

      {/* Subtle floating sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(14)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${5 + Math.random() * 90}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 0.7, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 4,
            }}
          >
            <Sparkles className="w-3 h-3 text-yellow-200/60" />
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 section-container text-center py-20 md:py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-7 max-w-4xl mx-auto"
        >
          {/* Premium eyebrow */}
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

          {/* Logo */}
          <motion.img
            src={logoCastelo}
            alt="Castelo da Diversão"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="w-36 md:w-48 lg:w-56 mx-auto drop-shadow-[0_8px_24px_rgba(255,200,80,0.25)]"
          />

          {/* Editorial Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="font-['Fraunces'] text-[2.25rem] sm:text-5xl md:text-6xl lg:text-7xl font-light text-white leading-[1.05] tracking-tight"
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
            className="font-['Inter'] text-base sm:text-lg md:text-xl text-white/75 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Há 9 anos transformando aniversários em memórias inesquecíveis.
            <span className="block mt-1 text-white/60">Agende uma visita de 15 minutos e conheça nosso espaço.</span>
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
              className="group relative inline-flex items-center gap-3 px-8 md:px-10 py-4 md:py-5 rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-[#1a1030] font-bold text-base md:text-lg tracking-wide shadow-[0_10px_40px_-10px_rgba(255,200,60,0.6)] hover:shadow-[0_20px_60px_-10px_rgba(255,200,60,0.8)] transition-all duration-500 hover:scale-[1.03]"
            >
              <span>Agendar visita de 15 min</span>
              <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300/50 to-amber-300/50 blur-xl -z-10 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
            <p className="text-xs text-white/50 font-light tracking-wide">
              Sem compromisso · resposta em até 1h
            </p>
          </motion.div>

          {/* Editorial Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.7 }}
            className="pt-8 md:pt-10"
          >
            <div className="relative mx-auto max-w-2xl">
              {/* Hairline frame */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-300/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-yellow-300/40 to-transparent" />

              <div className="grid grid-cols-3 gap-2 md:gap-6 py-6 md:py-7">
                {stats.map((s, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center text-center ${
                      i !== 0 ? "border-l border-white/10" : ""
                    }`}
                  >
                    <div className="flex items-baseline gap-1">
                      <span className="font-['Fraunces'] text-3xl md:text-5xl font-light text-white tracking-tight">
                        {s.value}
                      </span>
                      {s.suffix && (
                        <span className="font-['Fraunces'] text-base md:text-xl font-light text-yellow-300/90">
                          {s.suffix}
                        </span>
                      )}
                    </div>
                    <span className="mt-1 font-['Inter'] text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/50 font-medium">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tiny stars row */}
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-yellow-300 text-yellow-300" />
              ))}
              <span className="ml-2 text-[11px] text-white/60 font-['Inter'] tracking-wide">
                avaliado por centenas de famílias
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-xs font-['Inter'] tracking-[0.3em] uppercase"
      >
        Role para descobrir
      </motion.div>
    </section>
  );
}
