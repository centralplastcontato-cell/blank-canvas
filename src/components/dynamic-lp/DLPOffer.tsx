import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { LPOffer, LPTheme } from "@/types/landing-page";

interface DLPOfferProps {
  offer: LPOffer;
  theme: LPTheme;
  onCtaClick: () => void;
}

export function DLPOffer({ offer, theme, onCtaClick }: DLPOfferProps) {
  if (!offer.enabled) return null;

  const btnClass =
    theme.button_style === "pill"
      ? "rounded-full"
      : theme.button_style === "square"
      ? "rounded-none"
      : "rounded-xl";

  return (
    <section className="py-20" style={{ backgroundColor: theme.background_color }}>
      <div className="max-w-3xl mx-auto px-4">
        <motion.div
          className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-center border shadow-2xl"
          style={{ borderColor: theme.primary_color + "44" }}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          {/* Background gradient */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
            }}
          />

          <div className="relative z-10">
            <motion.div
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-6"
              style={{ backgroundColor: theme.secondary_color + "22", color: theme.secondary_color }}
              initial={{ scale: 0.8 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-bold" style={{ fontFamily: theme.font_body }}>
                Oferta Especial
              </span>
            </motion.div>

            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: theme.text_color, fontFamily: theme.font_heading }}
            >
              {offer.title}
            </h2>

            {offer.description && (
              <p
                className="text-base md:text-lg mb-4 opacity-80"
                style={{ color: theme.text_color, fontFamily: theme.font_body }}
              >
                {offer.description}
              </p>
            )}

            {offer.highlight_text && (
              <div
                className="inline-block px-6 py-3 rounded-xl mb-8 text-xl md:text-2xl font-bold"
                style={{
                  backgroundColor: theme.primary_color + "22",
                  color: theme.primary_color,
                  fontFamily: theme.font_heading,
                }}
              >
                {offer.highlight_text}
              </div>
            )}

            <div>
              <button
                onClick={onCtaClick}
                className={`px-8 py-4 text-lg font-bold shadow-xl hover:scale-105 transition-transform ${btnClass}`}
                style={{
                  backgroundColor: theme.secondary_color,
                  color: theme.text_color,
                  fontFamily: theme.font_body,
                }}
              >
                {offer.cta_text || "Aproveitar agora!"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
