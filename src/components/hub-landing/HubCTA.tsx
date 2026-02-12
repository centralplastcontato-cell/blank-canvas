import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface HubCTAProps {
  onOpenWizard: () => void;
}

export default function HubCTA({ onOpenWizard }: HubCTAProps) {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
          Pronto para transformar
          <br />
          <span className="text-primary">seu buffet?</span>
        </h2>
        <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Junte-se aos buffets que já automatizaram seu atendimento e estão fechando mais festas todos os meses.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            className="text-base px-10 py-6 rounded-2xl font-bold shadow-lg hover:shadow-floating transition-all hover:scale-[1.02]"
            onClick={onOpenWizard}
          >
            Agendar uma conversa
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Sem compromisso · Setup em 48h · Suporte dedicado
        </p>
      </motion.div>
    </section>
  );
}
