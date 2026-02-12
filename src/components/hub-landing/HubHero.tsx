import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import heroMockup from "@/assets/hub-hero-mockup.jpg";
import logoCelebrei2 from "@/assets/logo-celebrei-2.png";

interface HubHeroProps {
  onOpenWizard: () => void;
}

export default function HubHero({ onOpenWizard }: HubHeroProps) {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden pt-20 pb-10 sm:pt-32 sm:pb-20">
      {/* Animated background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-secondary/10 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <motion.img
              src={logoCelebrei2}
              alt="Hub Celebrei"
              className="h-20 sm:h-24 w-auto mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-primary/20"
            >
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Plataforma #1 para buffets infantis
            </motion.div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-foreground leading-[1.1] tracking-tight">
              Cada lead é uma{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-primary">festa esperando</span>
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                  className="absolute bottom-1 left-0 h-3 bg-secondary/30 rounded-full -z-0"
                />
              </span>{" "}
              para acontecer
            </h1>

            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
              CRM + WhatsApp automatizado que atende, qualifica e converte leads em festas fechadas.{" "}
              <span className="text-foreground font-medium">Sem aumentar sua equipe.</span>
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="text-base px-8 py-6 rounded-2xl font-bold shadow-lg hover:shadow-floating transition-all duration-300 hover:scale-[1.02]"
                onClick={onOpenWizard}
              >
                Diagnóstico gratuito
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 py-6 rounded-2xl border-2"
                onClick={onOpenWizard}
              >
                Quero saber mais
              </Button>
            </div>

            {/* Social proof */}
            <div className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-3">
                {[
                  "bg-primary",
                  "bg-secondary",
                  "bg-accent",
                  "bg-festive",
                ].map((bg, i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-full ${bg} border-2 border-background flex items-center justify-center text-xs font-bold text-primary-foreground`}
                  >
                    {["C", "M", "B", "R"][i]}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Buffets já conectados</p>
                <p className="text-xs text-muted-foreground">Atendendo milhares de leads automaticamente</p>
              </div>
            </div>
          </motion.div>

          {/* Right - Hero image */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-floating border border-border/60">
              <img
                src={heroMockup}
                alt="Dashboard da plataforma Celebrei com CRM, WhatsApp e analytics"
                className="w-full h-auto"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
            </div>
            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="absolute -bottom-4 -left-4 sm:-left-6 bg-card rounded-2xl shadow-card border border-border/60 px-5 py-3"
            >
              <p className="text-2xl font-display font-bold text-accent">+40%</p>
              <p className="text-xs text-muted-foreground">conversões</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="absolute -top-4 -right-4 sm:-right-6 bg-card rounded-2xl shadow-card border border-border/60 px-5 py-3"
            >
              <p className="text-2xl font-display font-bold text-primary">24/7</p>
              <p className="text-xs text-muted-foreground">atendimento</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
