import { motion } from "framer-motion";
import { Wallet, CreditCard, CalendarClock, Sparkles } from "lucide-react";
import type { LPTheme } from "@/types/landing-page";

const PROMO_DARK = "#7A1F3D";
const PROMO_GOLD = "#FFD700";

interface DLPPromoSectionProps {
  theme: LPTheme;
  onCtaClick: () => void;
}

const benefits = [
  {
    icon: Wallet,
    badge: "Entrada",
    title: "R$ 500,00",
    suffix: "de entrada",
    description: "Garanta a data da festa do seu filho com apenas R$ 500,00 de entrada. Simples, rápido e sem burocracia.",
  },
  {
    icon: CreditCard,
    badge: "Parcelamento",
    title: "Até 12x",
    suffix: "no boleto",
    description: "Divida o valor da sua festa em até 12 boletos e organize tudo no seu ritmo, sem pesar no orçamento.",
  },
  {
    icon: CalendarClock,
    badge: "Prazo flexível",
    title: "15 dias",
    suffix: "antes da festa",
    description: "Você tem folga para pagar: o último boleto vence até 15 dias antes da data da festa.",
  },
];

export function DLPPromoSection({ theme, onCtaClick }: DLPPromoSectionProps) {
  const primary = theme?.primary_color || "#E91E63";
  const secondary = theme?.secondary_color || "#FFC107";

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-b from-white via-rose-50/30 to-white">
      {/* Decorative blobs */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: primary }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: secondary }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          {/* Promo badge */}
          <div className="flex justify-center mb-4">
            <span
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider shadow-md text-white"
              style={{ background: `linear-gradient(110deg, ${PROMO_DARK}, #A83259)` }}
            >
              💳 Condição especial de pagamento
            </span>
          </div>

          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider mb-5 shadow-sm"
            style={{ backgroundColor: `${PROMO_GOLD}30`, color: PROMO_DARK }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Entrada de R$ 500,00 + parcelamento em até 12x
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4 leading-tight">
            Tudo pensado para a sua festa{" "}
            <span style={{ color: primary }}>acontecer</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Entrada facilitada, parcelamento no boleto e prazo flexível — três motivos para fechar a celebração com tranquilidade.
          </p>
        </motion.div>

        {/* Benefits grid */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-12">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative bg-white rounded-2xl p-7 md:p-8 border border-border/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                {/* Top accent bar */}
                <div
                  className="absolute top-0 left-6 right-6 h-1 rounded-b-full"
                  style={{
                    background: `linear-gradient(90deg, ${primary}, ${secondary})`,
                  }}
                />

                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                  }}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>

                {/* Badge */}
                <span
                  className="inline-block text-[10px] font-bold uppercase tracking-widest mb-3"
                  style={{ color: primary }}
                >
                  {benefit.badge}
                </span>

                {/* Title */}
                <div className="mb-3">
                  <span className="block text-3xl md:text-4xl font-display font-bold text-foreground leading-none">
                    {benefit.title}
                  </span>
                  <span className="block text-base font-medium text-muted-foreground mt-1">
                    {benefit.suffix}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <button
            onClick={onCtaClick}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-semibold text-base shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
            }}
          >
            Quero aproveitar essas condições
            <Sparkles className="w-4 h-4" />
          </button>
          <p className="text-xs text-muted-foreground mt-3">
            Atendimento personalizado pelo WhatsApp · Resposta em minutos
          </p>
        </motion.div>
      </div>
    </section>
  );
}
