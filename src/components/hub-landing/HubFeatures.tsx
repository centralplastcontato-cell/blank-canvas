import { Bot, BarChart3, Brain, Send } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Bot,
    title: "Bot de WhatsApp 24/7",
    description: "Atende, qualifica e coleta dados do lead automaticamente. Envia materiais de venda sem intervenção humana.",
    gradient: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
  {
    icon: BarChart3,
    title: "CRM com Kanban Visual",
    description: "Funil de vendas com drag & drop, histórico completo de cada lead e métricas de conversão em tempo real.",
    gradient: "from-accent/20 to-accent/5",
    iconColor: "text-accent",
  },
  {
    icon: Brain,
    title: "Inteligência Artificial",
    description: "Score automático, temperatura do lead, resumos por IA e alertas quando um lead esfria ou para de responder.",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-500",
  },
  {
    icon: Send,
    title: "Campanhas e Follow-up",
    description: "Reengaje leads inativos e envie campanhas segmentadas com materiais personalizados por unidade.",
    gradient: "from-secondary/20 to-secondary/5",
    iconColor: "text-secondary",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function HubFeatures() {
  return (
    <section className="py-16 sm:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">Como funciona</p>
          <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            Tudo que seu buffet precisa em um só lugar
          </h2>
          <p className="mt-3 text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Automatize o atendimento e foque no que importa: fechar mais festas.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group relative p-6 sm:p-8 rounded-2xl bg-card border border-border/40 hover:border-border transition-all duration-500 hover:shadow-card"
            >
              <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
              </div>
              <h3 className="font-display text-base sm:text-lg font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
