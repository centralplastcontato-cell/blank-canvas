import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarCheck, CheckCheck, ChevronLeft, FileText, Flame, Mic, Phone, Plus, Video, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Conversa ilustrativa do topo da LP: um lead chama às 22h e o atendimento
 * automático responde na hora, manda os pacotes e agenda a visita. Nomes e
 * dados são fictícios (o print antigo mostrava clientes reais).
 */
type Message =
  | { from: "lead" | "bot"; text: string; time: string }
  | { from: "bot"; file: string; meta: string; time: string };

const MESSAGES: Message[] = [
  { from: "lead", text: "Oi! Queria um orçamento pra festa da Alice 🎈 Ela faz 5 anos dia 14/12", time: "22:41" },
  { from: "bot", text: "Oi, Mariana! Que alegria 🎉 Dia 14/12 ainda temos o sábado à tarde livre. Separei nossos pacotes:", time: "22:41" },
  { from: "bot", file: "Pacotes 2026.pdf", meta: "PDF · 12 páginas", time: "22:41" },
  { from: "bot", text: "Quer conhecer o espaço? Tenho visita sábado às 10h ou às 15h 😊", time: "22:41" },
  { from: "lead", text: "Sábado 10h, perfeito!", time: "22:43" },
];

const HOT_AFTER = 3; // o lead "esquenta" depois de receber os pacotes
const BOOKED_AFTER = MESSAGES.length; // visita marcada na última mensagem

export default function HubChatMock() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(reduceMotion ? MESSAGES.length : 0);
  const [typing, setTyping] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setStep(MESSAGES.length);
      return;
    }
    let timer: number;
    if (step < MESSAGES.length) {
      const next = MESSAGES[step];
      if (next.from === "bot") {
        setTyping(true);
        timer = window.setTimeout(() => {
          setTyping(false);
          setStep((s) => s + 1);
        }, 1100);
      } else {
        timer = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 900 : 1700);
      }
    } else {
      timer = window.setTimeout(() => {
        setStep(0);
        setCycle((c) => c + 1);
      }, 5500);
    }
    return () => window.clearTimeout(timer);
  }, [step, reduceMotion]);

  return (
    <div className="relative mx-auto w-[290px] sm:w-[320px]">
      {/* Telefone */}
      <div className="relative rounded-[2.6rem] bg-[#0F1222] p-2.5 shadow-[0_40px_80px_-20px_rgba(15,18,34,0.45),0_0_0_1px_rgba(15,18,34,0.08)]">
        <div className="absolute left-1/2 top-2.5 z-20 h-6 w-24 -translate-x-1/2 rounded-b-2xl bg-[#0F1222]" />
        <div className="relative flex h-[560px] flex-col overflow-hidden rounded-[2.1rem] bg-[#EFEAE2] sm:h-[600px]">
          {/* Cabeçalho do WhatsApp */}
          <div className="flex items-center gap-2 bg-[#F0F2F5] px-3 pb-2.5 pt-8">
            <ChevronLeft className="h-5 w-5 text-[#54656F]" />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#FFC93C] to-[#F0457A] text-sm font-bold text-white">
              M
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight text-[#111B21]">Mariana</p>
              <p className="text-xs text-[#667781]">online</p>
            </div>
            <Video className="h-5 w-5 text-[#54656F]" />
            <Phone className="ml-3 h-[18px] w-[18px] text-[#54656F]" />
          </div>

          {/* Conversa */}
          <div className="relative flex flex-1 flex-col justify-start gap-1.5 overflow-hidden px-3 py-3">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage: "radial-gradient(rgba(84,101,111,0.18) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }}
            />
            <AnimatePresence initial={false}>
              {MESSAGES.slice(0, step).map((msg, i) => (
                <motion.div
                  key={`${cycle}-${i}`}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`relative flex ${msg.from === "lead" ? "justify-start" : "justify-end"}`}
                >
                  <Bubble msg={msg} showAutoTag={i === 1} />
                </motion.div>
              ))}
              {typing && (
                <motion.div
                  key={`typing-${cycle}-${step}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="relative flex justify-end"
                >
                  <div className="flex gap-1 rounded-xl rounded-tr-sm bg-[#D9FDD3] px-3.5 py-3 shadow-sm">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="h-1.5 w-1.5 rounded-full bg-[#667781]"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Barra de digitação */}
          <div className="flex items-center gap-2 bg-[#F0F2F5] px-3 py-2.5">
            <Plus className="h-5 w-5 text-[#54656F]" />
            <div className="h-9 flex-1 rounded-full bg-white px-4 text-[13px] leading-9 text-[#8696A0]">Mensagem</div>
            <Mic className="h-5 w-5 text-[#54656F]" />
          </div>
        </div>
      </div>

      {/* Etiquetas flutuantes */}
      <FloatingChip
        show={step >= 2}
        className="-left-2 -top-5 sm:-left-[120px] sm:top-[190px]"
        icon={<Zap className="h-4 w-4 text-[#B7791F]" />}
        iconBg="bg-[#FFC93C]/25"
        title="Respondido em 8 s"
        subtitle="22:41, fora do horário"
      />
      <FloatingChip
        show={step >= HOT_AFTER}
        className="hidden sm:left-[226px] sm:top-[440px] sm:flex"
        icon={<Flame className="h-4 w-4 text-[#E2482F]" />}
        iconBg="bg-[#FF8A3D]/20"
        title="Lead quente"
        subtitle="Score 92 · no funil"
      />
      <FloatingChip
        show={step >= BOOKED_AFTER}
        className="-bottom-5 -right-2 sm:-left-[84px] sm:bottom-auto sm:right-auto sm:top-[492px]"
        icon={<CalendarCheck className="h-4 w-4 text-[#0E9F6E]" />}
        iconBg="bg-[#10B981]/15"
        title="Visita agendada"
        subtitle="Sábado, 10h"
      />
    </div>
  );
}

function Bubble({ msg, showAutoTag }: { msg: Message; showAutoTag: boolean }) {
  const isLead = msg.from === "lead";
  return (
    <div
      className={`max-w-[84%] rounded-xl px-2.5 pb-1.5 pt-1.5 text-[13.5px] leading-snug text-[#111B21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
        isLead ? "rounded-tl-sm bg-white" : "rounded-tr-sm bg-[#D9FDD3]"
      }`}
    >
      {showAutoTag && (
        <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-[#D23468]">
          <Zap className="h-3 w-3" /> Atendimento automático
        </p>
      )}
      {"file" in msg ? (
        <div className="flex items-center gap-2.5 rounded-lg bg-[#C8F0C0]/70 px-2.5 py-2">
          <div className="flex h-9 w-8 items-center justify-center rounded bg-[#F0457A] text-white">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{msg.file}</p>
            <p className="text-[11px] text-[#667781]">{msg.meta}</p>
          </div>
        </div>
      ) : (
        <span>{msg.text}</span>
      )}
      <span className="float-right ml-2 mt-1 flex items-center gap-0.5 text-[10.5px] leading-none text-[#667781]">
        {msg.time}
        {!isLead && <CheckCheck className="h-3.5 w-3.5 text-[#53BDEB]" />}
      </span>
    </div>
  );
}

interface FloatingChipProps {
  show: boolean;
  className: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
}

function FloatingChip({ show, className, icon, iconBg, title, subtitle }: FloatingChipProps) {
  return (
    <motion.div
      initial={false}
      animate={show ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "absolute z-30 flex w-max items-center gap-2.5 whitespace-nowrap rounded-2xl border border-[#0F1222]/[0.06] bg-white/95 py-2 pl-2 pr-3.5 shadow-[0_18px_40px_-14px_rgba(15,18,34,0.35)] backdrop-blur",
        className,
      )}
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
      <div className="leading-tight">
        <p className="text-[13px] font-semibold text-[#0F1222]">{title}</p>
        <p className="text-[11px] text-slate-500">{subtitle}</p>
      </div>
    </motion.div>
  );
}
