import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, MessageSquare, Users, Zap, ArrowRight, CheckCircle2, Globe, Sparkles, TrendingUp, Shield } from "lucide-react";
import logoPlataforma from "@/assets/logo-plataforma-buffets.png";

const features = [
  {
    icon: MessageSquare,
    title: "WhatsApp Inteligente",
    description: "Bot de atendimento que qualifica leads automaticamente e envia materiais de venda.",
  },
  {
    icon: BarChart3,
    title: "CRM Completo",
    description: "Kanban de leads, histórico de interações e funil de vendas em tempo real.",
  },
  {
    icon: Users,
    title: "Gestão Multi-Unidade",
    description: "Painel Hub para redes de buffets com visão consolidada de todas as unidades.",
  },
  {
    icon: Zap,
    title: "Automações de Follow-up",
    description: "Reengajamento automático de leads que não responderam, sem esforço manual.",
  },
];

const benefits = [
  "Atendimento 24h via WhatsApp automatizado",
  "Aumento médio de 40% na taxa de conversão",
  "Materiais de venda enviados automaticamente",
  "Relatórios e métricas em tempo real",
  "Onboarding guiado e suporte dedicado",
  "Integração completa com suas campanhas",
];

export default function HubLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="font-display text-xl font-bold text-foreground tracking-tight">Celebrei</span>
          </div>
          <Button onClick={() => navigate("/hub-login")} variant="outline" size="sm">
            Acessar Hub
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-accent/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <TrendingUp className="h-4 w-4" />
              Plataforma para buffets infantis
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Transforme leads em{" "}
              <span className="text-primary">festas fechadas</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              CRM + WhatsApp automatizado para buffets infantis. 
              Atenda, qualifique e converta mais clientes sem aumentar sua equipe.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                size="lg" 
                className="text-base px-8 py-6 rounded-xl font-semibold shadow-lg"
                onClick={() => navigate("/comercial-b2b")}
              >
                Quero conhecer
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-base px-8 py-6 rounded-xl"
                onClick={() => navigate("/hub-login")}
              >
                Já sou cliente
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-28 bg-card border-y border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              Tudo que seu buffet precisa
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-xl mx-auto">
              Uma plataforma completa para gerenciar atendimento, vendas e operação.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl border border-border/60 bg-background hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                Por que buffets escolhem a Celebrei?
              </h2>
              <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                Nossos clientes aumentam significativamente suas conversões enquanto reduzem o tempo gasto com atendimento manual.
              </p>
              <div className="mt-8 space-y-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
              <Button 
                className="mt-8 rounded-xl px-6 py-5 font-semibold"
                onClick={() => navigate("/comercial-b2b")}
              >
                Falar com consultor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Stats card */}
            <div className="bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-3xl border border-border/60 p-8 sm:p-10">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <p className="font-display text-4xl font-bold text-primary">40%</p>
                  <p className="text-sm text-muted-foreground mt-1">mais conversões</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-4xl font-bold text-accent">24h</p>
                  <p className="text-sm text-muted-foreground mt-1">atendimento ativo</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-4xl font-bold text-secondary">3x</p>
                  <p className="text-sm text-muted-foreground mt-1">mais agilidade</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-4xl font-bold text-festive">0</p>
                  <p className="text-sm text-muted-foreground mt-1">leads perdidos</p>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Shield className="h-4 w-4" />
                Dados seguros com isolamento por empresa
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-primary/5 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <Globe className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Pronto para transformar seu buffet?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Junte-se aos buffets que já automatizaram seu atendimento e estão fechando mais festas.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              size="lg" 
              className="text-base px-8 py-6 rounded-xl font-semibold shadow-lg"
              onClick={() => navigate("/comercial-b2b")}
            >
              Agendar demonstração
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-semibold text-foreground">Celebrei</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Celebrei. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
