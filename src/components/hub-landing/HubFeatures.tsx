import { MessageSquare, BarChart3, Users, Zap, Bot, Send } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Bot,
    title: "Bot de WhatsApp",
    description: "Atende, qualifica e coleta dados do lead automaticamente. Envia materiais de venda sem intervenção.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: BarChart3,
    title: "CRM Kanban",
    description: "Funil visual de vendas com drag & drop, histórico completo e métricas de conversão em tempo real.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Users,
    title: "Gestão Multi-Unidade",
    description: "Painel Hub centralizado para redes de buffets. Visão consolidada, ranking e controle total.",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: Zap,
    title: "Follow-up Automático",
    description: "Reengaja leads que pararam de responder. Até 2 tentativas automáticas configuráveis.",
    color: "bg-festive/10 text-festive",
  },
  {
    icon: Send,
    title: "Materiais de Venda",
    description: "Envio automático de PDFs, fotos e vídeos do buffet. Personalizado por unidade e faixa de convidados.",
    color: "bg-castle/10 text-castle",
  },
  {
    icon: MessageSquare,
    title: "Central de Atendimento",
    description: "WhatsApp integrado ao CRM. Conversas organizadas com filtros, favoritos e status de atendimento.",
    color: "bg-primary/10 text-primary",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function HubFeatures() {
  return (
    <section className="py-20 sm:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-background pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Funcionalidades</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Tudo que seu buffet precisa,
            <br className="hidden sm:block" />
            <span className="text-primary"> em uma só plataforma</span>
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group relative p-6 rounded-2xl bg-card border border-border/60 hover:border-primary/30 hover:shadow-card transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
