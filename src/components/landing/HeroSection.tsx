import { motion } from "framer-motion";
import { Star, Heart, PartyPopper } from "lucide-react";
import fachada1 from "@/assets/fachada-unidade-2.jpg";
import logoCastelo from "@/assets/logo-castelo.png";

interface HeroSectionProps {
  onCtaClick: () => void;
}

const socialProofItems = [
  { icon: Star, label: "4.9 no Google", color: "text-secondary" },
  { icon: PartyPopper, label: "+4.000 festas realizadas", color: "text-primary" },
  { icon: Heart, label: "9 anos de história", color: "text-castle" },
];

export function HeroSection({ onCtaClick }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" aria-label="Seção principal">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={fachada1} alt="Fachada Castelo da Diversão - Unidade Trujillo" className="w-full h-full object-cover" loading="eager" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-foreground/50 to-background/95" />
      </div>

      {/* Content */}
      <div className="relative z-10 section-container text-center py-16 md:py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6 max-w-4xl mx-auto"
        >
          {/* Premium Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex justify-center"
          >
            <div className="relative inline-flex items-center gap-2.5 bg-gradient-to-r from-purple-500 via-pink-400 to-yellow-400 text-white px-6 py-3 rounded-full text-xs md:text-sm font-extrabold shadow-xl tracking-wide uppercase">
              <span className="text-base">✨</span>
              9 anos · +4.000 festas realizadas
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 via-pink-400/30 to-yellow-400/30 blur-lg -z-10" />
            </div>
          </motion.div>

          {/* Logo */}
          <motion.img
            src={logoCastelo}
            alt="Castelo da Diversão"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-40 md:w-56 lg:w-64 mx-auto drop-shadow-lg"
          />

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-primary-foreground leading-tight drop-shadow-md"
          >
            A festa que seu filho{" "}
            <span className="text-secondary">vai lembrar pra sempre</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-base sm:text-lg md:text-xl text-primary-foreground/85 max-w-3xl mx-auto font-medium"
          >
            Agende uma visita de 15 minutos e descubra por que mais de 4.000 famílias escolheram o Castelo da Diversão em Sorocaba.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="pt-4 flex flex-col items-center gap-3"
          >
            <button
              onClick={onCtaClick}
              className="btn-cta text-lg sm:text-xl md:text-2xl animate-bounce-gentle shadow-floating"
            >
              📅 AGENDAR VISITA DE 15 MIN
            </button>
          </motion.div>

          {/* Social Proof Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-3 md:gap-5 pt-2"
          >
            {socialProofItems.map((item, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 bg-card/60 backdrop-blur-md border border-border/30 rounded-full px-4 py-2 text-sm font-semibold text-foreground shadow-sm"
              >
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span>{item.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
