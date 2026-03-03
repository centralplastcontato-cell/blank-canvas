import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { campaignConfig } from "@/config/campaignConfig";
import fachada1 from "@/assets/fachada-unidade-1.jpg";
import fachada2 from "@/assets/fachada-unidade-2.jpg";
import logoCastelo from "@/assets/logo-castelo.png";

interface HeroSectionProps {
  onCtaClick: () => void;
}

export function HeroSection({ onCtaClick }: HeroSectionProps) {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImage((prev) => (prev === 0 ? 1 : 0));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const images = [fachada1, fachada2];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" aria-label="Seção principal">
      {/* Background - Desktop: split side-by-side | Mobile: crossfade */}
      <div className="absolute inset-0">
        <div className="hidden md:flex absolute inset-0">
          <div className="w-1/2 h-full">
            <img src={fachada1} alt="Fachada Unidade 1 - Castelo da Diversão" className="w-full h-full object-cover" loading="eager" fetchPriority="high" />
          </div>
          <div className="w-1/2 h-full">
            <img src={fachada2} alt="Fachada Unidade 2 - Castelo da Diversão" className="w-full h-full object-cover" loading="eager" />
          </div>
        </div>
        <div className="md:hidden absolute inset-0">
          {images.map((src, i) => (
            <motion.img
              key={i}
              src={src}
              alt={`Fachada Unidade ${i + 1} - Castelo da Diversão`}
              className="absolute inset-0 w-full h-full object-cover"
              animate={{ opacity: activeImage === i ? 1 : 0 }}
              transition={{ duration: 1 }}
              loading="eager"
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-castle/40 to-background/90" />
      </div>

      {/* Floating Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              background: ['hsl(210 90% 50%)', 'hsl(45 95% 55%)', 'hsl(145 70% 40%)', 'hsl(25 95% 55%)', 'hsl(5 85% 55%)'][i % 5],
              left: `${Math.random() * 100}%`,
              top: `-5%`,
            }}
            animate={{ y: ['0vh', '110vh'], rotate: [0, 720], opacity: [1, 0] }}
            transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5, ease: "linear" }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 section-container text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          {/* Logo */}
          <motion.img
            src={logoCastelo}
            alt="Castelo da Diversão"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-48 md:w-64 lg:w-80 mx-auto drop-shadow-lg"
          />

          {/* Tag */}
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="inline-block bg-secondary text-secondary-foreground px-6 py-2 rounded-full text-lg font-bold shadow-card"
          >
            {campaignConfig.tagline}
          </motion.span>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-lg md:text-2xl text-white/90 max-w-3xl mx-auto font-medium drop-shadow-md"
          >
            {campaignConfig.subtitle}
          </motion.p>

          {/* Bonus Highlight Block - Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="relative inline-block overflow-hidden rounded-3xl p-6 md:p-8 mt-4 border border-white/30 shadow-floating backdrop-blur-xl bg-white/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/10 pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-secondary/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-primary/15 rounded-full blur-2xl" />
            
            <div className="relative z-10">
              <p className="text-base md:text-lg font-bold text-foreground mb-4">
                Bônus exclusivos para os 10 primeiros:
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center gap-3 bg-primary/10 rounded-xl px-4 py-3 border border-primary/20">
                  <span className="text-2xl md:text-3xl">🎁</span>
                  <span className="text-base md:text-xl font-bold text-primary">Decoração completa</span>
                </div>
                <div className="flex items-center justify-center gap-3 bg-secondary/20 rounded-xl px-4 py-3 border border-secondary/30">
                  <span className="text-2xl md:text-3xl">🍬</span>
                  <span className="text-base md:text-xl font-bold text-secondary-foreground">Docinhos para mesa de decoração</span>
                </div>
                <div className="flex items-center justify-center gap-3 bg-accent/20 rounded-xl px-4 py-3 border border-accent/30">
                  <span className="text-2xl md:text-3xl">🪑</span>
                  <span className="text-base md:text-xl font-bold text-accent-foreground">Toalhas para as mesas dos convidados</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Emotional text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="text-base md:text-lg text-white/80 max-w-2xl mx-auto italic"
          >
            Uma festa completa para comemorar um dos dias mais importantes e divertidos da vida do seu pequeno ❤️
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="pt-4"
          >
            <button
              onClick={onCtaClick}
              className="btn-cta text-xl md:text-2xl animate-bounce-gentle"
            >
              📅 Consultar datas disponíveis
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-8 h-12 rounded-full border-2 border-primary-foreground/50 flex items-start justify-center p-2"
          >
            <div className="w-2 h-3 bg-primary-foreground/50 rounded-full" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
