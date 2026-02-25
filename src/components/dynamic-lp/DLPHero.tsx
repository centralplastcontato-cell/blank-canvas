import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { LPHero, LPTheme } from "@/types/landing-page";

interface DLPHeroProps {
  hero: LPHero;
  theme: LPTheme;
  companyName: string;
  companyLogo: string | null;
  onCtaClick: () => void;
  multipleUnits?: boolean;
}

// Animated confetti particles
function ConfettiParticles({ color1, color2 }: { color1: string; color2: string }) {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 8,
      duration: 4 + Math.random() * 6,
      delay: Math.random() * 3,
      color: i % 3 === 0 ? color1 : i % 3 === 1 ? color2 : "#ffffff",
      shape: i % 4, // 0=circle 1=square 2=triangle 3=star
      opacity: 0.15 + Math.random() * 0.25,
    })), [color1, color2]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 0 ? "50%" : p.shape === 2 ? "0" : "2px",
            opacity: p.opacity,
            rotate: p.shape === 2 ? 45 : 0,
          }}
          animate={{
            y: [0, -40, 20, -20, 0],
            x: [0, 15, -10, 5, 0],
            rotate: [0, 180, 360],
            scale: [1, 1.3, 0.8, 1.1, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
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
    imgs[0].onload = () => { if (!cancelled) setImagesLoaded(true); };
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

  const renderCrossfade = (images: string[]) => (
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
      {/* More vibrant overlay with dual gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(160deg, ${theme.primary_color}cc 0%, ${theme.primary_color}88 40%, ${theme.secondary_color}66 70%, ${theme.background_color}ee 100%)`,
        }}
      />
    </>
  );

  const renderBackground = () => {
    if (hasMultipleImages) {
      return renderCrossfade(hero.background_images!);
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
              background: `linear-gradient(160deg, ${theme.primary_color}cc 0%, ${theme.primary_color}88 40%, ${theme.secondary_color}66 70%, ${theme.background_color}ee 100%)`,
            }}
          />
        </div>
      );
    }

    return (
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})` }}
      />
    );
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {renderBackground()}

      {/* Confetti particles */}
      <ConfettiParticles color1={theme.primary_color} color2={theme.secondary_color} />

      {/* Content with glassmorphism container */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          {/* Glassmorphism backdrop */}
          <div
            className="absolute inset-0 -inset-x-6 -inset-y-4 rounded-3xl"
            style={{
              background: `linear-gradient(135deg, ${theme.primary_color}18, ${theme.secondary_color}10)`,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: `1px solid ${theme.text_color}15`,
            }}
          />

          <div className="relative z-10">
            {companyLogo && (
              <motion.img
                src={companyLogo}
                alt={companyName}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-48 md:w-64 lg:w-80 mx-auto drop-shadow-2xl mb-6"
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
                className="text-lg md:text-2xl max-w-2xl mx-auto mt-4"
                style={{ color: theme.text_color + "ee", fontFamily: theme.font_body }}
              >
                {hero.subtitle}
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="pt-6 flex flex-col items-center gap-3"
            >
              <motion.button
                onClick={onCtaClick}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                animate={{ boxShadow: [`0 0 0 0 ${theme.secondary_color}00`, `0 0 0 12px ${theme.secondary_color}00`] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`px-8 py-4 text-lg md:text-xl font-bold shadow-xl ${btnClass}`}
                style={{
                  backgroundColor: theme.secondary_color,
                  color: theme.text_color,
                  fontFamily: theme.font_body,
                  boxShadow: `0 8px 30px ${theme.secondary_color}55`,
                }}
              >
                {hero.cta_text || "Quero fazer minha festa!"}
              </motion.button>

              {hero.secondary_cta_text && (
                <a
                  href={hero.secondary_cta_url || "#"}
                  onClick={(e) => {
                    if (!hero.secondary_cta_url) {
                      e.preventDefault();
                      onCtaClick();
                    }
                  }}
                  target={hero.secondary_cta_url ? "_blank" : undefined}
                  rel={hero.secondary_cta_url ? "noopener noreferrer" : undefined}
                  className={`inline-flex items-center gap-2 px-6 py-3 text-base md:text-lg font-semibold shadow-lg hover:scale-105 transition-transform ${btnClass}`}
                  style={{
                    backgroundColor: "#25D366",
                    color: "#ffffff",
                    fontFamily: theme.font_body,
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.636-.837-6.397-2.297l-.283-.236-2.937.985.985-2.937-.236-.283A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                  </svg>
                  {hero.secondary_cta_text}
                </a>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronDown className="w-8 h-8 drop-shadow-lg" style={{ color: theme.text_color + "88" }} />
        </motion.div>
      </motion.div>
    </section>
  );
}
