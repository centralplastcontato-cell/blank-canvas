import { motion } from "framer-motion";
import {
  Bot,
  Brain,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileSignature,
  FileText,
  Flame,
  KanbanSquare,
  Megaphone,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GRADIENT_TEXT } from "./lp-theme";
import { SectionHeading } from "./LpSection";

/**
 * Recursos principais da plataforma. A lista completa (59 funcionalidades para
 * o buffet, fora as do Portal Hub) está em src/lib/generateFeaturesPDF.ts.
 * Nomes e números nas mini-telas são ilustrativos.
 */
const MORE = [
  "Landing page do buffet com chatbot",
  "Várias unidades num só painel",
  "Editor visual de fluxos do bot",
  "Confirmação automática de visita",
  "Pré-reservas com prazo",
  "Checklist de cada festa",
  "Lista de presença digital",
  "Cardápio digital",
  "Escala de freelancers",
  "Avaliação pós-festa",
  "Resumo diário com IA",
  "Tempo de resposta por vendedor",
  "Exportação para planilha",
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function HubFeatures() {
  return (
    <section id="recursos" className="relative scroll-mt-16 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Recursos"
          title={
            <>
              Tudo que seu buffet precisa, <span className={GRADIENT_TEXT}>num lugar só</span>
            </>
          }
          description="Do primeiro contato no WhatsApp até a avaliação depois da festa. Sem planilha, sem caderno, sem lead esquecido."
        />

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          <Card
            className="lg:col-span-2"
            icon={Bot}
            title="WhatsApp com atendimento automático"
            description="O bot responde na hora, faz as perguntas certas, envia fotos, vídeos e PDFs do buffet e agenda a visita. Sua equipe assume a conversa quando quiser."
          >
            <FlowVisual />
          </Card>

          <Card
            icon={KanbanSquare}
            title="Funil de vendas visual"
            description="Arraste os leads entre as etapas e veja o histórico completo de cada um."
          >
            <KanbanVisual />
          </Card>

          <Card
            icon={Brain}
            title="IA que aponta quem vai fechar"
            description="Score de cada lead, resumo diário e alerta de negociações paradas."
          >
            <ScoreVisual />
          </Card>

          <Card
            icon={CalendarDays}
            title="Agenda de visitas e festas"
            description="Calendário por unidade, pré-reservas com prazo e checklist de cada evento."
          >
            <CalendarVisual />
          </Card>

          <Card
            icon={FileSignature}
            title="Contratos e financeiro"
            description="Contrato gerado com os dados da festa, aceite digital pelo link e controle das parcelas."
          >
            <ContractVisual />
          </Card>

          <Card
            icon={Megaphone}
            title="Campanhas e reativação"
            description="Reative leads de 1, 2 e 3 meses atrás e dispare campanhas segmentadas com texto escrito pela IA."
          >
            <CampaignVisual />
          </Card>

          <Card
            className="lg:col-span-2"
            icon={ClipboardCheck}
            title="A operação da festa, no celular"
            description="Painel ao vivo no dia do evento, lista de presença, equipe escalada, cardápio escolhido pelo cliente e avaliação depois da festa."
          >
            <OperationVisual />
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6 }}
          className="mt-10 rounded-3xl border border-dashed border-[#0F1222]/10 bg-[#FFF9F3] p-6 text-center sm:p-8"
        >
          <p className="font-grotesque text-lg font-bold text-[#0F1222]">
            E mais de <span className={GRADIENT_TEXT}>50 funcionalidades</span> pensadas para buffet infantil
          </p>
          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {MORE.map((label) => (
              <li
                key={label}
                className="rounded-full border border-[#0F1222]/[0.07] bg-white px-3.5 py-1.5 text-sm text-slate-600"
              >
                {label}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

interface CardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}

function Card({ icon: Icon, title, description, className, children }: CardProps) {
  return (
    <motion.div
      variants={item}
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl border border-[#0F1222]/[0.07] bg-[#FCFAF8] transition-shadow duration-300 hover:shadow-[0_24px_50px_-30px_rgba(15,18,34,0.35)]",
        className,
      )}
    >
      <div className="p-6 pb-0 sm:p-7 sm:pb-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#0F1222]/[0.06]">
          <Icon className="h-5 w-5 text-[#E0457A]" />
        </div>
        <h3 className="mt-4 font-grotesque text-xl font-bold tracking-tight text-[#0F1222]">{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{description}</p>
      </div>
      <div className="mt-auto px-6 pb-6 pt-6 sm:px-7 sm:pb-7">{children}</div>
    </motion.div>
  );
}

const panel = "rounded-2xl border border-[#0F1222]/[0.06] bg-white p-3 shadow-[0_10px_30px_-20px_rgba(15,18,34,0.35)]";

function FlowVisual() {
  const nodes = [
    { icon: MessageCircle, label: "Chega a mensagem", tone: "bg-[#10B981]/[0.12] text-[#0E9F6E]" },
    { icon: Bot, label: "Pergunta a data da festa", tone: "bg-[#FFC93C]/25 text-[#B7791F]" },
    { icon: FileText, label: "Envia os pacotes", tone: "bg-[#F0457A]/[0.12] text-[#D23468]" },
    { icon: CalendarDays, label: "Agenda a visita", tone: "bg-[#8E3FD9]/[0.12] text-[#7B33C4]" },
  ];
  return (
    <div className={cn(panel, "p-4")}>
      <div className="grid gap-2 sm:grid-cols-4 sm:gap-3">
        {nodes.map((n, i) => (
          <div
            key={n.label}
            className="relative flex items-center gap-3 rounded-xl border border-[#0F1222]/[0.06] bg-[#FCFAF8] px-3 py-2.5 sm:flex-col sm:items-start sm:gap-3 sm:p-3.5"
          >
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9", n.tone)}>
              <n.icon className="h-4 w-4" />
            </span>
            <span className="text-[13px] font-medium leading-snug text-slate-700">
              <span className="mr-1 text-slate-400">{i + 1}.</span>
              {n.label}
            </span>
            {i < nodes.length - 1 && (
              <ChevronRight className="absolute -right-[13px] top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-[#0F1222]/[0.06] sm:block" />
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[12px] text-slate-500">
        <Sparkles className="h-3.5 w-3.5 text-[#F0457A]" />
        Tudo em segundos, inclusive de madrugada e no fim de semana
      </p>
    </div>
  );
}

function KanbanVisual() {
  const cols = [
    { title: "Novos", color: "bg-[#38BDF8]", cards: [["Mariana", "14/12"], ["Paulo", "21/12"]] },
    { title: "Visita", color: "bg-[#FFC93C]", cards: [["Carla", "07/12"]] },
    { title: "Fechado", color: "bg-[#10B981]", cards: [["Bruna", "30/11"]] },
  ];
  return (
    <div className={cn(panel, "grid grid-cols-3 gap-2")}>
      {cols.map((c) => (
        <div key={c.title} className="rounded-xl bg-[#FCFAF8] p-2">
          <div className="mb-2 flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", c.color)} />
            <span className="text-[11px] font-semibold text-slate-500">{c.title}</span>
          </div>
          <div className="space-y-1.5">
            {c.cards.map(([name, date]) => (
              <div key={name} className="rounded-lg border border-[#0F1222]/[0.06] bg-white px-2 py-1.5">
                <p className="truncate text-[11px] font-semibold text-slate-700">{name}</p>
                <p className="text-[10px] text-slate-400">Festa {date}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreVisual() {
  const leads = [
    { name: "Mariana", score: 92, hot: true },
    { name: "Carla", score: 74, hot: false },
    { name: "Paulo", score: 41, hot: false },
  ];
  return (
    <div className={cn(panel, "space-y-2.5")}>
      {leads.map((l) => (
        <div key={l.name} className="flex items-center gap-2.5">
          <span className="w-16 text-[12px] font-medium text-slate-700">{l.name}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-[#FFC93C] via-[#FF8A3D] to-[#F0457A]" style={{ width: `${l.score}%` }} />
          </div>
          <span className="flex w-10 items-center justify-end gap-0.5 text-[12px] font-semibold text-slate-700">
            {l.hot && <Flame className="h-3 w-3 text-[#E2482F]" />}
            {l.score}
          </span>
        </div>
      ))}
      <p className="flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11.5px] text-slate-500">
        <Sparkles className="h-3 w-3 text-[#8E3FD9]" /> Paulo está há 5 dias sem resposta
      </p>
    </div>
  );
}

function CalendarVisual() {
  const marks: Record<number, string> = { 3: "bg-[#F0457A]", 7: "bg-[#FFC93C]", 13: "bg-[#8E3FD9]", 14: "bg-[#F0457A]", 20: "bg-[#38BDF8]", 21: "bg-[#FFC93C]", 27: "bg-[#F0457A]", 28: "bg-[#8E3FD9]" };
  return (
    <div className={panel}>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[12px] font-semibold text-slate-700">Dezembro</span>
        <span className="text-[11px] text-slate-400">8 festas</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
          <div
            key={d}
            className={cn(
              "relative flex aspect-square items-center justify-center rounded-md text-[10.5px]",
              marks[d] ? "bg-[#FFF3EA] font-semibold text-slate-700" : "text-slate-400",
            )}
          >
            {d}
            {marks[d] && <span className={cn("absolute bottom-0.5 h-1 w-1 rounded-full", marks[d])} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ContractVisual() {
  return (
    <div className={cn(panel, "space-y-3")}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-8 items-center justify-center rounded-md bg-[#0F1222] text-white">
          <FileSignature className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-slate-700">Contrato · Festa da Alice</p>
          <p className="text-[11px] text-slate-400">Enviado pelo WhatsApp</p>
        </div>
        <span className="rounded-full bg-[#10B981]/[0.12] px-2 py-0.5 text-[10.5px] font-semibold text-[#0E9F6E]">Assinado</span>
      </div>
      <div>
        <div className="mb-1.5 flex justify-between text-[11px] text-slate-500">
          <span>Parcelas pagas</span>
          <span className="font-semibold text-slate-700">2 de 3</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <span className="h-2 rounded-full bg-[#10B981]" />
          <span className="h-2 rounded-full bg-[#10B981]" />
          <span className="h-2 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function CampaignVisual() {
  return (
    <div className={cn(panel, "space-y-2.5")}>
      <div className="flex flex-wrap gap-1.5">
        {["Sem resposta há 1 mês", "Festas em dezembro"].map((tag) => (
          <span key={tag} className="rounded-full bg-[#8E3FD9]/10 px-2 py-0.5 text-[10.5px] font-medium text-[#7B33C4]">
            {tag}
          </span>
        ))}
      </div>
      <div className="rounded-xl rounded-tr-sm bg-[#D9FDD3] px-3 py-2 text-[12px] leading-snug text-[#111B21]">
        Oi, Carla! Ainda dá tempo de garantir sua data em dezembro 🎉 Quer que eu reserve um horário de visita?
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[#8E3FD9]" /> Texto sugerido pela IA
        </span>
        <span className="flex items-center gap-1 font-semibold text-[#D23468]">
          <Send className="h-3 w-3" /> Enviar
        </span>
      </div>
    </div>
  );
}

function OperationVisual() {
  const items = [
    { label: "Convidados presentes", value: "62 / 70", bar: 88 },
    { label: "Equipe confirmada", value: "8 / 8", bar: 100 },
    { label: "Cardápio escolhido", value: "Kids premium", bar: null },
  ];
  return (
    <div className={cn(panel, "grid gap-3 sm:grid-cols-3")}>
      {items.map((it) => (
        <div key={it.label} className="rounded-xl bg-[#FCFAF8] p-3">
          <p className="text-[11px] text-slate-500">{it.label}</p>
          <p className="mt-1 font-grotesque text-lg font-bold text-[#0F1222]">{it.value}</p>
          {it.bar !== null ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#F0457A]" style={{ width: `${it.bar}%` }} />
            </div>
          ) : (
            <p className="mt-1.5 text-[11px] font-medium text-[#0E9F6E]">Confirmado pelo cliente</p>
          )}
        </div>
      ))}
    </div>
  );
}
