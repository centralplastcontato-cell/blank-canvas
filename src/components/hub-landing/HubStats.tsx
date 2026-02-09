import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Shield, Clock, TrendingUp, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "40%", label: "mais conversões", icon: TrendingUp, color: "text-accent" },
  { value: "24h", label: "atendimento ativo", icon: Clock, color: "text-primary" },
  { value: "3x", label: "mais agilidade", icon: Target, color: "text-secondary" },
  { value: "0", label: "leads perdidos", icon: Shield, color: "text-festive" },
];

const benefits = [
  "Atendimento 24h via WhatsApp automatizado",
  "Aumento médio de 40% na taxa de conversão",
  "Materiais de venda enviados automaticamente",
  "Relatórios e métricas em tempo real",
  "Onboarding guiado e suporte dedicado",
  "Integração completa com suas campanhas",
];

export default function HubStats() {
  const navigate = useNavigate();

  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
                  className="relative p-6 rounded-2xl bg-card border border-border/60 text-center group hover:shadow-card transition-all duration-300"
                >
                  <stat.icon className={`h-6 w-6 ${stat.color} mx-auto mb-3 group-hover:scale-110 transition-transform`} />
                  <p className={`font-display text-4xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-4 p-4 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center gap-2 text-muted-foreground text-sm"
            >
              <Shield className="h-4 w-4 text-accent" />
              Dados seguros com isolamento por empresa
            </motion.div>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Resultados</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight">
              Por que buffets escolhem a{" "}
              <span className="text-primary">Celebrei?</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
              Nossos clientes convertem mais enquanto reduzem o esforço manual de atendimento.
            </p>
            <div className="mt-8 space-y-3">
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
                  <span className="text-foreground text-sm">{benefit}</span>
                </motion.div>
              ))}
            </div>
            <Button
              className="mt-8 rounded-2xl px-8 py-6 font-bold text-base shadow-lg hover:shadow-floating transition-all hover:scale-[1.02]"
              onClick={() => navigate("/comercial-b2b")}
            >
              Falar com consultor
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
