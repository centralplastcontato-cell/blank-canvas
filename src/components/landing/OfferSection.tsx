import { motion } from "framer-motion";
import { Check, Gift, Star, Sparkles } from "lucide-react";
import { campaignConfig } from "@/config/campaignConfig";

interface OfferSectionProps {
  onCtaClick: () => void;
}

export function OfferSection({ onCtaClick }: OfferSectionProps) {
  return (
    <section id="offer" className="py-20 bg-gradient-confetti confetti-bg">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 bg-festive text-festive-foreground px-4 py-2 rounded-full text-sm font-bold mb-4">
            <Gift className="w-4 h-4" />
            MÊS DO CONSUMIDOR
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            {campaignConfig.offer.headline}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {campaignConfig.offer.description}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Benefits Card - Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative p-8 rounded-3xl overflow-hidden border border-white/30 shadow-2xl backdrop-blur-xl bg-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h3 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
                <Star className="w-6 h-6 text-secondary fill-secondary" />
                Bônus exclusivos
              </h3>
              <ul className="space-y-4">
                {campaignConfig.offer.benefits.map((benefit, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <span className="flex-shrink-0 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-md">
                      <Check className="w-4 h-4 text-accent-foreground" />
                    </span>
                    <span className="text-lg text-foreground font-medium">{benefit}</span>
                  </motion.li>
                ))}
              </ul>
              <p className="mt-6 text-muted-foreground text-sm">
                Tudo isso sem custo adicional.
              </p>
            </div>
          </motion.div>

          {/* CTA Card with Scarcity Counter */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative p-8 rounded-3xl overflow-hidden border border-white/30 shadow-xl backdrop-blur-xl bg-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10" />
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-festive/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-secondary/20 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="text-center">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-20 h-20 bg-gradient-to-br from-festive to-castle rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                >
                  <Gift className="w-10 h-10 text-festive-foreground" />
                </motion.div>
                
                {/* Scarcity Counter */}
                <motion.div
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="bg-accent/20 border border-accent/40 rounded-2xl px-6 py-4 mb-6"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Sparkles className="w-5 h-5 text-accent-foreground" />
                    <span className="text-sm font-medium text-accent-foreground">Vagas limitadas</span>
                  </div>
                  <p className="text-3xl font-display font-bold text-accent-foreground">
                    Apenas {campaignConfig.urgency.spotsLeft} bônus
                  </p>
                  <p className="text-sm text-accent-foreground/80">disponíveis</p>
                </motion.div>
                
                <button onClick={onCtaClick} className="btn-cta w-full">
                  Garantir minha festa 🎁
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-foreground/10">
                <p className="text-sm text-muted-foreground font-medium mb-3">Condições:</p>
                <ul className="space-y-2">
                  {campaignConfig.offer.conditions.map((condition, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-festive">•</span>
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
