import { motion } from "framer-motion";
import { CreditCard, PartyPopper, CalendarClock, Check } from "lucide-react";
import { useCountdown } from "@/lib/childrensMonthPromo";

// Arte da campanha (MC3), otimizada para web
export const CHILDRENS_MONTH_IMAGE = "/images/promo/mes-das-criancas-mc3.webp";

const PINK = "#E91E63";
const GOLD = "#FFC107";

/** Faixa fixa no topo da LP. */
export function ChildrensMonthBar({ onCtaClick }: { onCtaClick: () => void }) {
  return (
    <div
      className="text-white"
      style={{ background: `linear-gradient(100deg, ${PINK} 0%, #C2185B 45%, #F57C00 100%)` }}
      role="region"
      aria-label="Promoção Mês das Crianças"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-center gap-3">
        <p className="text-[12px] sm:text-sm font-semibold leading-snug min-w-0">
          <span className="md:hidden">🎉 Mês das Crianças: +10 amiguinhos grátis + até 10x sem juros · até 17/10</span>
          <span className="hidden md:inline">
            🎉 Mês das Crianças: +10 amiguinhos grátis + até 10x sem juros · festas em 2026 · até 17/10
          </span>
        </p>
        <button
          onClick={onCtaClick}
          className="flex-shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] sm:text-sm font-bold shadow-md hover:scale-105 transition-transform"
          style={{ color: PINK }}
        >
          Consultar datas →
        </button>
      </div>
    </div>
  );
}

/** Selo logo abaixo do título do hero. */
export function ChildrensMonthBadge() {
  return (
    <div className="flex justify-center">
      <span
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-lg ring-1 ring-white/30"
        style={{ background: `linear-gradient(100deg, ${PINK}, #F57C00)` }}
      >
        <PartyPopper className="w-4 h-4 flex-shrink-0" />
        +10 amiguinhos grátis + até 10x sem juros — só até 17/10
      </span>
    </div>
  );
}

const RULES = [
  "Válida para festas realizadas em 2026",
  "Para os 10 primeiros contratos fechados ou até 17/10 — o que acontecer primeiro",
  "Pacotes Castelo, Super e Premium, a partir de 50 convidados",
  "Não acumulativa com outras negociações",
];

function Countdown() {
  const { days, hours, minutes, seconds } = useCountdown();
  const cells = [
    { v: days, l: "dias" },
    { v: hours, l: "horas" },
    { v: minutes, l: "min" },
    { v: seconds, l: "seg" },
  ];
  return (
    <div className="flex flex-col items-center sm:items-start gap-2">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/85">
        <CalendarClock className="w-4 h-4" /> Termina em
      </span>
      <div className="flex gap-2">
        {cells.map((c) => (
          <div key={c.l} className="min-w-[58px] rounded-xl bg-white/15 ring-1 ring-white/20 px-2 py-2 text-center">
            <div className="text-2xl font-bold tabular-nums leading-none">{String(c.v).padStart(2, "0")}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-white/75">{c.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Seção "Mês das Crianças" (fica antes das condições de pagamento). */
export function ChildrensMonthSection({ onCtaClick }: { onCtaClick: () => void }) {
  return (
    <section
      id="mes-das-criancas"
      className="scroll-mt-28 relative overflow-hidden py-16 md:py-24 text-white"
      style={{ background: "linear-gradient(160deg, #4A148C 0%, #880E4F 55%, #BF360C 100%)" }}
    >
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ backgroundColor: GOLD }} />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ backgroundColor: PINK }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="inline-block rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">
            Promoção por tempo limitado
          </span>
          <h2 className="mt-4 font-['Nunito'] text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
            Mês das Crianças no <span className="text-yellow-300">Castelo da Diversão</span>
          </h2>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <button
            type="button"
            onClick={onCtaClick}
            className="group block w-full max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white/20 focus:outline-none focus-visible:ring-yellow-300"
            aria-label="Peça seu orçamento"
          >
            <img
              src={CHILDRENS_MONTH_IMAGE}
              alt="Mês das Crianças no Castelo da Diversão: +10 amiguinhos grátis e até 10x sem juros"
              width={800}
              height={800}
              loading="lazy"
              decoding="async"
              className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </button>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white text-[#1a1030] p-5 shadow-xl">
                <CreditCard className="w-7 h-7" style={{ color: PINK }} />
                <p className="mt-3 text-2xl font-extrabold">Até 10x sem juros</p>
                <p className="mt-1 text-sm text-[#1a1030]/70">no cartão</p>
              </div>
              <div className="rounded-2xl bg-white text-[#1a1030] p-5 shadow-xl">
                <PartyPopper className="w-7 h-7" style={{ color: PINK }} />
                <p className="mt-3 text-2xl font-extrabold">+10 amiguinhos grátis</p>
                <p className="mt-1 text-sm text-[#1a1030]/70">no pacote, para crianças de até 8 anos</p>
              </div>
            </div>

            <ul className="space-y-2">
              {RULES.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm sm:text-base text-white/90">
                  <Check className="w-5 h-5 flex-shrink-0 text-yellow-300 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>

            <p className="rounded-xl bg-black/20 px-4 py-3 text-sm text-white/85 leading-relaxed">
              Condição exclusiva do Mês das Crianças: até 10x sem juros no cartão. No boleto, o número de parcelas
              depende da data da festa (última parcela até 15 dias antes do evento). Não acumulativa com outras
              negociações.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              <Countdown />
              <button
                onClick={onCtaClick}
                className="w-full sm:w-auto rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 px-8 py-4 text-base font-extrabold text-[#1a1030] shadow-lg hover:scale-[1.03] transition-transform"
              >
                Garantir minha data
              </button>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-white/60">
          Número de parcelas conforme a data da festa. Quitação total até 15 dias antes do evento. Consulte as condições.
        </p>
      </div>
    </section>
  );
}
