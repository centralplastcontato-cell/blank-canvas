import { motion } from "framer-motion";
import type { LPHero, LPTheme } from "@/types/landing-page";

interface DLPHeroProps {
  hero: LPHero;
  theme: LPTheme;
  companyName: string;
  companyLogo: string | null;
  onCtaClick: () => void;
}

export function DLPHero({ hero, theme, companyName, companyLogo, onCtaClick }: DLPHeroProps) {
  const btnClass =
    theme.button_style === "pill"
      ? "rounded-full"
      : theme.button_style === "square"
      ? "rounded-none"
      : "rounded-xl";

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {hero.background_image_url && (
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
      )}

      {!hero.background_image_url && (
        <div
          className="absolute inset-0"
          style={{ background: theme.primary_color }}
        />
      )}

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
              className="w-48 md:w-64 mx-auto drop-shadow-lg"
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
