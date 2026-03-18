import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import heroMockup from "@/assets/hub-hero-mockup.jpg";

interface HubHeroProps {
  onOpenWizard: () => void;
  videoUrl?: string;
}

export default function HubHero({ onOpenWizard, videoUrl }: HubHeroProps) {
  return (
    <section className="relative overflow-hidden bg-[hsl(225_35%_10%)]">

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-16 sm:pb-24 relative z-10">
        {/* Centered copy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto"
        >

          <h1 className="font-display text-[2rem] leading-[1.1] sm:text-5xl lg:text-[3.5rem] font-bold text-white tracking-tight">
            Seu buffet perdendo festas
            <br className="hidden sm:block" />
            <span className="sm:mt-1 inline-block">
              por{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-secondary to-festive bg-clip-text text-transparent">
                  demora no atendimento?
                </span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.9, duration: 0.5, ease: "easeOut" }}
                  className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-secondary to-festive rounded-full origin-left"
                />
              </span>
            </span>
          </h1>

          <p className="mt-5 sm:mt-6 text-sm sm:text-lg text-white/50 leading-relaxed max-w-xl mx-auto">
            A Celebrei automatiza seu WhatsApp, organiza seus leads e fecha festas enquanto você dorme.
          </p>

          <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              className="w-full sm:w-auto text-sm sm:text-base px-7 sm:px-8 py-5 sm:py-6 rounded-full font-bold bg-white text-[hsl(225_35%_10%)] hover:bg-white/90 transition-all duration-300 hover:scale-[1.02] shadow-[0_8px_32px_rgba(255,255,255,0.12)]"
              onClick={onOpenWizard}
            >
              Agendar demonstração gratuita
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <span className="text-[11px] text-white/30 sm:hidden">Sem compromisso · Setup em 48h</span>
          </div>
        </motion.div>

        {/* Video / Mockup — cinematic frame */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: "easeOut" }}
          className="mt-12 sm:mt-16 relative mx-auto max-w-4xl"
        >
          {/* Glow behind video */}
          <div className="absolute -inset-4 sm:-inset-8 rounded-3xl bg-gradient-to-b from-primary/10 via-transparent to-secondary/5 blur-2xl pointer-events-none" />

          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.6)] bg-black/20">
            {/* Browser chrome bar */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.06]">
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="ml-3 flex-1 h-5 rounded-md bg-white/[0.04] max-w-[200px]" />
            </div>

            {videoUrl ? (
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={videoUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Demonstração Celebrei"
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={heroMockup}
                  alt="Dashboard da plataforma Celebrei"
                  className="w-full h-auto"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-6 py-3 sm:px-8 sm:py-4 text-white font-semibold text-sm sm:text-base shadow-[0_16px_48px_rgba(0,0,0,0.3)] hover:bg-white/15 transition-colors"
                    onClick={onOpenWizard}
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                      <Play className="h-4 w-4 sm:h-5 sm:w-5 text-[hsl(225_35%_10%)] ml-0.5" />
                    </div>
                    Assistir demonstração
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {/* Floating metric pills */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3"
          >
            {[
              { value: "+40%", label: "conversões", color: "text-secondary" },
              { value: "5k+", label: "leads gerenciados", color: "text-accent" },
              { value: "24/7", label: "ativo", color: "text-primary" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2 bg-[hsl(225_30%_12%)] backdrop-blur-xl border border-white/[0.08] rounded-full px-3 sm:px-4 py-2 shadow-xl"
              >
                <span className={`font-display text-sm sm:text-base font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-[10px] sm:text-xs text-white/40 hidden sm:inline">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
