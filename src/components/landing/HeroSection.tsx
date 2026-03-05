import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Gift, Cake, UtensilsCrossed, Star, Heart, PartyPopper, AlertTriangle } from "lucide-react";
import fachada1 from "@/assets/fachada-unidade-1.jpg";
import fachada2 from "@/assets/fachada-unidade-2.jpg";
import logoCastelo from "@/assets/logo-castelo.png";

interface HeroSectionProps {
  onCtaClick: () => void;
}

const bonusCards = [
  {
    icon: Sparkles,
    title: "Decoração temática encantadora",
    description: "Escolha entre mais de 30 temas incríveis para transformar a festa em um momento mágico.",
    gradient: "from-primary/15 to-primary/5",
    border: "border-primary/25",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
  },
  {
    icon: Cake,
    title: "120 Docinhos decorativos",
    description: "Mesa de doces completa com 120 docinhos para encantar seus convidados.",
    gradient: "from-secondary/20 to-secondary/5",
    border: "border-secondary/30",
    iconBg: "bg-secondary/20",
    iconColor: "text-secondary-foreground",
  },
  {
    icon: UtensilsCrossed,
    title: "Toalhas para as mesas dos convidados",
    description: "Mais conforto e elegância para receber seus convidados.",
    gradient: "from-accent/15 to-accent/5",
    border: "border-accent/25",
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
  },
];

const socialProofItems = [
  { icon: Star, label: "4.9 no Google", color: "text-secondary" },
  { icon: PartyPopper, label: "+5000 festas realizadas", color: "text-primary" },
  { icon: Heart, label: "98% de satisfação", color: "text-castle" },
];

export function HeroSection({ onCtaClick }: HeroSectionProps) {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImage((prev) => (prev === 0 ? 1 : 0));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const images = [fachada1, fachada2];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" aria-label="Seção principal">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="hidden md:flex absolute inset-0">
          <div className="w-1/2 h-full">
            <img src={fachada1} alt="Fachada Unidade 1 - Castelo da Diversão" className="w-full h-full object-cover" loading="eager" fetchPriority="high" />
          </div>
          <div className="w-1/2 h-full">
            <img src={fachada2} alt="Fachada Unidade 2 - Castelo da Diversão" className="w-full h-full object-cover" loading="eager" />
          </div>
        </div>
        <div className="md:hidden absolute inset-0">
          {images.map((src, i) => (
            <motion.img
              key={i}
              src={src}
              alt={`Fachada Unidade ${i + 1} - Castelo da Diversão`}
              className="absolute inset-0 w-full h-full object-cover"
              animate={{ opacity: activeImage === i ? 1 : 0 }}
              transition={{ duration: 1 }}
              loading="eager"
            />
          ))}
        </div>
        {/* Dark overlay for readability */}
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
            🎉 Feche sua festa no Castelo da Diversão e ganhe{" "}
            <span className="text-secondary">bônus exclusivos</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-base sm:text-lg md:text-xl text-primary-foreground/85 max-w-3xl mx-auto font-medium"
          >
            Somente no mês do consumidor os 10 primeiros contratos ganham bônus especiais para deixar a festa ainda mais completa.
          </motion.p>

          {/* Bonus Cards Block */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-6"
          >
            {/* Bonus Title */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-secondary" />
              <h2 className="text-lg md:text-xl font-bold text-primary-foreground">
                Bônus exclusivos para os 10 primeiros contratos
              </h2>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {bonusCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                  className={`relative rounded-2xl border ${card.border} bg-gradient-to-br ${card.gradient} backdrop-blur-xl bg-card/80 p-5 text-left shadow-card hover:shadow-card-hover transition-all duration-300`}
                >
                  <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
                    <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Perceived Value */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              className="mt-4 inline-flex flex-col items-center gap-1 bg-secondary/20 backdrop-blur-md border border-secondary/30 rounded-xl px-6 py-3"
            >
              <span className="text-lg md:text-xl font-extrabold text-secondary-foreground">
                🎁 Bônus exclusivos para você!
              </span>
              <span className="text-sm text-primary-foreground/80 font-medium">
                Garanta vantagens especiais ao fechar sua festa agora.
              </span>
            </motion.div>
          </motion.div>

          {/* Scarcity Badge + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.5 }}
            className="pt-4 flex flex-col items-center gap-3"
          >
            {/* Scarcity Badge */}
            <div className="inline-flex items-center gap-2 bg-castle/15 border border-castle/30 backdrop-blur-md text-castle-foreground px-4 py-2 rounded-full text-sm font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4 text-castle" />
              <span className="text-castle">Apenas 10 bônus disponíveis</span>
            </div>

            {/* CTA Button */}
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
            transition={{ delay: 1.5, duration: 0.5 }}
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
