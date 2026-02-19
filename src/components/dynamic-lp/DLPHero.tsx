import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LPHero, LPTheme } from "@/types/landing-page";

interface DLPHeroProps {
  hero: LPHero;
  theme: LPTheme;
  companyName: string;
  companyLogo: string | null;
  onCtaClick: () => void;
}

export function DLPHero({ hero, theme, companyName, companyLogo, onCtaClick }: DLPHeroProps) {
  const [activeImage, setActiveImage] = useState(0);
  const hasMultipleImages = hero.background_images && hero.background_images.length >= 2;

  useEffect(() => {
    if (!hasMultipleImages) return;
    const interval = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % hero.background_images!.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [hasMultipleImages, hero.background_images]);

  const btnClass =
    theme.button_style === "pill"
      ? "rounded-full"
      : theme.button_style === "square"
      ? "rounded-none"
      : "rounded-xl";

  const confettiColors = [
    theme.primary_color,
    theme.secondary_color,
    '#facc15',
    '#22c55e',
    '#ef4444',
  ];

  const renderBackground = () => {
    if (hasMultipleImages) {
      const images = hero.background_images!;
      return (
        <>
          {/* Desktop: split 50/50 */}
          <div className="absolute inset-0 hidden md:flex">
            {images.slice(0, 2).map((src, i) => (
              <div key={i} className="w-1/2 h-full">
                <img
                  src={src}
                  alt={`${companyName} unidade ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            ))}
          </div>

          {/* Mobile: crossfade */}
          <div className="absolute inset-0 md:hidden">
            <AnimatePresence initial={false}>
              {images.map((src, i) => (
                <motion.img
                  key={src}
                  src={src}
                  alt={`${companyName} unidade ${i + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: activeImage === i ? 1 : 0 }}
                  transition={{ duration: 1 }}
                  loading="eager"
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, ${theme.primary_color}99, ${theme.background_color}ee)`,
            }}
          />
        </>
      );
    }

    if (hero.background_image_url) {
      return (
        <div className="absolute inset-0">
          <img
            src={hero.background_image_url}
            alt={`Espaço ${companyName}`}
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, ${theme.primary_color}99, ${theme.background_color}ee)`,
            }}
          />
        </div>
      );
    }

    return (
      <div
        className="absolute inset-0"
        style={{ background: theme.primary_color }}
      />
    );
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {renderBackground()}

      {/* Floating Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              background: confettiColors[i % confettiColors.length],
              left: `${Math.random() * 100}%`,
              top: `-5%`,
            }}
            animate={{
              y: ['0vh', '110vh'],
              rotate: [0, 720],
              opacity: [1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          {companyLogo && (
            <motion.img
              src={companyLogo}
              alt={companyName}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-48 md:w-64 lg:w-80 mx-auto drop-shadow-lg"
            />
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold drop-shadow-lg"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            {hero.title || companyName}
          </motion.h1>

          {hero.subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-lg md:text-2xl max-w-2xl mx-auto opacity-90"
              style={{ color: theme.text_color, fontFamily: theme.font_body }}
            >
              {hero.subtitle}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="pt-6"
          >
            <button
              onClick={onCtaClick}
              className={`px-8 py-4 text-lg md:text-xl font-bold shadow-xl hover:scale-105 transition-transform ${btnClass}`}
              style={{
                backgroundColor: theme.secondary_color,
                color: theme.text_color,
                fontFamily: theme.font_body,
              }}
            >
              {hero.cta_text || "Quero fazer minha festa!"}
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-8 h-12 rounded-full border-2 flex items-start justify-center p-2"
          style={{ borderColor: theme.text_color + "80" }}
        >
          <div
            className="w-2 h-3 rounded-full"
            style={{ backgroundColor: theme.text_color + "80" }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
