import { MessageSquare, BarChart3, Users, Zap, Bot, Send, Brain, Thermometer, TrendingUp, Bell, Sparkles, Target, Clock } from "lucide-react";
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
    description: "Envio automático de PDFs, fotos e vídeos do buffet. Personalizado por unidade.",
    gradient: "from-castle/20 to-castle/5",
    iconColor: "text-castle",
  },
  {
    icon: MessageSquare,
    title: "Central de Atendimento",
    description: "WhatsApp integrado ao CRM. Conversas organizadas com filtros e status.",
    gradient: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
];

const aiFeatures = [
  {
    icon: TrendingUp,
    title: "Score Automático",
    description: "Pontuação 0-100 que atualiza em tempo real conforme o lead interage.",
  },
  {
    icon: Thermometer,
    title: "Temperatura",
    description: "Classificação automática em Quente, Morno ou Frio.",
  },
  {
    icon: Sparkles,
    title: "Resumos por IA",
    description: "Resumo objetivo, próxima ação e mensagem ideal para enviar.",
  },
  {
    icon: Bell,
    title: "Alertas de Risco",
    description: "Notificações quando um lead esfria ou para de responder.",
  },
  {
    icon: Target,
    title: "Prioridades",
    description: "Organiza leads em 'Atender Agora', 'Em Risco' e 'Frios'.",
  },
  {
    icon: Clock,
    title: "Leads do Dia",
    description: "Visão consolidada com tempo em cada etapa do funil.",
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
    <>
      {/* Main Features */}
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 sm:mb-16"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">Funcionalidades</p>
            <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Tudo que seu buffet precisa
            </h2>
            <p className="mt-3 text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Plataforma completa para automatizar atendimento e fechar mais festas.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={item}
                className="group relative p-4 sm:p-8 rounded-2xl bg-card border border-border/40 hover:border-border transition-all duration-500 hover:shadow-card"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-3 sm:mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${feature.iconColor}`} />
                </div>
                <h3 className="font-display text-sm sm:text-lg font-bold text-foreground mb-1 sm:mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-none">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AI Intelligence Section */}
      <section className="py-16 sm:py-24 relative overflow-hidden bg-[hsl(225_35%_10%)]">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,hsl(145_80%_45%/0.12),transparent_70%)]"
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 sm:mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-4 sm:mb-6 border border-emerald-500/20">
              <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Inteligência Artificial
            </div>
            <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              IA que entende{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                seus leads
              </span>
            </h2>
            <p className="mt-3 sm:mt-5 text-sm sm:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
              Scoring inteligente, alertas em tempo real e análise automática de conversas.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5"
          >
            {aiFeatures.map((feature) => (
              <motion.div
                key={feature.title}
                variants={item}
                className="group relative p-4 sm:p-7 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-500 hover:bg-white/[0.06]"
              >
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                </div>
                <h3 className="font-display text-sm sm:text-base font-bold text-white mb-1 sm:mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-white/50 leading-relaxed line-clamp-3 sm:line-clamp-none">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-8 sm:mt-12 text-center"
          >
            <p className="text-xs text-white/30">
              Powered by GPT-4o · Análise em tempo real · Sem configuração manual
            </p>
          </motion.div>
        </div>
      </section>
    </>
  );
}
