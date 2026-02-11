import { MessageSquare, User, Calendar, Users, HelpCircle, FileText, Images, Video, Clock, RefreshCw, Bot, Forward, ArrowDown, CheckCircle2, Globe, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface JourneyStep {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  branches?: { label: string; icon: React.ReactNode; color: string; description: string }[];
}

const qualificationSteps: JourneyStep[] = [
  {
    id: "nome",
    icon: <User className="w-4 h-4" />,
    label: "Nome",
    description: "Bot pergunta o nome do lead",
    color: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  },
  {
    id: "tipo",
    icon: <HelpCircle className="w-4 h-4" />,
    label: "Tipo",
    description: "Já sou cliente / Quero orçamento / Trabalhar aqui",
    color: "bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-800",
    branches: [
      { label: "Já sou cliente", icon: <Forward className="w-3 h-3" />, color: "text-cyan-600", description: "Transfere para equipe" },
      { label: "Trabalhar aqui", icon: <User className="w-3 h-3" />, color: "text-teal-600", description: "Envia para aba RH" },
      { label: "Quero orçamento", icon: <CheckCircle2 className="w-3 h-3" />, color: "text-green-600", description: "Continua qualificação ↓" },
    ],
  },
  {
    id: "mes",
    icon: <Calendar className="w-4 h-4" />,
    label: "Mês",
    description: "Mês desejado para a festa",
    color: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  },
  {
    id: "dia",
    icon: <Calendar className="w-4 h-4" />,
    label: "Dia da Semana",
    description: "Preferência de dia (seg-qui, sex, sáb, dom)",
    color: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
  },
  {
    id: "convidados",
    icon: <Users className="w-4 h-4" />,
    label: "Convidados",
    description: "Quantidade de convidados esperada",
    color: "bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-800",
  },
  {
    id: "conclusao",
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "Conclusão",
    description: "Resumo dos dados + pergunta de próximo passo",
    color: "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
  },
];

const lpEntrySteps: JourneyStep[] = [
  {
    id: "lp-visit",
    icon: <Globe className="w-4 h-4" />,
    label: "Acessa a LP",
    description: "Lead entra pela Landing Page e interage com o chatbot",
    color: "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800",
  },
  {
    id: "lp-chatbot",
    icon: <MessageSquare className="w-4 h-4" />,
    label: "Chatbot da LP",
    description: "Coleta nome, WhatsApp e interesse dentro da LP",
    color: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
  },
  {
    id: "lp-lead-criado",
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "Lead Criado no CRM",
    description: "Lead registrado automaticamente com dados da LP",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  {
    id: "lp-welcome",
    icon: <MessageSquare className="w-4 h-4" />,
    label: "Boas-vindas (WhatsApp)",
    description: "Bot envia mensagem inicial via WhatsApp com dados da LP",
    color: "bg-primary/10 text-primary border-primary/30",
  },
];

const waEntrySteps: JourneyStep[] = [
  {
    id: "wa-incoming",
    icon: <Phone className="w-4 h-4" />,
    label: "Mensagem Recebida",
    description: "Lead manda mensagem diretamente para o WhatsApp",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  {
    id: "wa-welcome",
    icon: <MessageSquare className="w-4 h-4" />,
    label: "Boas-vindas",
    description: "Mensagem inicial enviada ao novo lead",
    color: "bg-primary/10 text-primary border-primary/30",
  },
];

const postQualificationSteps = [
  { label: "📸 Fotos", description: "Galeria da unidade", icon: <Images className="w-3.5 h-3.5" /> },
  { label: "🎥 Vídeo", description: "Apresentação", icon: <Video className="w-3.5 h-3.5" /> },
  { label: "📋 PDF", description: "Pacote de preços", icon: <FileText className="w-3.5 h-3.5" /> },
];

const nextStepOptions = [
  { label: "1 - Agendar visita", color: "text-green-600", description: "Equipe agenda visita" },
  { label: "2 - Tirar dúvidas", color: "text-blue-600", description: "Transfere para equipe" },
  { label: "3 - Analisar com calma", color: "text-amber-600", description: "Follow-ups automáticos" },
];

function StepList({ steps, startIndex = 1 }: { steps: JourneyStep[]; startIndex?: number }) {
  return (
    <div className="space-y-1">
      {steps.map((step, index) => (
        <div key={step.id}>
          <div className={cn("flex items-center gap-3 p-3 rounded-lg border transition-colors", step.color)}>
            <div className="p-1.5 rounded-md bg-background/60 shrink-0">{step.icon}</div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{step.label}</p>
              <p className="text-xs opacity-75">{step.description}</p>
            </div>
            <span className="text-xs font-mono opacity-50 shrink-0">#{startIndex + index}</span>
          </div>

          {step.branches && (
            <div className="ml-6 pl-4 border-l-2 border-dashed border-muted-foreground/20 py-2 space-y-1.5">
              {step.branches.map((branch, bi) => (
                <div key={bi} className="flex items-center gap-2 text-xs">
                  <div className={cn("shrink-0", branch.color)}>{branch.icon}</div>
                  <span className={cn("font-medium", branch.color)}>{branch.label}</span>
                  <span className="text-muted-foreground">→ {branch.description}</span>
                </div>
              ))}
            </div>
          )}

          {index < steps.length - 1 && (
            <div className="flex justify-center py-0.5">
              <ArrowDown className="w-3.5 h-3.5 text-muted-foreground/40" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PostQualificationSection() {
  return (
    <>
      <div className="rounded-lg border border-dashed border-primary/30 p-3 bg-primary/5">
        <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1.5">📦 Envio Automático de Materiais</p>
        <div className="grid grid-cols-3 gap-2">
          {postQualificationSteps.map((mat, i) => (
            <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-md bg-background/60 text-center">
              {mat.icon}
              <span className="text-xs font-medium">{mat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 dark:border-amber-800 p-3 bg-amber-50/50 dark:bg-amber-950/20">
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">❓ Próximos Passos</p>
        <div className="space-y-1.5">
          {nextStepOptions.map((opt, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className={cn("font-medium", opt.color)}>{opt.label}</span>
              <span className="text-muted-foreground">{opt.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-muted">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Lembrete de próximos passos</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-muted">
          <Bot className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Follow-up inativo no bot</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-muted">
          <RefreshCw className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Follow-up automático (1ª e 2ª)</span>
        </div>
      </div>
    </>
  );
}

export function BotJourneyDiagram() {
  return (
    <Tabs defaultValue="whatsapp" className="space-y-4">
      <TabsList className="w-full">
        <TabsTrigger value="whatsapp" className="flex-1 gap-1.5">
          <Phone className="w-3.5 h-3.5" /> Via WhatsApp
        </TabsTrigger>
        <TabsTrigger value="lp" className="flex-1 gap-1.5">
          <Globe className="w-3.5 h-3.5" /> Via Landing Page
        </TabsTrigger>
      </TabsList>

      <TabsContent value="whatsapp" className="space-y-6">
        <StepList steps={waEntrySteps} startIndex={1} />
        <div className="flex justify-center py-0.5">
          <ArrowDown className="w-3.5 h-3.5 text-muted-foreground/40" />
        </div>
        <StepList steps={qualificationSteps} startIndex={waEntrySteps.length + 1} />
        <PostQualificationSection />
      </TabsContent>

      <TabsContent value="lp" className="space-y-6">
        <StepList steps={lpEntrySteps} startIndex={1} />
        <div className="flex justify-center py-0.5">
          <ArrowDown className="w-3.5 h-3.5 text-muted-foreground/40" />
        </div>
        <StepList steps={qualificationSteps} startIndex={lpEntrySteps.length + 1} />
        <PostQualificationSection />
      </TabsContent>
    </Tabs>
  );
}
