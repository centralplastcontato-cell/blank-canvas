import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LPHero, LPTheme } from "@/types/landing-page";

interface DLPHeroProps {
  hero: LPHero;
  theme: LPTheme;
  companyName: string;
  companyLogo: string | null;
  onCtaClick: () => void;
  multipleUnits?: boolean;
}

export function DLPHero({ hero, theme, companyName, companyLogo, onCtaClick, multipleUnits }: DLPHeroProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const hasMultipleImages = hero.background_images && hero.background_images.length >= 2;

  // Preload all background images before starting crossfade
  useEffect(() => {
    if (!hasMultipleImages) return;
    let cancelled = false;
    const imgs = hero.background_images!.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
    // Wait for at least the first image, then mark loaded
    imgs[0].onload = () => { if (!cancelled) setImagesLoaded(true); };
    // Fallback: mark loaded after 2s even if slow
    const timeout = setTimeout(() => { if (!cancelled) setImagesLoaded(true); }, 2000);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [hasMultipleImages, hero.background_images]);

  useEffect(() => {
    if (!hasMultipleImages || !imagesLoaded) return;
    const interval = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % hero.background_images!.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [hasMultipleImages, hero.background_images, imagesLoaded]);

  const btnClass =
    theme.button_style === "pill"
      ? "rounded-full"
      : theme.button_style === "square"
      ? "rounded-none"
      : "rounded-xl";




  const renderBackground = () => {
    if (hasMultipleImages) {
      const images = hero.background_images!;

      // Single unit: full-width crossfade on all screens
      if (!multipleUnits) {
        return (
          <>
            <div className="absolute inset-0">
              <AnimatePresence initial={false}>
                {images.map((src, i) => (
                  <motion.img
                    key={src}
                    src={src}
                    alt={`${companyName} - Foto ${i + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: activeImage === i ? 1 : 0 }}
                    transition={{ duration: 1 }}
                    loading="eager"
                    fetchPriority={i === 0 ? "high" : undefined}
                  />
                ))}
              </AnimatePresence>
            </div>
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, ${theme.primary_color}99, ${theme.background_color}ee)`,
              }}
            />
          </>
        );
      }

      // Multiple units: split 50/50 desktop + crossfade mobile
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



    </section>
  );
}
