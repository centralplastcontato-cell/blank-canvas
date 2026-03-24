import { motion } from "framer-motion";
import { Star, Heart, PartyPopper } from "lucide-react";
import fachada1 from "@/assets/fachada-unidade-1.jpg";
import logoCastelo from "@/assets/logo-castelo.png";

interface HeroSectionProps {
  onCtaClick: () => void;
}

const socialProofItems = [
  { icon: Star, label: "4.9 no Google", color: "text-secondary" },
  { icon: PartyPopper, label: "+5000 festas realizadas", color: "text-primary" },
  { icon: Heart, label: "98% de satisfação", color: "text-castle" },
];

export function HeroSection({ onCtaClick }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" aria-label="Seção principal">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={fachada1} alt="Fachada Castelo da Diversão - Unidade Trujillo" className="w-full h-full object-cover" loading="eager" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-foreground/50 to-background/95" />
      </div>

      {/* Floating Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full"
            style={{
              background: ['hsl(215 85% 50%)', 'hsl(42 95% 55%)', 'hsl(155 75% 38%)', 'hsl(15 90% 58%)', 'hsl(350 80% 55%)'][i % 5],
              left: `${Math.random() * 100}%`,
              top: `-5%`,
            }}
            animate={{ y: ['0vh', '110vh'], rotate: [0, 720], opacity: [0.8, 0] }}
            transition={{ duration: 5 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 6, ease: "linear" }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 section-container text-center py-16 md:py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6 max-w-4xl mx-auto"
        >
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
            O lugar perfeito para a{" "}
            <span className="text-secondary">festa do seu filho</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-base sm:text-lg md:text-xl text-primary-foreground/85 max-w-3xl mx-auto font-medium"
          >
            Buffet infantil especializado em festas inesquecíveis. Brinquedos incríveis, cardápio delicioso e uma equipe preparada para cuidar de cada detalhe.
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
              📅 CONSULTAR DATAS DISPONÍVEIS
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
