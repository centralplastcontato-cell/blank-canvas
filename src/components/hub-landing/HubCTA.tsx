import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface HubCTAProps {
  onOpenWizard: () => void;
}

export default function HubCTA({ onOpenWizard }: HubCTAProps) {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10"
      >
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
          Pronto para transformar
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            seu buffet?
          </span>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Junte-se aos buffets que já automatizaram seu atendimento e estão fechando mais festas todos os meses.
        </p>
        <div className="mt-10">
          <Button
            size="lg"
            className="text-base px-10 py-6 rounded-full font-bold shadow-floating transition-all hover:scale-[1.02]"
            onClick={onOpenWizard}
          >
            Agendar uma conversa
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
        <p className="mt-5 text-xs text-muted-foreground tracking-wide">
          Sem compromisso · Setup em 48h · Suporte dedicado
        </p>
      </motion.div>
    </section>
  );
}
