import { motion } from "framer-motion";
import { Heart, Check, Star } from "lucide-react";
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

  const sectionTitle = offer.title || "Por que nos escolher?";
  const hasPromotion = !!offer.highlight_text;

  return (
    <section className="py-20 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, ${theme.primary_color}20, transparent 50%),
            radial-gradient(ellipse at 80% 50%, ${theme.secondary_color}20, transparent 50%),
            ${theme.background_color}
          `,
        }}
      />

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.span
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold mb-4 shadow-lg"
            style={{
              backgroundColor: theme.secondary_color,
              color: "#fff",
              fontFamily: theme.font_body,
              boxShadow: `0 4px 20px ${theme.secondary_color}44`,
            }}
          >
            <Heart className="w-4 h-4" />
            {hasPromotion ? "🔥 OFERTA ESPECIAL 🔥" : "FAÇA SUA FESTA"}
          </motion.span>
          <h2
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            {sectionTitle}
          </h2>
          {offer.description && (
            <p
              className="text-xl max-w-2xl mx-auto"
              style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}
            >
              {offer.description}
            </p>
          )}
        </motion.div>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Benefits Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative p-8 rounded-3xl overflow-hidden border-2 shadow-2xl"
            style={{
              backgroundColor: theme.primary_color + "10",
              borderColor: theme.primary_color + "30",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${theme.primary_color}15, transparent, ${theme.secondary_color}08)`,
              }}
            />
            <div
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl"
              style={{ backgroundColor: theme.secondary_color + "30" }}
            />
            <div
              className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-3xl"
              style={{ backgroundColor: theme.primary_color + "20" }}
            />

            <div className="relative z-10">
              <h3
                className="text-2xl font-bold mb-6 flex items-center gap-2"
                style={{ color: theme.text_color, fontFamily: theme.font_heading }}
              >
                <Star className="w-6 h-6" style={{ color: theme.secondary_color, fill: theme.secondary_color }} />
                O que está incluso
              </h3>
              <ul className="space-y-4">
                {(offer.benefits_list?.length ? offer.benefits_list : [
                  "Espaço completo e climatizado",
                  "Equipe de monitores profissionais",
                  "Buffet completo para crianças e adultos",
                  "Brinquedos e diversão garantida",
                ]).map((benefit, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
                      style={{ backgroundColor: theme.primary_color }}
                    >
                      <Check className="w-4 h-4" style={{ color: "#fff" }} />
                    </span>
                    <span
                      className="text-lg font-medium"
                      style={{ color: theme.text_color, fontFamily: theme.font_body }}
                    >
                      {benefit}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* CTA Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative p-8 rounded-3xl overflow-hidden border-2 shadow-xl"
            style={{
              backgroundColor: theme.secondary_color + "10",
              borderColor: theme.secondary_color + "30",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${theme.secondary_color}15, transparent, ${theme.primary_color}08)`,
              }}
            />
            <div
              className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl"
              style={{ backgroundColor: theme.secondary_color + "20" }}
            />
            <div
              className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full blur-3xl"
              style={{ backgroundColor: theme.primary_color + "20" }}
            />

            <div className="relative z-10 text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                  boxShadow: `0 8px 30px ${theme.primary_color}40`,
                }}
              >
                <Heart className="w-10 h-10" style={{ color: "#fff" }} />
              </motion.div>

              <h3
                className="text-2xl font-bold mb-4"
                style={{ color: theme.text_color, fontFamily: theme.font_heading }}
              >
                Garanta sua data!
              </h3>

              <p
                className="mb-6"
                style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}
              >
                As vagas são limitadas! Não perca essa oportunidade 🎉
              </p>

              <motion.button
                onClick={onCtaClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-full py-4 px-10 text-lg font-bold shadow-xl transition-all duration-300 ${btnClass}`}
                style={{
                  backgroundColor: theme.secondary_color,
                  color: "#fff",
                  fontFamily: theme.font_body,
                  boxShadow: `0 10px 35px ${theme.secondary_color}55`,
                }}
              >
                {offer.cta_text || "Quero fazer minha festa!"} 🎉
              </motion.button>

              {hasPromotion && (
                <div
                  className="mt-8 pt-6 border-t"
                  style={{ borderColor: theme.text_color + "15" }}
                >
                  <p
                    className="text-sm font-medium mb-2"
                    style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}
                  >
                    ⚡ Condição especial:
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{
                      color: theme.secondary_color,
                      fontFamily: theme.font_heading,
                    }}
                  >
                    {offer.highlight_text}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
