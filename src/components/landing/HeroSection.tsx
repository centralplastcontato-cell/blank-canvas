import { motion } from "framer-motion";
import { campaignConfig } from "@/config/campaignConfig";
import heroBg from "@/assets/hero-bg.jpg";
import logoCastelo from "@/assets/logo-castelo.png";

interface HeroSectionProps {
  onCtaClick: () => void;
}

export function HeroSection({ onCtaClick }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" aria-label="Seção principal">
      {/* Background Image - using img for better SEO and lazy loading */}
      <div className="absolute inset-0">
        <img 
          src={heroBg}
          alt="Espaço de festas do Castelo da Diversão"
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-castle/40 to-background/90" />
      </div>

      {/* Floating Confetti Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              background: ['hsl(210 90% 50%)', 'hsl(45 95% 55%)', 'hsl(145 70% 40%)', 'hsl(25 95% 55%)', 'hsl(5 85% 55%)'][i % 5],
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

      {/* Content */}
      <div className="relative z-10 section-container text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          {/* Logo */}
          <motion.img
            src={logoCastelo}
            alt="Castelo da Diversão"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-48 md:w-64 lg:w-80 mx-auto drop-shadow-lg"
          />

          {/* Tag */}
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="inline-block bg-secondary text-secondary-foreground px-6 py-2 rounded-full text-lg font-bold shadow-card"
          >
            {campaignConfig.tagline}
          </motion.span>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-5xl md:text-7xl lg:text-8xl font-display font-bold bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg [text-shadow:_2px_2px_20px_rgba(255,200,100,0.4)]"
          >
            {campaignConfig.title}
          </motion.h1>

          {/* Offer Preview - Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="relative inline-block overflow-hidden rounded-3xl p-6 md:p-8 mt-8 border border-white/30 shadow-floating backdrop-blur-xl bg-white/20"
          >
            {/* Subtle gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/10 pointer-events-none" />
            
            {/* Decorative blur circles */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-secondary/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-primary/15 rounded-full blur-2xl" />
            
            <div className="relative z-10">
              <p className="text-base md:text-xl font-bold text-foreground mb-3 md:mb-4">
                {campaignConfig.offer.headline}
              </p>
              <div className="flex flex-col gap-2 md:gap-3">
                {/* Benefit 1 - 10% discount */}
                <div className="flex items-center justify-center gap-2 md:gap-3 bg-primary/10 rounded-xl px-3 md:px-4 py-2 md:py-3 border border-primary/20">
                  <span className="text-xl md:text-3xl">✨</span>
                  <span className="text-base md:text-2xl font-bold text-primary whitespace-nowrap">
                    10% de desconto à vista
                  </span>
                </div>
                {/* Benefit 2 - 10 guests */}
                <div className="flex items-center justify-center gap-2 md:gap-3 bg-secondary/20 rounded-xl px-3 md:px-4 py-2 md:py-3 border border-secondary/30">
                  <span className="text-xl md:text-3xl">🎁</span>
                  <span className="text-base md:text-2xl font-bold text-secondary-foreground whitespace-nowrap">
                    + 10 convidados grátis
                  </span>
                </div>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-3 md:mt-4 text-center">
                Válido até {campaignConfig.offer.validUntil}
              </p>
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="pt-6"
          >
            <button
              onClick={onCtaClick}
              className="btn-cta text-xl md:text-2xl animate-bounce-gentle"
            >
              🎉 Quero Garantir Minha Data
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-8 h-12 rounded-full border-2 border-primary-foreground/50 flex items-start justify-center p-2"
          >
            <div className="w-2 h-3 bg-primary-foreground/50 rounded-full" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
