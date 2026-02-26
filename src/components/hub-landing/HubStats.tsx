import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, TrendingUp, Clock, Target, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "+40%", label: "mais conversões", icon: TrendingUp },
  { value: "24h", label: "atendimento ativo", icon: Clock },
  { value: "3x", label: "mais agilidade", icon: Target },
  { value: "Zero", label: "leads perdidos", icon: Shield },
];

const benefits = [
  "Atendimento 24h via WhatsApp automatizado",
  "Aumento médio de 40% na taxa de conversão",
  "Materiais de venda enviados automaticamente",
  "Relatórios e métricas em tempo real",
  "Onboarding guiado e suporte dedicado",
  "Integração completa com suas campanhas",
];

export default function HubStats({ onOpenWizard }: { onOpenWizard: () => void }) {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      {/* Dark section */}
      <div className="absolute inset-0 bg-[hsl(225_35%_10%)]" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="relative p-4 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 text-center group hover:bg-white/8 transition-all duration-300"
                >
                  <stat.icon className="h-5 w-5 text-white/40 mx-auto mb-3 group-hover:text-secondary transition-colors" />
                  <p className="font-display text-3xl sm:text-4xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-white/40 mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-xs font-semibold text-secondary uppercase tracking-[0.2em] mb-4">Resultados</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
              Por que buffets escolhem a Celebrei?
            </h2>
            <p className="mt-4 text-white/50 text-lg leading-relaxed">
              Nossos clientes convertem mais enquanto reduzem o esforço manual de atendimento.
            </p>
            <div className="mt-8 space-y-4">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-white/70 text-sm">{benefit}</span>
                </motion.div>
              ))}
            </div>
            <Button
              className="mt-10 rounded-full px-8 py-6 font-bold text-base bg-white text-[hsl(225_35%_10%)] hover:bg-white/90 transition-all hover:scale-[1.02] shadow-[0_20px_40px_-10px_rgba(255,255,255,0.15)]"
              onClick={onOpenWizard}
            >
              Agendar conversa
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
