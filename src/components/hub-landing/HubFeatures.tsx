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
    <section className="py-24 sm:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 sm:mb-20"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-[0.2em] mb-4">Como funciona</p>
          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Tudo que seu buffet precisa em um só lugar
          </h2>
          <p className="mt-5 text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto">
            Automatize o atendimento e foque no que importa: fechar mais festas.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group relative p-8 sm:p-10 rounded-2xl bg-card border border-border/40 hover:border-border transition-all duration-500 hover:shadow-card"
            >
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`h-7 w-7 sm:h-8 sm:w-8 ${feature.iconColor}`} />
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-3">{feature.title}</h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
