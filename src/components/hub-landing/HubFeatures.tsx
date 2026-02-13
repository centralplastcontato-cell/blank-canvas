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

const aiFeatures = [
  {
    icon: TrendingUp,
    title: "Score Automático",
    description: "Cada lead recebe uma pontuação de 0 a 100 que atualiza em tempo real conforme interage com o bot e avança no funil.",
  },
  {
    icon: Thermometer,
    title: "Temperatura do Lead",
    description: "Classificação automática em Quente, Morno ou Frio. Saiba exatamente quem está pronto para fechar.",
  },
  {
    icon: Sparkles,
    title: "Resumos por IA",
    description: "A IA lê as últimas conversas e gera um resumo objetivo, próxima ação recomendada e até a mensagem ideal para enviar.",
  },
  {
    icon: Bell,
    title: "Alertas de Risco",
    description: "Notificações automáticas quando um lead esfria, para de responder ou apresenta padrão de abandono.",
  },
  {
    icon: Target,
    title: "Prioridades Inteligentes",
    description: "Painel que organiza leads em 'Atender Agora', 'Em Risco' e 'Frios' para sua equipe focar no que importa.",
  },
  {
    icon: Clock,
    title: "Leads do Dia",
    description: "Visão consolidada dos leads ativos do dia com tempo em cada etapa do funil e indicador de recência da análise.",
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
    <>
      {/* Main Features */}
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

      {/* AI Intelligence Section */}
      <section className="py-24 sm:py-32 relative overflow-hidden bg-[hsl(225_35%_10%)]">
        {/* Ambient effects */}
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
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-sm font-semibold px-4 py-2 rounded-full mb-6 border border-emerald-500/20">
              <Brain className="h-4 w-4" />
              Inteligência Artificial
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              IA que entende{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                seus leads
              </span>
            </h2>
            <p className="mt-5 text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
              Análise automática de conversas, scoring inteligente e alertas em tempo real.
              Sua equipe foca apenas em quem está pronto para fechar.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {aiFeatures.map((feature) => (
              <motion.div
                key={feature.title}
                variants={item}
                className="group relative p-7 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-500 hover:bg-white/[0.06]"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="font-display text-base font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom highlight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-12 text-center"
          >
            <p className="text-sm text-white/30">
              Powered by GPT-4o · Análise em tempo real · Sem configuração manual
            </p>
          </motion.div>
        </div>
      </section>
    </>
  );
}
