import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { CelebreiMark } from "./CelebreiLogo";
import { GRADIENT_TEXT } from "./lp-theme";
import { SectionHeading } from "./LpSection";

const WITHOUT = [
  "O lead pede orçamento às 22h e só recebe resposta no dia seguinte, quando já fechou com outro buffet",
  "Conversas espalhadas no celular, em planilhas e no caderno",
  "Ninguém lembra de retomar quem parou de responder",
];

const WITH = [
  "Resposta em segundos, com pacotes, fotos e vídeos do buffet, 24 horas por dia",
  "Todo lead entra no funil com o histórico completo da conversa",
  "Follow-up automático e alerta quando uma negociação esfria",
];

export default function HubBeforeAfter() {
  return (
    <section className="relative bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="O problema"
          title={
            <>
              Cada minuto sem resposta é <span className={GRADIENT_TEXT}>uma festa a menos</span>
            </>
          }
          description="Quem pede orçamento para festa infantil chama vários buffets ao mesmo tempo. Fecha quem responde primeiro, e bem."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55 }}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Hoje, sem sistema</p>
            <h3 className="mt-2 font-grotesque text-2xl font-bold tracking-tight text-slate-700">Atendimento no improviso</h3>
            <ul className="mt-5 space-y-3">
              {WITHOUT.map((item) => (
                <li key={item} className="flex gap-3 text-[15.5px] leading-relaxed text-slate-500">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200">
                    <X className="h-3.5 w-3.5 text-slate-500" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="relative overflow-hidden rounded-3xl bg-[#0F1222] p-7 text-white shadow-[0_30px_60px_-25px_rgba(15,18,34,0.6)] sm:p-8"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#F0457A]/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-[#FF8A3D]/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <CelebreiMark className="h-6 w-6" />
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/60">Com a Celebrei</p>
              </div>
              <h3 className="mt-2 font-grotesque text-2xl font-bold tracking-tight">Atendimento que não dorme</h3>
              <ul className="mt-5 space-y-3">
                {WITH.map((item) => (
                  <li key={item} className="flex gap-3 text-[15.5px] leading-relaxed text-white/85">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF8A3D] to-[#F0457A]">
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
