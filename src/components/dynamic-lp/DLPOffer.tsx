import { motion } from "framer-motion";
import { Gift } from "lucide-react";
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
    <section
      className="py-16 md:py-24"
      style={{
        background: `linear-gradient(to bottom, ${theme.primary_color}11, ${theme.background_color})`,
      }}
    >
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold mb-4 shadow-lg"
            style={{
              backgroundColor: theme.secondary_color,
              color: theme.text_color,
              fontFamily: theme.font_body,
            }}
          >
            <Gift className="w-4 h-4" />
            OFERTA ESPECIAL
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            {offer.title}
          </h2>
          {offer.description && (
            <p
              className="text-xl max-w-2xl mx-auto opacity-80"
              style={{ color: theme.text_color, fontFamily: theme.font_body }}
            >
              {offer.description}
            </p>
          )}
        </motion.div>

        {/* Glassmorphism CTA Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative p-8 md:p-12 rounded-3xl overflow-hidden border shadow-2xl text-center"
          style={{
            borderColor: theme.text_color + "15",
            backgroundColor: theme.text_color + "08",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: theme.secondary_color }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl opacity-15"
            style={{ backgroundColor: theme.primary_color }}
          />

          <div className="relative z-10">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
              }}
            >
              <Gift className="w-10 h-10" style={{ color: theme.text_color }} />
            </motion.div>

            <h3
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{ color: theme.text_color, fontFamily: theme.font_heading }}
            >
              Garanta sua data!
            </h3>

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
                className={`px-10 py-4 text-lg md:text-xl font-bold shadow-xl hover:scale-105 transition-transform ${btnClass}`}
                style={{
                  backgroundColor: theme.secondary_color,
                  color: theme.text_color,
                  fontFamily: theme.font_body,
                }}
              >
                {offer.cta_text || "Aproveitar agora!"} 🎁
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
