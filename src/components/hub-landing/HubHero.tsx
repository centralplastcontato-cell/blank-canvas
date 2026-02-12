import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import heroMockup from "@/assets/hub-hero-mockup.jpg";

interface HubHeroProps {
  onOpenWizard: () => void;
}

export default function HubHero({ onOpenWizard }: HubHeroProps) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[hsl(225_35%_10%)]">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,hsl(215_85%_50%/0.15),transparent_70%)]"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,hsl(42_95%_55%/0.08),transparent_70%)]"
        />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16 sm:pt-32 sm:pb-24 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left - Copy */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm text-white/80 text-sm font-medium px-4 py-2 rounded-full mb-8 border border-white/10"
            >
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Plataforma #1 para buffets infantis
            </motion.div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight">
              Transforme leads em{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-secondary via-secondary to-festive bg-clip-text text-transparent">
                  festas fechadas
                </span>
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 1, duration: 0.6, ease: "easeOut" }}
                  className="absolute bottom-1 left-0 h-[3px] bg-gradient-to-r from-secondary to-festive rounded-full"
                />
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-white/60 leading-relaxed max-w-lg">
              CRM + WhatsApp automatizado que atende, qualifica e converte.{" "}
              <span className="text-white/80 font-medium">Sem aumentar sua equipe.</span>
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="text-base px-8 py-6 rounded-full font-bold shadow-lg bg-white text-[hsl(225_35%_10%)] hover:bg-white/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)]"
                onClick={onOpenWizard}
              >
                Agendar uma conversa
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-base px-8 py-6 rounded-full border border-white/20 text-white/80 hover:bg-white/5 hover:text-white"
                onClick={onOpenWizard}
              >
                <Play className="mr-2 h-4 w-4" />
                Ver demonstração
              </Button>
            </div>

            {/* Social proof - minimal */}
            <div className="mt-12 flex items-center gap-4 pt-8 border-t border-white/10">
              <div className="flex -space-x-2">
                {["C", "M", "B", "R"].map((letter, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-xs font-bold text-white/80"
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">Buffets conectados</p>
                <p className="text-xs text-white/40">Atendendo milhares de leads automaticamente</p>
              </div>
            </div>
          </motion.div>

          {/* Right - Hero image with premium frame */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]">
              <img
                src={heroMockup}
                alt="Dashboard da plataforma Celebrei"
                className="w-full h-auto"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(225_35%_10%/0.4)] to-transparent" />
            </div>

            {/* Floating metric cards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="absolute -bottom-5 -left-5 sm:-left-8 bg-[hsl(225_30%_14%)] backdrop-blur-xl rounded-xl border border-white/10 px-5 py-3 shadow-2xl"
            >
              <p className="text-2xl font-display font-bold text-secondary">+40%</p>
              <p className="text-xs text-white/50">conversões</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4, duration: 0.5 }}
              className="absolute -top-5 -right-5 sm:-right-8 bg-[hsl(225_30%_14%)] backdrop-blur-xl rounded-xl border border-white/10 px-5 py-3 shadow-2xl"
            >
              <p className="text-2xl font-display font-bold text-accent">24/7</p>
              <p className="text-xs text-white/50">atendimento</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade to light */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
