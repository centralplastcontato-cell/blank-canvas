import { MessageCircle, LayoutDashboard, PartyPopper } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    icon: MessageCircle,
    title: "Conecte seu WhatsApp",
    description: "Em minutos seu número está integrado. O bot responde leads automaticamente, envia materiais de venda e agenda visitas — sem você precisar fazer nada.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  {
    number: "02",
    icon: LayoutDashboard,
    title: "Organize no CRM visual",
    description: "Cada lead entra no funil automaticamente. Acompanhe temperatura, histórico de conversa e próximos passos em um kanban intuitivo.",
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
  },
  {
    number: "03",
    icon: PartyPopper,
    title: "Feche mais festas",
    description: "Com follow-up automático e IA identificando o momento certo de abordar, sua equipe foca em fechar — não em perseguir leads que sumiram.",
    color: "text-secondary",
    bg: "bg-secondary/10",
    border: "border-secondary/20",
  },
];

export default function HubHowItWorks() {
  return (
    <section className="py-20 sm:py-28 bg-muted/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 sm:mb-20"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-[0.2em] mb-4">Simples assim</p>
          <h2 className="font-display text-3xl sm:text-5xl lg:text-[3.25rem] font-bold text-foreground leading-tight">
            Do primeiro contato ao contrato
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> em 3 passos</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
          <div className="hidden md:block absolute top-[2.75rem] left-[calc(16.66%+3rem)] right-[calc(16.66%+3rem)] h-px bg-gradient-to-r from-primary/30 via-accent/30 to-secondary/30" />

          {steps.map((step, idx) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: idx * 0.12 }}
              className={`flex flex-col items-center text-center p-8 rounded-2xl border ${step.border} bg-card hover:shadow-card transition-all duration-300`}
            >
              <div className="relative mb-6">
                <div className={`w-20 h-20 sm:w-[5.5rem] sm:h-[5.5rem] rounded-2xl ${step.bg} flex items-center justify-center`}>
                  <step.icon className={`h-9 w-9 sm:h-10 sm:w-10 ${step.color}`} />
                </div>
                <span className="absolute -top-2 -right-2 text-[10px] font-bold bg-background border border-border text-muted-foreground rounded-full w-6 h-6 flex items-center justify-center">
                  {step.number}
                </span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-3">{step.title}</h3>
              <p className="text-base text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
