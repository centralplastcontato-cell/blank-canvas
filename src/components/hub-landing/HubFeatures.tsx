import { MessageSquare, BarChart3, Users, Zap, Bot, Send } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Bot,
    title: "Bot de WhatsApp",
    description: "Atende, qualifica e coleta dados do lead automaticamente. Envia materiais de venda sem intervenção.",
    gradient: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
  {
    icon: BarChart3,
    title: "CRM Kanban",
    description: "Funil visual de vendas com drag & drop, histórico completo e métricas de conversão em tempo real.",
    gradient: "from-accent/20 to-accent/5",
    iconColor: "text-accent",
  },
  {
    icon: Users,
    title: "Gestão Multi-Unidade",
    description: "Painel Hub centralizado para redes de buffets. Visão consolidada, ranking e controle total.",
    gradient: "from-secondary/20 to-secondary/5",
    iconColor: "text-secondary",
  },
  {
    icon: Zap,
    title: "Follow-up Automático",
    description: "Reengaja leads que pararam de responder. Até 2 tentativas automáticas configuráveis.",
    gradient: "from-festive/20 to-festive/5",
    iconColor: "text-festive",
  },
  {
    icon: Send,
    title: "Materiais de Venda",
    description: "Envio automático de PDFs, fotos e vídeos do buffet. Personalizado por unidade e faixa de convidados.",
    gradient: "from-castle/20 to-castle/5",
    iconColor: "text-castle",
  },
  {
    icon: MessageSquare,
    title: "Central de Atendimento",
    description: "WhatsApp integrado ao CRM. Conversas organizadas com filtros, favoritos e status de atendimento.",
    gradient: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
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
          className="text-center mb-20"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-4">Funcionalidades</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            Tudo que seu buffet precisa
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Uma plataforma completa para automatizar atendimento, organizar vendas e fechar mais festas.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group relative p-8 rounded-2xl bg-card border border-border/40 hover:border-border transition-all duration-500 hover:shadow-card"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
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
