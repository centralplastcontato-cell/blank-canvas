import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import heroMockup from "@/assets/hero-platform.png";

interface HubHeroProps {
  onOpenWizard: () => void;
}

export default function HubHero({ onOpenWizard }: HubHeroProps) {
  return (
    <section className="relative overflow-hidden bg-[hsl(225_35%_10%)]">

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-32 sm:pt-36 pb-24 sm:pb-24 relative z-10">
        {/* Centered copy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto"
        >

          <h1 className="font-display text-[3.1rem] leading-[0.98] sm:text-5xl lg:text-[3.75rem] font-bold text-white tracking-tight">
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

          <p className="mt-6 sm:mt-6 text-lg sm:text-xl text-white/70 leading-relaxed max-w-xl mx-auto">
            Enquanto sua concorrência demora horas para responder, seus leads recebem uma proposta personalizada em segundos — automático, 24h por dia.
          </p>

          <div className="mt-8 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="w-full sm:w-auto text-base sm:text-base px-8 sm:px-8 py-7 sm:py-6 rounded-full font-bold bg-white text-[hsl(225_35%_10%)] hover:bg-white/90 transition-all duration-300 hover:scale-[1.02] shadow-[0_8px_32px_rgba(255,255,255,0.12)]"
              onClick={onOpenWizard}
            >
              Agendar demonstração gratuita
              <ArrowRight className="ml-2 h-5 w-5 sm:h-5 sm:w-5" />
            </Button>
            <span className="text-sm text-white/45 sm:hidden">Sem compromisso · Setup em 48h</span>
          </div>
        </motion.div>

        {/* Video / Mockup — cinematic frame */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: "easeOut" }}
          className="mt-14 sm:mt-16 relative mx-auto max-w-4xl"
        >
          {/* Glow behind video */}
          <div className="absolute -inset-4 sm:-inset-8 rounded-3xl bg-gradient-to-b from-primary/10 via-transparent to-secondary/5 blur-2xl pointer-events-none" />

          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.6)]">
            <img
              src={heroMockup}
              alt="Dashboard da plataforma Celebrei"
              className="w-full h-auto"
              loading="eager"
            />
            {/* subtle top gradient so the mockup blends into the dark hero */}
            <div className="absolute inset-0 bg-gradient-to-b from-[hsl(225_35%_10%/0.15)] via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Floating metric pills */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3"
          >
            {[
              { value: "+40%", label: "conversões", color: "text-secondary" },
              { value: "5k+", label: "leads gerenciados", color: "text-accent" },
              { value: "24/7", label: "ativo", color: "text-primary" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2 bg-[hsl(225_30%_12%)] backdrop-blur-xl border border-white/[0.08] rounded-full px-4 sm:px-4 py-2.5 shadow-xl"
              >
                <span className={`font-display text-base sm:text-base font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-xs text-white/40 hidden sm:inline">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
